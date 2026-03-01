'use client';

import { useRouter } from 'next/navigation';
import { useLessonStore } from '@/stores/lessonStore';
import type { TranslationMode } from '@/lib/types';
import { Pause, Play, Radio, Hand, Square } from 'lucide-react';

interface LessonControlsProps {
  onModeChange?: (mode: TranslationMode) => void;
}

export default function LessonControls({ onModeChange }: LessonControlsProps) {
  const router = useRouter();
  const status = useLessonStore((s) => s.status);
  const sessionId = useLessonStore((s) => s.sessionId);
  const mode = useLessonStore((s) => s.mode);
  const pauseLesson = useLessonStore((s) => s.pauseLesson);
  const resumeLesson = useLessonStore((s) => s.resumeLesson);
  const endLesson = useLessonStore((s) => s.endLesson);
  const setMode = useLessonStore((s) => s.setMode);

  const handlePauseResume = () => {
    if (status === 'active') pauseLesson();
    else if (status === 'paused') resumeLesson();
  };

  const handleModeSwitch = () => {
    const newMode: TranslationMode = mode === 'realtime' ? 'push-to-talk' : 'realtime';
    setMode(newMode);
    onModeChange?.(newMode);
  };

  const handleEnd = () => {
    endLesson();
    if (sessionId) router.push(`/lesson/${sessionId}/review`);
  };

  return (
    <div className="flex items-center justify-between px-6 py-3">
      {/* Pause / Resume */}
      <button
        type="button"
        onClick={handlePauseResume}
        disabled={status !== 'active' && status !== 'paused'}
        className="group relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
          text-slate-400 hover:text-slate-100
          transition-all duration-200
          hover:bg-white/5
          disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {status === 'paused' ? (
          <>
            <Play className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300" />
            <span className="hidden sm:inline">Resume</span>
          </>
        ) : (
          <>
            <Pause className="w-4 h-4 group-hover:text-slate-200" />
            <span className="hidden sm:inline">Pause</span>
          </>
        )}
      </button>

      {/* Mode Toggle - Pill Segmented */}
      <div className="flex items-center glass rounded-full p-1">
        <button
          type="button"
          onClick={() => { if (mode !== 'realtime') handleModeSwitch(); }}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-300 ${
            mode === 'realtime'
              ? 'bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Live</span>
        </button>
        <button
          type="button"
          onClick={() => { if (mode !== 'push-to-talk') handleModeSwitch(); }}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-300 ${
            mode === 'push-to-talk'
              ? 'bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Hand className="w-3.5 h-3.5" />
          <span>PTT</span>
        </button>
      </div>

      {/* End Lesson */}
      <button
        type="button"
        onClick={handleEnd}
        className="group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
          text-rose-400/80 hover:text-rose-300
          transition-all duration-200
          hover:bg-rose-500/10"
      >
        <Square className="w-4 h-4" />
        <span className="hidden sm:inline">End</span>
      </button>
    </div>
  );
}
