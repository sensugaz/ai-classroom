'use client';

import { useEffect, useRef } from 'react';
import { useTranscriptStore } from '@/stores/transcriptStore';
import BouncingDots from '@/components/animations/BouncingDots';

export default function TranscriptPanel() {
  const segments = useTranscriptStore((s) => s.segments);
  const partialOriginal = useTranscriptStore((s) => s.partialOriginal);
  const partialTranslation = useTranscriptStore((s) => s.partialTranslation);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments, partialOriginal, partialTranslation]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth"
    >
      {segments.length === 0 && !partialOriginal && (
        <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
          <span className="text-5xl mb-4">🎤</span>
          <p className="text-lg font-nunito text-slate-500">
            Start speaking to see the transcript here
          </p>
          <p className="text-sm font-nunito text-slate-400 mt-1">
            Translations will appear side by side
          </p>
        </div>
      )}

      {segments.map((seg) => (
        <div
          key={seg.index}
          className="flex gap-3 animate-fade-in"
        >
          {/* Original */}
          <div className="flex-1 p-4 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100">
            <p className="text-base font-prompt text-slate-800 leading-relaxed">
              {seg.original_text}
            </p>
            <span className="text-xs text-indigo-400 mt-2 block">
              {formatTime(seg.timestamp)}
            </span>
          </div>

          {/* Divider */}
          <div className="flex items-center">
            <span className="text-slate-300 text-sm">→</span>
          </div>

          {/* Translation */}
          <div className="flex-1 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100">
            <p className="text-base font-nunito text-slate-800 leading-relaxed">
              {seg.translated_text}
            </p>
            <span className="text-xs text-emerald-400 mt-2 block">
              {formatTime(seg.timestamp)}
            </span>
          </div>
        </div>
      ))}

      {/* Partial text (streaming) */}
      {(partialOriginal || partialTranslation) && (
        <div className="flex gap-3 animate-fade-in">
          <div className="flex-1 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 border-dashed">
            {partialOriginal ? (
              <p className="text-base font-prompt text-slate-600 leading-relaxed">
                {partialOriginal}
                <span className="inline-block w-0.5 h-5 bg-indigo-400 animate-pulse ml-0.5 align-middle" />
              </p>
            ) : (
              <BouncingDots color="bg-indigo-300" size="sm" />
            )}
          </div>

          <div className="flex items-center">
            <span className="text-slate-300 text-sm">→</span>
          </div>

          <div className="flex-1 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 border-dashed">
            {partialTranslation ? (
              <p className="text-base font-nunito text-slate-600 leading-relaxed">
                {partialTranslation}
                <span className="inline-block w-0.5 h-5 bg-emerald-400 animate-pulse ml-0.5 align-middle" />
              </p>
            ) : (
              <BouncingDots color="bg-emerald-300" size="sm" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
