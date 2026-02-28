import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { VoiceType, TranslationMode } from '@/lib/types';

interface SettingsState {
  voiceType: VoiceType;
  mode: TranslationMode;
  noiseCancellation: boolean;
  sourceLang: string;
  targetLang: string;

  setVoiceType: (v: VoiceType) => void;
  setMode: (m: TranslationMode) => void;
  setNoiseCancellation: (v: boolean) => void;
  setSourceLang: (l: string) => void;
  setTargetLang: (l: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      voiceType: 'adult_female',
      mode: 'realtime',
      noiseCancellation: true,
      sourceLang: 'th',
      targetLang: 'en',

      setVoiceType: (voiceType) => set({ voiceType }),
      setMode: (mode) => set({ mode }),
      setNoiseCancellation: (noiseCancellation) => set({ noiseCancellation }),
      setSourceLang: (sourceLang) => set({ sourceLang }),
      setTargetLang: (targetLang) => set({ targetLang }),
    }),
    {
      name: 'classroom-translator-settings',
    }
  )
);
