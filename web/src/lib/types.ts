// ─── Session & Setup ───────────────────────────────────────────────

export type VoiceGender = 'male' | 'female';
export type VoiceAge = 'adult' | 'child';
export type VoiceType = `${VoiceAge}_${VoiceGender}`;

export type TranslationMode = 'realtime' | 'push-to-talk';

export interface SessionConfig {
  teacher_name: string;
  class_name: string;
  subject: string;
  course_outline: string;
  source_lang: string;
  target_lang: string;
  voice_type: VoiceType;
  mode: TranslationMode;
  noise_cancellation: boolean;
}

export interface Session {
  id: string;
  teacher_name: string;
  class_name: string;
  subject: string;
  course_outline: string;
  source_lang: string;
  target_lang: string;
  voice_type: VoiceType;
  mode: TranslationMode;
  noise_cancellation: boolean;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
  duration_seconds: number;
}

export type SessionStatus = 'idle' | 'active' | 'paused' | 'completed';

// ─── Transcript ────────────────────────────────────────────────────

export interface TranscriptSegment {
  index: number;
  original_text: string;
  translated_text: string;
  timestamp: number;
}

// ─── Voice ─────────────────────────────────────────────────────────

export interface Voice {
  id: string;
  name: string;
  type: VoiceType;
  language: string;
  preview_url?: string;
}

// ─── Review ────────────────────────────────────────────────────────

export interface LessonSummary {
  original: string;
  translated: string;
  key_points: string[];
  duration_minutes: number;
  segment_count: number;
}

export interface VocabItem {
  id: string;
  original: string;
  translated: string;
  phonetic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  example_original: string;
  example_translated: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  phonetic: string;
  example: string;
}

// ─── WebSocket Messages ────────────────────────────────────────────

export type WSOutgoingMessage =
  | { type: 'session.create'; session_id: string; source_lang?: string; target_lang?: string; voice?: string; denoise?: boolean }
  | { type: 'input_audio.start' }
  | { type: 'input_audio.stop' }
  | { type: 'session.pause' }
  | { type: 'session.resume' }
  | { type: 'session.end' };

export type WSIncomingMessage =
  | { type: 'session.created'; session_id: string }
  | { type: 'transcript.partial'; text: string }
  | { type: 'transcript.final'; segment: TranscriptSegment }
  | { type: 'translation.partial'; text: string }
  | { type: 'translation.final'; segment: TranscriptSegment }
  | { type: 'audio.start' }
  | { type: 'audio.end' }
  | { type: 'status.update'; status: string }
  | { type: 'error'; message: string };

// ─── Processing Status ─────────────────────────────────────────────

export type ProcessingStatus =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'translating'
  | 'speaking';
