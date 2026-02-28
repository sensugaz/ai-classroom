'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Play, Mic, AlertCircle, Loader2 } from 'lucide-react';
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

  // Microphone devices
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState(settings.micDeviceId || '');

  useEffect(() => {
    async function enumerateDevices() {
      try {
        // Request permission first so labels are populated
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((d) => d.kind === 'audioinput');
        setMicDevices(audioInputs);

        // If we have a saved device, keep it; otherwise select first available
        if (!selectedMic && audioInputs.length > 0) {
          setSelectedMic(audioInputs[0].deviceId);
          settings.setMicDeviceId(audioInputs[0].deviceId);
        }
      } catch {
        // Permission denied or no devices — leave empty
      }
    }
    enumerateDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMicChange = (deviceId: string) => {
    setSelectedMic(deviceId);
    settings.setMicDeviceId(deviceId);
  };

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

  const inputClass =
    'w-full px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors';

  const selectClass =
    'w-full px-3 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors appearance-none cursor-pointer';

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Lesson Details */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
          Lesson Details
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Teacher Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter your name"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Class Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Math 101, English Grade 5"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Subject
              <span className="text-slate-400 font-normal ml-1">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Mathematics, Science"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Course Outline
              <span className="text-slate-400 font-normal ml-1">(optional)</span>
            </label>
            <textarea
              placeholder="Brief topics to cover today..."
              value={courseOutline}
              onChange={(e) => setCourseOutline(e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-slate-200" />

      {/* Languages */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
          Languages
        </h2>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Speak in
            </label>
            <select
              value={settings.sourceLang}
              onChange={(e) => settings.setSourceLang(e.target.value)}
              className={selectClass}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.nativeName})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-center w-10 h-10 shrink-0 mb-0.5">
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Translate to
            </label>
            <select
              value={settings.targetLang}
              onChange={(e) => settings.setTargetLang(e.target.value)}
              className={selectClass}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.nativeName})
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-slate-200" />

      {/* Voice */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
          Voice
        </h2>
        <VoiceSelector
          value={settings.voiceType}
          onChange={(v: VoiceType) => settings.setVoiceType(v)}
          targetLang={settings.targetLang}
        />
      </section>

      {/* Divider */}
      <div className="border-t border-slate-200" />

      {/* Settings */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
          Settings
        </h2>
        <div className="space-y-5">
          {/* Mode */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Translation Mode
            </label>
            <select
              value={settings.mode}
              onChange={(e) => settings.setMode(e.target.value as 'realtime' | 'push-to-talk')}
              className={selectClass}
            >
              <option value="realtime">Real-time -- Continuously listens and translates</option>
              <option value="push-to-talk">Push-to-Talk -- Hold to speak, release to translate</option>
            </select>
          </div>

          {/* Noise Cancellation */}
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-sm font-medium text-slate-700">
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
                w-11 h-6 rounded-full transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-600/20
                ${settings.noiseCancellation ? 'bg-blue-600' : 'bg-slate-300'}
              `}
            >
              <span
                className={`
                  w-[18px] h-[18px] rounded-full bg-white shadow-sm
                  transition-transform duration-200
                  ${settings.noiseCancellation ? 'translate-x-[22px]' : 'translate-x-[3px]'}
                `}
              />
            </button>
          </div>

          {/* Microphone */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <span className="inline-flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-slate-500" />
                Microphone
              </span>
            </label>
            {micDevices.length > 0 ? (
              <select
                value={selectedMic}
                onChange={(e) => handleMicChange(e.target.value)}
                className={selectClass}
              >
                {micDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-slate-400">
                No microphone detected. Please allow microphone access.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-600 font-medium">
            {error}
          </p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="
          w-full py-3 px-4
          bg-blue-600 hover:bg-blue-700
          text-white text-sm font-semibold
          rounded-lg
          transition-colors duration-150
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center gap-2
          focus:outline-none focus:ring-2 focus:ring-blue-600/20
        "
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Starting...
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Start Lesson
          </>
        )}
      </button>
    </form>
  );
}
