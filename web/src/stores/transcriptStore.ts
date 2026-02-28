import { create } from 'zustand';
import type { TranscriptSegment } from '@/lib/types';

interface TranscriptState {
  segments: TranscriptSegment[];
  partialOriginal: string;
  partialTranslation: string;

  addSegment: (segment: TranscriptSegment) => void;
  setPartialOriginal: (text: string) => void;
  setPartialTranslation: (text: string) => void;
  clearSegments: () => void;
}

export const useTranscriptStore = create<TranscriptState>()((set) => ({
  segments: [],
  partialOriginal: '',
  partialTranslation: '',

  addSegment: (segment) =>
    set((state) => ({
      segments: [...state.segments, segment],
      partialOriginal: '',
      partialTranslation: '',
    })),

  setPartialOriginal: (partialOriginal) => set({ partialOriginal }),
  setPartialTranslation: (partialTranslation) => set({ partialTranslation }),

  clearSegments: () =>
    set({
      segments: [],
      partialOriginal: '',
      partialTranslation: '',
    }),
}));
