import { create } from 'zustand';
import type { SessionStatus, TranslationMode, ProcessingStatus } from '@/lib/types';
import * as api from '@/lib/api';
import type { SessionConfig } from '@/lib/types';

interface LessonState {
  sessionId: string | null;
  status: SessionStatus;
  mode: TranslationMode;
  elapsedTime: number;
  processingStatus: ProcessingStatus;
  className: string;
  subject: string;
  error: string | null;

  createSession: (config: SessionConfig) => Promise<string>;
  startLesson: () => void;
  pauseLesson: () => void;
  resumeLesson: () => void;
  endLesson: () => void;
  setMode: (mode: TranslationMode) => void;
  setProcessingStatus: (status: ProcessingStatus) => void;
  setElapsedTime: (t: number) => void;
  incrementTime: () => void;
  setError: (msg: string | null) => void;
  reset: () => void;
}

export const useLessonStore = create<LessonState>()((set, get) => ({
  sessionId: null,
  status: 'idle',
  mode: 'realtime',
  elapsedTime: 0,
  processingStatus: 'idle',
  className: '',
  subject: '',
  error: null,

  createSession: async (config) => {
    try {
      const session = await api.createSession(config);
      set({
        sessionId: session.id,
        status: 'idle',
        mode: config.mode,
        elapsedTime: 0,
        className: config.class_name,
        subject: config.subject,
        error: null,
      });
      return session.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create session';
      set({ error: message });
      throw err;
    }
  },

  startLesson: () => set({ status: 'active', processingStatus: 'listening' }),
  pauseLesson: () => set({ status: 'paused', processingStatus: 'idle' }),
  resumeLesson: () => set({ status: 'active', processingStatus: 'listening' }),

  endLesson: () => {
    const { sessionId } = get();
    if (sessionId) {
      api.updateSession(sessionId, { status: 'completed' }).catch(console.error);
    }
    set({ status: 'completed', processingStatus: 'idle' });
  },

  setMode: (mode) => set({ mode }),
  setProcessingStatus: (processingStatus) => set({ processingStatus }),
  setElapsedTime: (elapsedTime) => set({ elapsedTime }),
  incrementTime: () => set((s) => ({ elapsedTime: s.elapsedTime + 1 })),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      sessionId: null,
      status: 'idle',
      mode: 'realtime',
      elapsedTime: 0,
      processingStatus: 'idle',
      className: '',
      subject: '',
      error: null,
    }),
}));
