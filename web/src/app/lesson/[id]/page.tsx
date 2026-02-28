'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLessonStore } from '@/stores/lessonStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';
import { usePushToTalk } from '@/hooks/usePushToTalk';
import { getSession } from '@/lib/api';
import TranscriptPanel from '@/components/lesson/TranscriptPanel';
import PushToTalkButton from '@/components/lesson/PushToTalkButton';
import StatusIndicator from '@/components/lesson/StatusIndicator';
import LessonControls from '@/components/lesson/LessonControls';

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const status = useLessonStore((s) => s.status);
  const mode = useLessonStore((s) => s.mode);
  const elapsedTime = useLessonStore((s) => s.elapsedTime);
  const processingStatus = useLessonStore((s) => s.processingStatus);
  const className = useLessonStore((s) => s.className);
  const error = useLessonStore((s) => s.error);
  const startLesson = useLessonStore((s) => s.startLesson);
  const incrementTime = useLessonStore((s) => s.incrementTime);
  const setError = useLessonStore((s) => s.setError);
  const storeSessionId = useLessonStore((s) => s.sessionId);

  const [initialized, setInitialized] = useState(false);

  // Audio playback
  const { isPlaying, enqueue: enqueueAudio, clearQueue, close: closePlayback } = useAudioPlayback();
  const isPlayingRef = useRef(false);

  // Keep ref in sync for use in audio callback
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // WebSocket
  const {
    isConnected,
    connect,
    disconnect,
    sendAudio,
    sendJSON,
  } = useWebSocket({
    sessionId,
    onAudioReceived: enqueueAudio,
  });

  // Audio recorder (for real-time mode)
  // During TTS playback: detect loud speech (barge-in) → stop TTS and resume sending
  // During silence: send audio normally
  const BARGE_IN_THRESHOLD = 0.08; // RMS threshold to detect real speech over echo

  const { isRecording, startRecording, stopRecording } = useAudioRecorder({
    onAudioData: (data) => {
      if (status !== 'active' || mode !== 'realtime') return;

      if (isPlayingRef.current) {
        // Check audio energy — if user is speaking, stop TTS (barge-in)
        const int16 = new Int16Array(data);
        let sumSq = 0;
        for (let i = 0; i < int16.length; i++) {
          const sample = int16[i] / 32768;
          sumSq += sample * sample;
        }
        const rms = Math.sqrt(sumSq / int16.length);

        if (rms > BARGE_IN_THRESHOLD) {
          // User is speaking — interrupt TTS
          clearQueue();
          sendAudio(data);
        }
        // Otherwise ignore (echo from TTS speaker)
      } else {
        sendAudio(data);
      }
    },
  });

  // Push-to-talk (for PTT mode)
  const ptt = usePushToTalk({
    sendAudio,
    sendJSON,
  });

  // Timer
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === 'active') {
      timerRef.current = setInterval(() => {
        incrementTime();
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [status, incrementTime]);

  // Initialize session
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // If we don't already have this session in the store, load it
        if (storeSessionId !== sessionId) {
          const session = await getSession(sessionId);
          if (cancelled) return;

          useLessonStore.setState({
            sessionId: session.id,
            className: session.class_name,
            subject: session.subject,
            mode: session.mode,
            status: session.status === 'active' ? 'active' : 'idle',
          });
        }

        setInitialized(true);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load session');
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [sessionId, storeSessionId, setError]);

  // Connect WebSocket and start when initialized
  useEffect(() => {
    if (!initialized) return;

    connect();
    startLesson();

    return () => {
      disconnect();
      closePlayback();
    };
    // We only want this to run once when initialized
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

  // Start/stop real-time recording based on mode and status
  useEffect(() => {
    if (status === 'active' && mode === 'realtime' && isConnected && initialized) {
      startRecording();
    } else if (mode !== 'realtime' || status !== 'active') {
      if (isRecording) {
        stopRecording();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, mode, isConnected, initialized]);

  const handleModeChange = useCallback(
    (newMode: 'realtime' | 'push-to-talk') => {
      if (newMode === 'realtime') {
        startRecording();
      } else {
        stopRecording();
      }
    },
    [startRecording, stopRecording]
  );

  // Format elapsed time
  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Status badge color
  const statusBadge = () => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700';
      case 'paused':
        return 'bg-amber-100 text-amber-700';
      case 'completed':
        return 'bg-slate-100 text-slate-700';
      default:
        return 'bg-indigo-100 text-indigo-700';
    }
  };

  if (error && !initialized) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <span className="text-5xl block">😕</span>
          <p className="text-lg text-pink-500 font-bold font-nunito">{error}</p>
          <button
            onClick={() => router.push('/setup')}
            className="text-indigo-500 underline font-nunito"
          >
            Back to Setup
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen h-[100dvh] flex flex-col bg-gradient-to-b from-slate-50 to-indigo-50/30">
      {/* Top Bar */}
      <header className="shrink-0 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl">🎓</span>
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold font-nunito text-slate-800 truncate">
                {className || 'Lesson'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Timer */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl">
              <span className="text-sm">⏱️</span>
              <span className="text-base font-bold font-nunito text-slate-700 tabular-nums">
                {formatElapsed(elapsedTime)}
              </span>
            </div>

            {/* Status Badge */}
            <span
              className={`
                px-3 py-1.5 rounded-xl text-sm font-bold font-nunito capitalize
                ${statusBadge()}
              `}
            >
              {status}
            </span>

            {/* Connection Indicator */}
            <span
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-emerald-400' : 'bg-slate-300'
              }`}
              title={isConnected ? 'Connected' : 'Disconnected'}
            />
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="shrink-0 px-4 py-2 bg-pink-50 border-b border-pink-200">
          <p className="text-sm text-pink-600 font-nunito text-center">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 underline"
            >
              Dismiss
            </button>
          </p>
        </div>
      )}

      {/* Main transcript area */}
      <TranscriptPanel />

      {/* Bottom area - Status / PTT */}
      <div className="shrink-0 px-4 py-4 bg-white/60 backdrop-blur-sm border-t border-slate-200">
        {mode === 'realtime' ? (
          <StatusIndicator status={processingStatus} />
        ) : (
          <div className="flex justify-center">
            <PushToTalkButton
              isPressed={ptt.isPressed}
              onPressStart={ptt.onPressStart}
              onPressEnd={ptt.onPressEnd}
              disabled={status !== 'active'}
            />
          </div>
        )}
      </div>

      {/* Controls bar */}
      <LessonControls onModeChange={handleModeChange} />
    </main>
  );
}
