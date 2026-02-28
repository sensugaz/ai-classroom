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
import { BookOpen, Settings, X, AlertCircle } from 'lucide-react';

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
  // During TTS playback: detect loud speech (barge-in) -> stop TTS and resume sending
  // During silence: send audio normally
  const BARGE_IN_THRESHOLD = 0.08; // RMS threshold to detect real speech over echo

  const { isRecording, isSpeaking, startRecording, stopRecording } = useAudioRecorder({
    onAudioData: (data) => {
      if (status !== 'active' || mode !== 'realtime') return;

      if (isPlayingRef.current) {
        // Check audio energy -- if user is speaking, stop TTS (barge-in)
        const int16 = new Int16Array(data);
        let sumSq = 0;
        for (let i = 0; i < int16.length; i++) {
          const sample = int16[i] / 32768;
          sumSq += sample * sample;
        }
        const rms = Math.sqrt(sumSq / int16.length);

        if (rms > BARGE_IN_THRESHOLD) {
          // User is speaking -- interrupt TTS
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

  if (error && !initialized) {
    return (
      <main className="h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <p className="text-base text-red-600 font-medium">{error}</p>
          <button
            onClick={() => router.push('/setup')}
            className="text-sm text-blue-600 hover:text-blue-700 underline underline-offset-2"
          >
            Back to Setup
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen h-[100dvh] flex flex-col bg-slate-50">
      {/* Top Bar */}
      <header className="shrink-0 bg-white border-b border-slate-200 px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <BookOpen className="w-5 h-5 text-blue-600 shrink-0" />
            <h1 className="text-sm font-semibold text-slate-800 truncate">
              {className || 'Lesson'}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Timer */}
            <span className="text-sm font-medium text-slate-600 tabular-nums">
              {formatElapsed(elapsedTime)}
            </span>

            {/* Connection Indicator */}
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isConnected ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
              title={isConnected ? 'Connected' : 'Disconnected'}
            />

            {/* Settings */}
            <button
              type="button"
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="shrink-0 px-4 py-2 bg-red-50 border-b border-red-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-600 truncate">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="p-0.5 text-red-400 hover:text-red-600 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main transcript area */}
      <TranscriptPanel />

      {/* Bottom area - Status / PTT */}
      <div className="shrink-0 px-4 py-3 bg-white border-t border-slate-200 pb-safe">
        {mode === 'realtime' ? (
          <StatusIndicator status={processingStatus} isSpeaking={isSpeaking} />
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
