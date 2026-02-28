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
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      {voices.map((voice) => {
        const isSelected = value === voice.type;
        return (
          <button
            key={voice.type}
            type="button"
            onClick={() => onChange(voice.type as VoiceType)}
            className={`
              relative flex flex-col items-center gap-1.5
              py-4 px-3 rounded-xl
              transition-all duration-200 ease-out
              touch-manipulation select-none
              ${isSelected
                ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md shadow-violet-200 scale-[1.02]'
                : 'bg-slate-50 border border-slate-200 text-slate-600 hover:border-violet-300 active:scale-[0.98]'
              }
            `}
          >
            <span className="text-2xl sm:text-3xl">{voice.icon}</span>
            <span className="font-bold font-nunito text-sm">{voice.label}</span>
            <span className={`text-[11px] ${isSelected ? 'text-violet-200' : 'text-slate-400'}`}>
              {voice.description}
            </span>
            {isSelected && (
              <span className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
