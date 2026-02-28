'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, Layers } from 'lucide-react';
import { getFlashcards } from '@/lib/api';
import type { Flashcard } from '@/lib/types';

interface FlashcardsTabProps {
  sessionId: string;
}

export default function FlashcardsTab({ sessionId }: FlashcardsTabProps) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getFlashcards(sessionId);
        if (!cancelled) setCards(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load flashcards'
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

  const goNext = useCallback(() => {
    setFlipped(false);
    setCurrentIndex((i) => Math.min(i + 1, cards.length - 1));
  }, [cards.length]);

  const goPrev = useCallback(() => {
    setFlipped(false);
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  const handleFlip = useCallback(() => {
    setFlipped((f) => !f);
  }, []);

  // Swipe handling for touch
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(diff) > 60) {
      if (diff > 0) goPrev();
      else goNext();
    }
    setTouchStart(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3">
        <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
        <p className="text-sm text-slate-500">Loading flashcards...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-white/5 backdrop-blur border border-rose-500/30 p-6">
        <div className="flex items-center justify-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-400" />
          <p className="text-sm text-rose-300 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl bg-white/5 backdrop-blur border border-white/[0.08]">
        <Layers className="w-8 h-8 text-slate-600" />
        <p className="text-sm text-slate-500">
          No flashcards available for this lesson.
        </p>
      </div>
    );
  }

  const card = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Progress text */}
      <p className="text-sm text-slate-500">
        {currentIndex + 1} of {cards.length}
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-md h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-cyan-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Card */}
      <div
        className="w-full max-w-md"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <button
          type="button"
          onClick={handleFlip}
          className="w-full focus:outline-none"
          style={{ perspective: '1000px' }}
        >
          <div
            className="relative w-full transition-transform duration-500"
            style={{
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0)',
            }}
          >
            {/* Front */}
            <div
              className="w-full min-h-[280px] p-8 rounded-xl bg-white/5 backdrop-blur border border-white/[0.08] flex flex-col items-center justify-center gap-3 shadow-[0_0_20px_rgba(6,182,212,0.08)]"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <p className="text-2xl font-semibold text-slate-100 text-center">
                {card.front}
              </p>
              {card.phonetic && (
                <p className="text-sm text-slate-500 italic">
                  /{card.phonetic}/
                </p>
              )}
              <p className="text-xs text-slate-600 mt-4">
                Tap to flip
              </p>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 w-full min-h-[280px] p-8 rounded-xl bg-violet-500/5 backdrop-blur border border-violet-500/20 flex flex-col items-center justify-center gap-3 shadow-[0_0_20px_rgba(139,92,246,0.08)]"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <p className="text-2xl font-semibold text-slate-100 text-center font-[Prompt]">
                {card.back}
              </p>
              {card.example && (
                <div className="mt-4 px-4 py-3 rounded-lg bg-white/5 backdrop-blur border border-white/[0.08] w-full">
                  <p className="text-sm text-slate-400 text-center">
                    {card.example}
                  </p>
                </div>
              )}
              <p className="text-xs text-slate-600 mt-2">
                Tap to flip back
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed transition-colors rounded-lg hover:bg-white/5"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>
        <button
          onClick={goNext}
          disabled={currentIndex === cards.length - 1}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed transition-colors rounded-lg hover:bg-white/5"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
