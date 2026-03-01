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
import { Zap, Wifi, WifiOff, X, AlertCircle, ArrowLeft } from 'lucide-react';

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
  const BARGE_IN_THRESHOLD = 0.08;

  const { isRecording, isSpeaking, startRecording, stopRecording } = useAudioRecorder({
    onAudioData: (data) => {
      if (status !== 'active' || mode !== 'realtime') return;

      if (isPlayingRef.current) {
        const int16 = new Int16Array(data);
        let sumSq = 0;
        for (let i = 0; i < int16.length; i++) {
          const sample = int16[i] / 32768;
          sumSq += sample * sample;
        }
        const rms = Math.sqrt(sumSq / int16.length);

        if (rms > BARGE_IN_THRESHOLD) {
          clearQueue();
          sendAudio(data);
        }
      } else {
        sendAudio(data);
      }
    },
  });

  // Push-to-talk
  const ptt = usePushToTalk({ sendAudio, sendJSON });

  // Timer
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === 'active') {
      timerRef.current = setInterval(() => incrementTime(), 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, incrementTime]);

  // Initialize session
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
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
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load session');
      }
    }
    init();
    return () => { cancelled = true; };
  }, [sessionId, storeSessionId, setError]);

  // Connect WebSocket
  useEffect(() => {
    if (!initialized) return;
    connect();
    startLesson();
    return () => { disconnect(); closePlayback(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

  // Start/stop recording
  useEffect(() => {
    if (status === 'active' && mode === 'realtime' && isConnected && initialized) {
      startRecording();
    } else if (mode !== 'realtime' || status !== 'active') {
      if (isRecording) stopRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, mode, isConnected, initialized]);

  const handleModeChange = useCallback(
    (newMode: 'realtime' | 'push-to-talk') => {
      if (newMode === 'realtime') startRecording();
      else stopRecording();
    },
    [startRecording, stopRecording]
  );

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Error state
  if (error && !initialized) {
    return (
      <main className="h-screen h-[100dvh] flex items-center justify-center bg-dark p-6">
        <div className="glass rounded-2xl p-8 text-center space-y-4 max-w-sm w-full animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto"
            style={{ boxShadow: '0 0 30px rgba(244, 63, 94, 0.15)' }}>
            <AlertCircle className="w-7 h-7 text-rose-400" />
          </div>
          <p className="text-base text-rose-300 font-medium">{error}</p>
          <button
            onClick={() => router.push('/setup')}
            className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Setup
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen h-[100dvh] flex flex-col bg-dark overflow-hidden">
      {/* ── HUD Top Bar ── */}
      <header className="shrink-0 relative z-10">
        <div className="glass px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            {/* Left: Title */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center shrink-0"
                style={{ boxShadow: '0 0 15px rgba(6, 182, 212, 0.15)' }}>
                <Zap className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-slate-200 truncate">
                  {className || 'Lesson'}
                </h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                  {mode === 'realtime' ? 'Live Mode' : 'Push-to-Talk'}
                </p>
              </div>
            </div>

            {/* Right: Timer + Connection */}
            <div className="flex items-center gap-4 shrink-0">
              {/* Timer — prominent */}
              <div className="glass rounded-full px-4 py-1.5 flex items-center gap-2"
                style={{ boxShadow: '0 0 10px rgba(6, 182, 212, 0.1)' }}>
                <div className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-cyan-400 animate-pulse' : status === 'paused' ? 'bg-amber-400' : 'bg-slate-500'}`} />
                <span className="text-sm font-mono text-cyan-400 tabular-nums tracking-wider">
                  {formatElapsed(elapsedTime)}
                </span>
              </div>

              {/* Connection */}
              <div className={`flex items-center gap-1.5 text-xs font-medium ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isConnected ? 'Live' : 'Offline'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Gradient accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
      </header>

      {/* ── Error Banner ── */}
      {error && (
        <div className="shrink-0 mx-4 mt-3 animate-slide-up">
          <div className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-3 border-rose-400/20"
            style={{ background: 'rgba(244, 63, 94, 0.06)' }}>
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <p className="text-sm text-rose-300 truncate">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-1 text-rose-400/60 hover:text-rose-300 transition-colors shrink-0 rounded-lg hover:bg-rose-500/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Transcript Area ── */}
      <TranscriptPanel />

      {/* ── Footer: Status/PTT + Controls ── */}
      <div className="shrink-0 relative z-10">
        {/* Top gradient line */}
        <div className="h-px bg-gradient-to-r from-transparent via-violet-400/20 to-transparent" />

        <div className="glass pb-safe">
          {/* Status Orb / PTT Button */}
          <div className="py-5 flex justify-center">
            {mode === 'realtime' ? (
              <StatusIndicator status={processingStatus} isSpeaking={isSpeaking} />
            ) : (
              <PushToTalkButton
                isPressed={ptt.isPressed}
                onPressStart={ptt.onPressStart}
                onPressEnd={ptt.onPressEnd}
                disabled={status !== 'active'}
              />
            )}
          </div>

          {/* Separator */}
          <div className="mx-6 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

          {/* Controls */}
          <LessonControls onModeChange={handleModeChange} />
        </div>
      </div>
    </main>
  );
}
