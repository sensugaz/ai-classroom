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
              inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg
              text-sm font-medium transition-colors duration-150
              focus:outline-none focus:ring-2 focus:ring-blue-600/20
              ${isSelected
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
              }
            `}
          >
            <span>{voice.label}</span>
          </button>
        );
      })}
    </div>
  );
}
