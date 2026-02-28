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
    'w-full px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition-all duration-200';

  const selectClass =
    'w-full px-3.5 py-2.5 text-sm text-slate-100 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition-all duration-200 appearance-none cursor-pointer';

  const modes = [
    { value: 'realtime', label: 'Real-time' },
    { value: 'push-to-talk', label: 'Push-to-Talk' },
  ] as const;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Lesson Details ── */}
      <section className="glass rounded-xl p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
          Lesson Details
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Teacher Name <span className="text-cyan-400">*</span>
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
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Class Name <span className="text-cyan-400">*</span>
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
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Subject
              <span className="text-slate-600 font-normal ml-1">(optional)</span>
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
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Course Outline
              <span className="text-slate-600 font-normal ml-1">(optional)</span>
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

      {/* ── Languages ── */}
      <section className="glass rounded-xl p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
          Languages
        </h2>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
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
            <ArrowRight className="w-4 h-4 text-cyan-400 animate-pulse" />
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
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

      {/* ── Voice ── */}
      <section className="glass rounded-xl p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
          Voice
        </h2>
        <VoiceSelector
          value={settings.voiceType}
          onChange={(v: VoiceType) => settings.setVoiceType(v)}
          targetLang={settings.targetLang}
        />
      </section>

      {/* ── Settings ── */}
      <section className="glass rounded-xl p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
          Settings
        </h2>
        <div className="space-y-5">
          {/* Mode — Glass Segmented Control */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Translation Mode
            </label>
            <div className="inline-flex rounded-lg border border-white/[0.08] bg-white/[0.03] p-1">
              {modes.map((mode) => {
                const isActive = settings.mode === mode.value;
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => settings.setMode(mode.value)}
                    className={`
                      px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
                      ${isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 glow-cyan-sm'
                        : 'text-slate-400 hover:text-slate-200 border border-transparent'
                      }
                    `}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Noise Cancellation Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-sm font-medium text-slate-300">
                Noise Cancellation
              </span>
              <span className="block text-xs text-slate-500 mt-0.5">
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
                w-11 h-6 rounded-full transition-all duration-200
                focus:outline-none focus:ring-1 focus:ring-cyan-400/30
                ${settings.noiseCancellation
                  ? 'bg-cyan-500/30 border border-cyan-400/40'
                  : 'bg-white/10 border border-white/[0.08]'
                }
              `}
            >
              <span
                className={`
                  w-[18px] h-[18px] rounded-full shadow-sm
                  transition-all duration-200
                  ${settings.noiseCancellation
                    ? 'translate-x-[22px] bg-cyan-400'
                    : 'translate-x-[3px] bg-slate-400'
                  }
                `}
              />
            </button>
          </div>

          {/* Microphone */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
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
              <p className="text-sm text-slate-500">
                No microphone detected. Please allow microphone access.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2.5 p-3.5 glass rounded-xl border-rose-500/30 bg-rose-500/10">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <p className="text-sm text-rose-300 font-medium">
            {error}
          </p>
        </div>
      )}

      {/* ── Submit ── */}
      <button
        type="submit"
        disabled={loading}
        className="
          w-full h-12 px-4
          bg-gradient-to-r from-cyan-500 to-cyan-400
          text-dark-DEFAULT text-sm font-bold
          rounded-xl
          transition-all duration-200
          hover:glow-cyan hover:brightness-110
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none
          flex items-center justify-center gap-2
          focus:outline-none focus:ring-2 focus:ring-cyan-400/30
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
