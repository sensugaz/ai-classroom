'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import BouncingDots from '@/components/animations/BouncingDots';
import { getVocab } from '@/lib/api';
import { DIFFICULTY_COLORS } from '@/lib/constants';
import type { VocabItem } from '@/lib/types';

interface VocabTableProps {
  sessionId: string;
}

export default function VocabTable({ sessionId }: VocabTableProps) {
  const [vocab, setVocab] = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getVocab(sessionId);
        if (!cancelled) setVocab(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load vocabulary'
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
        <BouncingDots color="bg-emerald-400" size="lg" />
        <p className="text-slate-500 font-nunito">Loading vocabulary...</p>
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

  if (vocab.length === 0) {
    return (
      <div className="text-center py-16">
        <span className="text-5xl block mb-4">📖</span>
        <p className="text-slate-500 font-nunito text-lg">
          No vocabulary items found for this lesson.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">📖</span>
        <p className="text-sm text-slate-500 font-nunito">
          {vocab.length} words found
        </p>
      </div>

      {vocab.map((item) => {
        const diffColors = DIFFICULTY_COLORS[item.difficulty];
        return (
          <Card key={item.id} variant="outlined" padding="md">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-lg font-bold font-prompt text-indigo-600">
                    {item.original}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className="text-lg font-bold font-nunito text-emerald-600">
                    {item.translated}
                  </span>
                </div>
                {item.phonetic && (
                  <p className="text-sm text-slate-400 font-nunito italic">
                    /{item.phonetic}/
                  </p>
                )}
                {item.example_original && (
                  <div className="mt-2 pl-3 border-l-2 border-slate-200">
                    <p className="text-sm text-slate-600 font-prompt">
                      {item.example_original}
                    </p>
                    <p className="text-sm text-slate-500 font-nunito">
                      {item.example_translated}
                    </p>
                  </div>
                )}
              </div>
              <span
                className={`
                  text-xs font-bold font-nunito px-3 py-1 rounded-full
                  ${diffColors.bg} ${diffColors.text} ${diffColors.border}
                  border uppercase
                `}
              >
                {item.difficulty}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
