'use client';

import { VOICE_OPTIONS, type VoiceOption } from '@/lib/constants';
import type { VoiceType } from '@/lib/types';

interface VoiceSelectorProps {
  value: VoiceType;
  onChange: (type: VoiceType) => void;
  targetLang: string;
}

export default function VoiceSelector({ value, onChange, targetLang }: VoiceSelectorProps) {
  const voices: VoiceOption[] = VOICE_OPTIONS[targetLang] || VOICE_OPTIONS['en'] || [];

  return (
    <div className="flex flex-wrap gap-2">
      {voices.map((voice) => {
        const isSelected = value === voice.type;
        return (
          <button
            key={voice.type}
            type="button"
            onClick={() => onChange(voice.type as VoiceType)}
            className={`
              inline-flex items-center px-4 py-2 rounded-full
              text-sm font-medium transition-all duration-200
              focus:outline-none focus:ring-1 focus:ring-cyan-400/30
              border backdrop-blur-sm
              ${isSelected
                ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300 glow-cyan-sm'
                : 'bg-white/5 border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/[0.15]'
              }
            `}
          >
            {voice.label}
          </button>
        );
      })}
    </div>
  );
}
