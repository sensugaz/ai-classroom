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
    <div className="space-y-3">
      <label className="block text-base font-bold font-nunito text-slate-600">
        Voice Type
      </label>
      <div className="grid grid-cols-2 gap-4">
        {voices.map((voice) => {
          const isSelected = value === voice.type;
          return (
            <button
              key={voice.type}
              type="button"
              onClick={() => onChange(voice.type)}
              className={`
                relative flex flex-col items-center gap-2
                p-6 rounded-3xl
                transition-all duration-200 ease-out
                touch-manipulation select-none
                ${
                  isSelected
                    ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-xl shadow-indigo-200 scale-[1.02]'
                    : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-indigo-300 hover:shadow-md'
                }
              `}
            >
              <span className="text-4xl">{voice.icon}</span>
              <span className="font-bold font-nunito text-base">
                {voice.label}
              </span>
              <span
                className={`text-xs ${
                  isSelected ? 'text-indigo-100' : 'text-slate-400'
                }`}
              >
                {voice.description}
              </span>
              {isSelected && (
                <span className="absolute top-3 right-3 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-indigo-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
