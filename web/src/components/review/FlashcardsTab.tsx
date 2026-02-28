'use client';

import { useEffect, useState, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import BouncingDots from '@/components/animations/BouncingDots';
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
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <BouncingDots color="bg-violet-400" size="lg" />
        <p className="text-slate-500 font-nunito">Loading flashcards...</p>
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

  if (cards.length === 0) {
    return (
      <div className="text-center py-16">
        <span className="text-5xl block mb-4">🃏</span>
        <p className="text-slate-500 font-nunito text-lg">
          No flashcards available for this lesson.
        </p>
      </div>
    );
  }

  const card = cards[currentIndex];

  return (
    <div className="flex flex-col items-center gap-6 animate-slide-up">
      {/* Progress */}
      <div className="flex items-center gap-2 text-sm font-nunito text-slate-500">
        <span>🃏</span>
        <span>
          {currentIndex + 1} / {cards.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-400 to-pink-400 rounded-full transition-all duration-300"
          style={{
            width: `${((currentIndex + 1) / cards.length) * 100}%`,
          }}
        />
      </div>

      {/* Card */}
      <div
        className="w-full max-w-md perspective-1000"
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
              className="w-full min-h-[280px] p-8 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-3xl shadow-2xl shadow-indigo-200 flex flex-col items-center justify-center gap-4"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <p className="text-3xl font-bold font-prompt text-white text-center">
                {card.front}
              </p>
              {card.phonetic && (
                <p className="text-lg text-indigo-200 font-nunito italic">
                  /{card.phonetic}/
                </p>
              )}
              <p className="text-sm text-indigo-200 font-nunito mt-4">
                Tap to flip
              </p>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 w-full min-h-[280px] p-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-3xl shadow-2xl shadow-emerald-200 flex flex-col items-center justify-center gap-4"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <p className="text-3xl font-bold font-nunito text-white text-center">
                {card.back}
              </p>
              {card.example && (
                <div className="mt-4 p-4 bg-white/20 rounded-2xl w-full">
                  <p className="text-sm text-emerald-100 font-nunito text-center">
                    {card.example}
                  </p>
                </div>
              )}
              <p className="text-sm text-emerald-200 font-nunito mt-2">
                Tap to flip back
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4">
        <Button
          variant="secondary"
          size="lg"
          onClick={goPrev}
          disabled={currentIndex === 0}
        >
          ← Previous
        </Button>
        <Button
          variant="primary"
          size="lg"
          onClick={goNext}
          disabled={currentIndex === cards.length - 1}
        >
          Next →
        </Button>
      </div>
    </div>
  );
}
