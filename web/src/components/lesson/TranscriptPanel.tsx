'use client';

import { useEffect, useRef } from 'react';
import { useTranscriptStore } from '@/stores/transcriptStore';
import { Mic } from 'lucide-react';

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
      className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scroll-smooth"
    >
      {segments.length === 0 && !partialOriginal && (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
            <Mic className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-500">
            Start speaking to see translations
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Your words will appear here in real time
          </p>
        </div>
      )}

      {segments.map((seg) => (
        <div
          key={seg.index}
          className="bg-white rounded-lg border border-slate-200 overflow-hidden animate-fade-in"
        >
          {/* Original text */}
          <div className="px-4 pt-3 pb-2.5">
            <p className="text-sm font-prompt text-slate-600 leading-relaxed">
              {seg.original_text}
            </p>
          </div>

          {/* Divider */}
          <div className="mx-4">
            <div className="border-t border-slate-100" />
          </div>

          {/* Translation */}
          <div className="px-4 pt-2.5 pb-2">
            <p className="text-sm font-medium text-slate-900 leading-relaxed">
              {seg.translated_text}
            </p>
          </div>

          {/* Timestamp */}
          <div className="px-4 pb-2.5">
            <span className="text-xs text-slate-400 block text-right tabular-nums">
              {formatTime(seg.timestamp)}
            </span>
          </div>
        </div>
      ))}

      {/* Partial text (streaming) */}
      {(partialOriginal || partialTranslation) && (
        <div className="bg-white rounded-lg border border-dashed border-slate-300 overflow-hidden animate-pulse-slow">
          {/* Partial original */}
          <div className="px-4 pt-3 pb-2.5">
            {partialOriginal ? (
              <p className="text-sm font-prompt text-slate-500 leading-relaxed">
                {partialOriginal}
                <span className="inline-block w-0.5 h-4 bg-blue-500 animate-pulse ml-0.5 align-middle" />
              </p>
            ) : (
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse" style={{ animationDelay: '0.15s' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse" style={{ animationDelay: '0.3s' }} />
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="mx-4">
            <div className="border-t border-slate-100" />
          </div>

          {/* Partial translation */}
          <div className="px-4 pt-2.5 pb-3">
            {partialTranslation ? (
              <p className="text-sm font-medium text-slate-700 leading-relaxed">
                {partialTranslation}
                <span className="inline-block w-0.5 h-4 bg-blue-500 animate-pulse ml-0.5 align-middle" />
              </p>
            ) : (
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse" style={{ animationDelay: '0.15s' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse" style={{ animationDelay: '0.3s' }} />
              </div>
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
