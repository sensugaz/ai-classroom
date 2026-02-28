'use client';

import { useEffect, useState } from 'react';
import { Clock, MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import { generateSummary, getSummary } from '@/lib/api';
import type { LessonSummary } from '@/lib/types';

interface SummaryTabProps {
  sessionId: string;
}

export default function SummaryTab({ sessionId }: SummaryTabProps) {
  const [summary, setSummary] = useState<LessonSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // Try to get existing summary first
        const existing = await getSummary(sessionId).catch(() => null);
        if (cancelled) return;

        if (existing) {
          setSummary(existing);
        } else {
          // Generate a new one
          const generated = await generateSummary(sessionId);
          if (!cancelled) setSummary(generated);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load summary'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3">
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
        <p className="text-sm text-slate-500">Generating summary...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-slate-200 rounded-lg p-6 bg-white">
        <div className="flex items-center justify-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-slate-200 rounded-lg bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-slate-400" />
            <p className="text-sm text-slate-500">Duration</p>
          </div>
          <p className="text-2xl font-semibold text-slate-900">
            {summary.duration_minutes} min
          </p>
        </div>
        <div className="border border-slate-200 rounded-lg bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-4 h-4 text-slate-400" />
            <p className="text-sm text-slate-500">Segments</p>
          </div>
          <p className="text-2xl font-semibold text-slate-900">
            {summary.segment_count}
          </p>
        </div>
      </div>

      {/* Key Points */}
      {summary.key_points.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-900 mb-3">
            Key Points
          </h3>
          <ul className="space-y-2">
            {summary.key_points.map((point, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-sm text-slate-600"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Bilingual summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-slate-200 rounded-lg bg-white p-4">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
            Original
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {summary.original}
          </p>
        </div>

        <div className="border border-slate-200 rounded-lg bg-white p-4">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
            Translation
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {summary.translated}
          </p>
        </div>
      </div>
    </div>
  );
}
