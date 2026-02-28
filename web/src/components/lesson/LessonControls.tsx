'use client';

import { useRouter } from 'next/navigation';
import { useLessonStore } from '@/stores/lessonStore';
import { useSettingsStore } from '@/stores/settingsStore';
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
  const noiseCancellation = useSettingsStore((s) => s.noiseCancellation);
  const setNoiseCancellation = useSettingsStore((s) => s.setNoiseCancellation);

  const handlePauseResume = () => {
    if (status === 'active') {
      pauseLesson();
    } else if (status === 'paused') {
      resumeLesson();
    }
  };

  const handleModeSwitch = () => {
    const newMode: TranslationMode =
      mode === 'realtime' ? 'push-to-talk' : 'realtime';
    setMode(newMode);
    onModeChange?.(newMode);
  };

  const handleEnd = () => {
    endLesson();
    if (sessionId) {
      router.push(`/lesson/${sessionId}/review`);
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-2">
      {/* Pause / Resume */}
      <button
        type="button"
        onClick={handlePauseResume}
        disabled={status !== 'active' && status !== 'paused'}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-slate-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {status === 'paused' ? (
          <>
            <Play className="w-4 h-4" />
            <span className="hidden sm:inline">Resume</span>
          </>
        ) : (
          <>
            <Pause className="w-4 h-4" />
            <span className="hidden sm:inline">Pause</span>
          </>
        )}
      </button>

      {/* Mode Toggle - Glass Segmented Control */}
      <div className="flex items-center bg-white/5 rounded-lg p-0.5">
        <button
          type="button"
          onClick={() => {
            if (mode !== 'realtime') handleModeSwitch();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            mode === 'realtime'
              ? 'bg-white/10 text-cyan-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Live</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (mode !== 'push-to-talk') handleModeSwitch();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            mode === 'push-to-talk'
              ? 'bg-white/10 text-cyan-400'
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
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
      >
        <Square className="w-4 h-4" />
        <span className="hidden sm:inline">End</span>
      </button>
    </div>
  );
}
