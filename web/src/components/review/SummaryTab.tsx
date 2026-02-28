'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import BouncingDots from '@/components/animations/BouncingDots';
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
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <BouncingDots color="bg-indigo-400" size="lg" />
        <p className="text-slate-500 font-nunito">Generating summary...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card variant="outlined" padding="lg">
        <div className="text-center">
          <span className="text-4xl block mb-3">😕</span>
          <p className="text-pink-500 font-nunito font-bold">{error}</p>
        </div>
      </Card>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card variant="gradient" accent="indigo" padding="md">
          <p className="text-sm text-slate-500 font-nunito">Duration</p>
          <p className="text-2xl font-bold text-indigo-600 font-nunito">
            {summary.duration_minutes} min
          </p>
        </Card>
        <Card variant="gradient" accent="emerald" padding="md">
          <p className="text-sm text-slate-500 font-nunito">Segments</p>
          <p className="text-2xl font-bold text-emerald-600 font-nunito">
            {summary.segment_count}
          </p>
        </Card>
      </div>

      {/* Key Points */}
      {summary.key_points.length > 0 && (
        <Card variant="elevated" accent="amber">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">⭐</span>
            <h3 className="text-lg font-bold font-nunito text-slate-800">
              Key Points
            </h3>
          </div>
          <ul className="space-y-2">
            {summary.key_points.map((point, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-slate-700 font-nunito"
              >
                <span className="text-amber-400 mt-0.5">●</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Bilingual summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="gradient" accent="indigo">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🇹🇭</span>
            <h3 className="text-base font-bold font-nunito text-slate-700">
              Original
            </h3>
          </div>
          <p className="text-slate-700 font-prompt leading-relaxed whitespace-pre-line">
            {summary.original}
          </p>
        </Card>

        <Card variant="gradient" accent="emerald">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🇬🇧</span>
            <h3 className="text-base font-bold font-nunito text-slate-700">
              Translation
            </h3>
          </div>
          <p className="text-slate-700 font-nunito leading-relaxed whitespace-pre-line">
            {summary.translated}
          </p>
        </Card>
      </div>
    </div>
  );
}
