'use client';

import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Toggle from '@/components/ui/Toggle';
import { useLessonStore } from '@/stores/lessonStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { TranslationMode } from '@/lib/types';

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
    <div className="flex items-center gap-3 px-4 py-3 bg-white/80 backdrop-blur-sm border-t border-slate-200">
      {/* Pause / Resume */}
      <Button
        variant="secondary"
        size="sm"
        onClick={handlePauseResume}
        disabled={status !== 'active' && status !== 'paused'}
      >
        {status === 'paused' ? '▶️ Resume' : '⏸️ Pause'}
      </Button>

      {/* Mode Switch */}
      <Button variant="ghost" size="sm" onClick={handleModeSwitch}>
        {mode === 'realtime' ? '👆 PTT' : '🎙️ Live'}
      </Button>

      {/* Noise Toggle */}
      <div className="flex-1 flex justify-center">
        <Toggle
          label="🔇 Noise"
          checked={noiseCancellation}
          onChange={setNoiseCancellation}
        />
      </div>

      {/* End Lesson */}
      <Button variant="danger" size="sm" onClick={handleEnd}>
        🛑 End
      </Button>
    </div>
  );
}
