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
      className="flex-1 overflow-y-auto px-3 py-4 space-y-3 scroll-smooth"
    >
      {segments.length === 0 && !partialOriginal && (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-400/10 flex items-center justify-center mb-4">
            <Mic className="w-8 h-8 text-cyan-400/20" />
          </div>
          <p className="text-sm font-medium text-slate-500">
            Start speaking to see translations
          </p>
          <p className="text-xs text-slate-600 mt-1">
            Your words will appear here in real time
          </p>
        </div>
      )}

      {segments.map((seg) => (
        <div
          key={seg.index}
          className="glass rounded-xl overflow-hidden animate-fade-in"
        >
          {/* Original text */}
          <div className="px-4 pt-3 pb-2.5">
            <p className="text-sm font-prompt text-slate-300 leading-relaxed">
              {seg.original_text}
            </p>
          </div>

          {/* Divider */}
          <div className="mx-4">
            <div className="border-t border-white/5" />
          </div>

          {/* Translation */}
          <div className="px-4 pt-2.5 pb-2">
            <p className="text-sm font-medium text-slate-100 leading-relaxed">
              {seg.translated_text}
            </p>
          </div>

          {/* Timestamp */}
          <div className="px-4 pb-2.5">
            <span className="text-xs text-slate-600 block text-right tabular-nums">
              {formatTime(seg.timestamp)}
            </span>
          </div>
        </div>
      ))}

      {/* Partial text (streaming) */}
      {(partialOriginal || partialTranslation) && (
        <div className="glass rounded-xl border-dashed !border-cyan-400/30 overflow-hidden">
          {/* Partial original */}
          <div className="px-4 pt-3 pb-2.5">
            {partialOriginal ? (
              <p className="text-sm font-prompt text-slate-400 leading-relaxed animate-glow-pulse">
                {partialOriginal}
                <span className="inline-block w-0.5 h-4 bg-cyan-400 animate-pulse ml-0.5 align-middle" />
              </p>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/40 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/40 animate-pulse" style={{ animationDelay: '0.15s' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/40 animate-pulse" style={{ animationDelay: '0.3s' }} />
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="mx-4">
            <div className="border-t border-white/5" />
          </div>

          {/* Partial translation */}
          <div className="px-4 pt-2.5 pb-3">
            {partialTranslation ? (
              <p className="text-sm font-medium text-slate-300 leading-relaxed animate-glow-pulse">
                {partialTranslation}
                <span className="inline-block w-0.5 h-4 bg-cyan-400 animate-pulse ml-0.5 align-middle" />
              </p>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/40 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/40 animate-pulse" style={{ animationDelay: '0.15s' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/40 animate-pulse" style={{ animationDelay: '0.3s' }} />
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
