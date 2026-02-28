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
    <div className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-white border-t border-slate-200 pb-safe">
      {/* Pause / Resume */}
      <button
        type="button"
        onClick={handlePauseResume}
        disabled={status !== 'active' && status !== 'paused'}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Mode Toggle - Segmented Control */}
      <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
        <button
          type="button"
          onClick={() => {
            if (mode !== 'realtime') handleModeSwitch();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            mode === 'realtime'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
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
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
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
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
      >
        <Square className="w-4 h-4" />
        <span className="hidden sm:inline">End</span>
      </button>
    </div>
  );
}
