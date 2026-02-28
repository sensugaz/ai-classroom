'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Loader2, AlertCircle } from 'lucide-react';
import { getVocab } from '@/lib/api';
import type { VocabItem } from '@/lib/types';

interface VocabTableProps {
  sessionId: string;
}

const difficultyStyles: Record<string, string> = {
  easy: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border border-amber-200',
  hard: 'bg-red-50 text-red-700 border border-red-200',
};

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
      <div className="flex items-center justify-center py-16 gap-3">
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
        <p className="text-sm text-slate-500">Loading vocabulary...</p>
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

  if (vocab.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <BookOpen className="w-8 h-8 text-slate-300" />
        <p className="text-sm text-slate-500">
          No vocabulary items found for this lesson.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">
        {vocab.length} words found
      </p>

      <div className="border border-slate-200 rounded-lg bg-white divide-y divide-slate-200">
        {vocab.map((item) => (
          <div key={item.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-slate-900">
                  {item.original}
                </span>
                {item.phonetic && (
                  <span className="text-sm text-slate-400">
                    /{item.phonetic}/
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {item.translated}
              </p>
            </div>
            <span
              className={`
                text-xs font-medium px-2 py-0.5 rounded-lg shrink-0 ml-3
                ${difficultyStyles[item.difficulty] || ''}
              `}
            >
              {item.difficulty}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
