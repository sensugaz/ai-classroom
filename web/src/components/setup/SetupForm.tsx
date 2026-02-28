'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Toggle from '@/components/ui/Toggle';
import VoiceSelector from './VoiceSelector';
import { useSettingsStore } from '@/stores/settingsStore';
import { useLessonStore } from '@/stores/lessonStore';
import { useTranscriptStore } from '@/stores/transcriptStore';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import type { VoiceType, TranslationMode, SessionConfig } from '@/lib/types';

export default function SetupForm() {
  const router = useRouter();
  const settings = useSettingsStore();
  const createSession = useLessonStore((s) => s.createSession);
  const clearSegments = useTranscriptStore((s) => s.clearSegments);

  const [teacherName, setTeacherName] = useState('');
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('');
  const [courseOutline, setCourseOutline] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!teacherName.trim()) {
        setError('Please enter your name');
        return;
      }
      if (!className.trim()) {
        setError('Please enter a class name');
        return;
      }

      setLoading(true);
      clearSegments();

      const config: SessionConfig = {
        teacher_name: teacherName.trim(),
        class_name: className.trim(),
        subject: subject.trim(),
        course_outline: courseOutline.trim(),
        source_lang: settings.sourceLang,
        target_lang: settings.targetLang,
        voice_type: settings.voiceType,
        mode: settings.mode,
        noise_cancellation: settings.noiseCancellation,
      };

      try {
        const sessionId = await createSession(config);
        router.push(`/lesson/${sessionId}`);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to create session'
        );
        setLoading(false);
      }
    },
    [
      teacherName,
      className,
      subject,
      courseOutline,
      settings,
      createSession,
      clearSegments,
      router,
    ]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Teacher & Class Info */}
      <Card variant="gradient" accent="indigo">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-2xl">📝</span>
          <h2 className="text-xl font-bold font-nunito text-slate-800">
            Lesson Details
          </h2>
        </div>
        <div className="space-y-4">
          <Input
            label="Teacher Name"
            icon="👤"
            placeholder="Enter your name"
            value={teacherName}
            onChange={(e) => setTeacherName((e.target as HTMLInputElement).value)}
          />
          <Input
            label="Class Name"
            icon="🏫"
            placeholder="e.g. Math 101, English Grade 5"
            value={className}
            onChange={(e) => setClassName((e.target as HTMLInputElement).value)}
          />
          <Input
            label="Subject"
            icon="📚"
            placeholder="e.g. Mathematics, Science"
            value={subject}
            onChange={(e) => setSubject((e.target as HTMLInputElement).value)}
          />
          <Input
            label="Course Outline (optional)"
            icon="📋"
            placeholder="Brief topics to cover today..."
            multiline
            value={courseOutline}
            onChange={(e) =>
              setCourseOutline((e.target as HTMLTextAreaElement).value)
            }
          />
        </div>
      </Card>

      {/* Language Pair */}
      <Card variant="gradient" accent="emerald">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-2xl">🌍</span>
          <h2 className="text-xl font-bold font-nunito text-slate-800">
            Languages
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-base font-bold font-nunito text-slate-600 mb-2">
              Speak in
            </label>
            <select
              value={settings.sourceLang}
              onChange={(e) => settings.setSourceLang(e.target.value)}
              className="w-full px-5 py-4 text-lg font-nunito text-slate-700 bg-white border-2 border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 hover:border-emerald-300 transition-all appearance-none cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name} ({lang.nativeName})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-center w-12 h-12 mt-7 rounded-full bg-emerald-100 text-emerald-600 text-xl font-bold shrink-0">
            →
          </div>

          <div className="flex-1">
            <label className="block text-base font-bold font-nunito text-slate-600 mb-2">
              Translate to
            </label>
            <select
              value={settings.targetLang}
              onChange={(e) => settings.setTargetLang(e.target.value)}
              className="w-full px-5 py-4 text-lg font-nunito text-slate-700 bg-white border-2 border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 hover:border-emerald-300 transition-all appearance-none cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name} ({lang.nativeName})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Voice */}
      <Card variant="gradient" accent="violet">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-2xl">🔊</span>
          <h2 className="text-xl font-bold font-nunito text-slate-800">
            Translation Voice
          </h2>
        </div>
        <VoiceSelector
          value={settings.voiceType}
          onChange={(v: VoiceType) => settings.setVoiceType(v)}
          targetLang={settings.targetLang}
        />
      </Card>

      {/* Mode & Settings */}
      <Card variant="gradient" accent="pink">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-2xl">⚙️</span>
          <h2 className="text-xl font-bold font-nunito text-slate-800">
            Settings
          </h2>
        </div>
        <div className="space-y-5">
          {/* Mode toggle */}
          <div>
            <label className="block text-base font-bold font-nunito text-slate-600 mb-3">
              Translation Mode
            </label>
            <div className="flex bg-slate-100 rounded-2xl p-1.5">
              <button
                type="button"
                onClick={() => settings.setMode('realtime')}
                className={`
                  flex-1 py-3 px-4 rounded-xl text-base font-bold font-nunito
                  transition-all duration-200
                  ${
                    settings.mode === 'realtime'
                      ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-lg'
                      : 'text-slate-500 hover:text-slate-700'
                  }
                `}
              >
                🎙️ Real-time
              </button>
              <button
                type="button"
                onClick={() => settings.setMode('push-to-talk')}
                className={`
                  flex-1 py-3 px-4 rounded-xl text-base font-bold font-nunito
                  transition-all duration-200
                  ${
                    settings.mode === 'push-to-talk'
                      ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-lg'
                      : 'text-slate-500 hover:text-slate-700'
                  }
                `}
              >
                👆 Push-to-Talk
              </button>
            </div>
            <p className="text-sm text-slate-500 mt-2 pl-1">
              {settings.mode === 'realtime'
                ? 'Continuously listens and translates in real-time.'
                : 'Hold a button to speak, release to translate.'}
            </p>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <Toggle
              label="Noise Cancellation"
              description="Filter out background classroom noise"
              checked={settings.noiseCancellation}
              onChange={settings.setNoiseCancellation}
              size="lg"
            />
          </div>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <div className="p-4 bg-pink-50 border-2 border-pink-200 rounded-2xl">
          <p className="text-pink-600 font-medium font-nunito text-center">
            {error}
          </p>
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        size="xl"
        fullWidth
        loading={loading}
      >
        🚀 Start Lesson
      </Button>
    </form>
  );
}
