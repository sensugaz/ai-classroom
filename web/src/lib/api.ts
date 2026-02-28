import { API_URL } from './constants';
import type {
  Session,
  SessionConfig,
  Voice,
  LessonSummary,
  VocabItem,
  Flashcard,
  TranscriptSegment,
} from './types';

// ─── Helpers ───────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `API error ${res.status}: ${res.statusText}${body ? ` - ${body}` : ''}`
    );
  }

  return res.json();
}

// ─── Sessions ──────────────────────────────────────────────────────

export async function createSession(data: SessionConfig): Promise<Session> {
  return request<Session>('/api/v1/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getSession(id: string): Promise<Session> {
  return request<Session>(`/api/v1/sessions/${id}`);
}

export async function updateSession(
  id: string,
  data: Partial<SessionConfig & { status: string }>
): Promise<Session> {
  return request<Session>(`/api/v1/sessions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function listSessions(): Promise<Session[]> {
  return request<Session[]>('/api/v1/sessions');
}

// ─── Voices ────────────────────────────────────────────────────────

export async function getVoices(): Promise<Voice[]> {
  return request<Voice[]>('/api/v1/voices');
}

// ─── Review: Summary ───────────────────────────────────────────────

export async function generateSummary(id: string): Promise<LessonSummary> {
  return request<LessonSummary>(`/api/v1/sessions/${id}/summary`, {
    method: 'POST',
  });
}

export async function getSummary(id: string): Promise<LessonSummary> {
  return request<LessonSummary>(`/api/v1/sessions/${id}/summary`);
}

// ─── Review: Vocabulary ────────────────────────────────────────────

export async function getVocab(id: string): Promise<VocabItem[]> {
  return request<VocabItem[]>(`/api/v1/sessions/${id}/vocab`);
}

// ─── Review: Flashcards ────────────────────────────────────────────

export async function getFlashcards(id: string): Promise<Flashcard[]> {
  return request<Flashcard[]>(`/api/v1/sessions/${id}/flashcards`);
}

// ─── Segments ──────────────────────────────────────────────────────

export async function getSegments(id: string): Promise<TranscriptSegment[]> {
  return request<TranscriptSegment[]>(`/api/v1/sessions/${id}/segments`);
}
