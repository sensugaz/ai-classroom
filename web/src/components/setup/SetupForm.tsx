'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import VoiceSelector from './VoiceSelector';
import { useSettingsStore } from '@/stores/settingsStore';
import { useLessonStore } from '@/stores/lessonStore';
import { useTranscriptStore } from '@/stores/transcriptStore';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import type { VoiceType, SessionConfig } from '@/lib/types';

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
    [teacherName, className, subject, courseOutline, settings, createSession, clearSegments, router]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Section 1: Lesson Details */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 sm:px-5 py-3 bg-gradient-to-r from-indigo-500 to-violet-500">
          <h2 className="text-base font-bold font-nunito text-white flex items-center gap-2">
            <span>📝</span> Lesson Details
          </h2>
        </div>
        <div className="p-4 sm:p-5 space-y-4">
          <div>
            <label className="block text-sm font-bold font-nunito text-slate-600 mb-1.5">
              Teacher Name *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg">👤</span>
              <input
                type="text"
                placeholder="Enter your name"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 text-base font-nunito text-slate-700 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold font-nunito text-slate-600 mb-1.5">
              Class Name *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg">🏫</span>
              <input
                type="text"
                placeholder="e.g. Math 101, English Grade 5"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 text-base font-nunito text-slate-700 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold font-nunito text-slate-600 mb-1.5">
              Subject
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg">📚</span>
              <input
                type="text"
                placeholder="e.g. Mathematics, Science"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full pl-11 pr-4 py-3 text-base font-nunito text-slate-700 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold font-nunito text-slate-600 mb-1.5">
              Course Outline
              <span className="text-slate-400 font-normal ml-1">(optional)</span>
            </label>
            <textarea
              placeholder="Brief topics to cover today..."
              value={courseOutline}
              onChange={(e) => setCourseOutline(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 text-base font-nunito text-slate-700 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 focus:bg-white transition-all resize-none"
            />
          </div>
        </div>
      </section>

      {/* Section 2: Languages */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 sm:px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500">
          <h2 className="text-base font-bold font-nunito text-white flex items-center gap-2">
            <span>🌍</span> Languages
          </h2>
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex items-stretch gap-2 sm:gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold font-nunito text-slate-500 mb-1.5 uppercase tracking-wide">
                Speak in
              </label>
              <select
                value={settings.sourceLang}
                onChange={(e) => settings.setSourceLang(e.target.value)}
                className="w-full px-3 py-3 text-base font-nunito text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all appearance-none cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.nativeName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end pb-1">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-bold font-nunito text-slate-500 mb-1.5 uppercase tracking-wide">
                Translate to
              </label>
              <select
                value={settings.targetLang}
                onChange={(e) => settings.setTargetLang(e.target.value)}
                className="w-full px-3 py-3 text-base font-nunito text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all appearance-none cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.nativeName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Voice */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 sm:px-5 py-3 bg-gradient-to-r from-violet-500 to-purple-500">
          <h2 className="text-base font-bold font-nunito text-white flex items-center gap-2">
            <span>🔊</span> Voice
          </h2>
        </div>
        <div className="p-4 sm:p-5">
          <VoiceSelector
            value={settings.voiceType}
            onChange={(v: VoiceType) => settings.setVoiceType(v)}
            targetLang={settings.targetLang}
          />
        </div>
      </section>

      {/* Section 4: Mode & Settings */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 sm:px-5 py-3 bg-gradient-to-r from-pink-500 to-rose-500">
          <h2 className="text-base font-bold font-nunito text-white flex items-center gap-2">
            <span>⚙️</span> Settings
          </h2>
        </div>
        <div className="p-4 sm:p-5 space-y-4">
          {/* Mode toggle */}
          <div>
            <label className="block text-xs font-bold font-nunito text-slate-500 mb-2 uppercase tracking-wide">
              Translation Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => settings.setMode('realtime')}
                className={`
                  flex flex-col items-center gap-1 py-3 px-3 rounded-xl
                  font-nunito font-bold transition-all duration-200
                  ${settings.mode === 'realtime'
                    ? 'bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-md shadow-pink-200'
                    : 'bg-slate-50 text-slate-500 border border-slate-200 hover:border-pink-300'
                  }
                `}
              >
                <span className="text-xl">🎙️</span>
                <span className="text-sm">Real-time</span>
              </button>
              <button
                type="button"
                onClick={() => settings.setMode('push-to-talk')}
                className={`
                  flex flex-col items-center gap-1 py-3 px-3 rounded-xl
                  font-nunito font-bold transition-all duration-200
                  ${settings.mode === 'push-to-talk'
                    ? 'bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-md shadow-pink-200'
                    : 'bg-slate-50 text-slate-500 border border-slate-200 hover:border-pink-300'
                  }
                `}
              >
                <span className="text-xl">👆</span>
                <span className="text-sm">Push-to-Talk</span>
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">
              {settings.mode === 'realtime'
                ? 'Continuously listens and translates'
                : 'Hold button to speak, release to translate'}
            </p>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-sm font-bold font-nunito text-slate-700">
                  Noise Cancellation
                </span>
                <span className="block text-xs text-slate-400 mt-0.5">
                  Filter background noise
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.noiseCancellation}
                onClick={() => settings.setNoiseCancellation(!settings.noiseCancellation)}
                className={`
                  relative inline-flex items-center shrink-0
                  w-12 h-7 rounded-full transition-colors duration-300
                  focus:outline-none focus:ring-2 focus:ring-indigo-200
                  ${settings.noiseCancellation
                    ? 'bg-gradient-to-r from-indigo-500 to-violet-500'
                    : 'bg-slate-300'
                  }
                `}
              >
                <span
                  className={`
                    w-5 h-5 rounded-full bg-white shadow-md
                    transition-transform duration-300
                    ${settings.noiseCancellation ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="p-3 bg-pink-50 border border-pink-200 rounded-xl">
          <p className="text-sm text-pink-600 font-medium font-nunito text-center">
            {error}
          </p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="
          w-full py-4 px-6
          bg-gradient-to-r from-indigo-600 to-violet-600
          hover:from-indigo-700 hover:to-violet-700
          text-white text-lg font-extrabold font-nunito
          rounded-2xl shadow-lg shadow-indigo-200
          transition-all duration-200
          active:scale-[0.98] active:shadow-md
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center gap-2
        "
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Starting...
          </>
        ) : (
          <>🚀 Start Lesson</>
        )}
      </button>
    </form>
  );
}
