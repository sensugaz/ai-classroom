'use client';

import { useEffect, useRef } from 'react';
import { useTranscriptStore } from '@/stores/transcriptStore';
import { Mic, Languages, Clock } from 'lucide-react';

export default function TranscriptPanel() {
  const segments = useTranscriptStore((s) => s.segments);
  const partialOriginal = useTranscriptStore((s) => s.partialOriginal);
  const partialTranslation = useTranscriptStore((s) => s.partialTranslation);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments, partialOriginal, partialTranslation]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-5 scroll-smooth grid-pattern"
    >
      {/* Empty state */}
      {segments.length === 0 && !partialOriginal && (
        <div className="flex flex-col items-center justify-center h-full text-center animate-float">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full orb-gradient animate-orb-breathe"
              style={{ boxShadow: '0 0 40px rgba(6, 182, 212, 0.2), inset 0 0 20px rgba(0,0,0,0.5)' }}>
              <div className="absolute inset-2 rounded-full bg-dark-DEFAULT/90 flex items-center justify-center">
                <Mic className="w-8 h-8 text-cyan-400/30" />
              </div>
            </div>
          </div>
          <p className="text-sm font-medium text-slate-400 mb-1">
            Start speaking to see translations
          </p>
          <p className="text-xs text-slate-600">
            Your words will appear here in real time
          </p>
        </div>
      )}

      {/* Transcript segments — chat bubble style */}
      <div className="space-y-4 max-w-2xl mx-auto">
        {segments.map((seg, idx) => (
          <div
            key={seg.index}
            className="animate-fade-in space-y-2"
            style={{ animationDelay: `${Math.min(idx * 0.05, 0.3)}s` }}
          >
            {/* Original text — left aligned bubble */}
            <div className="flex items-start gap-2.5 animate-slide-in-left"
              style={{ animationDelay: `${Math.min(idx * 0.05, 0.3)}s` }}>
              <div className="shrink-0 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center mt-0.5">
                <Mic className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="bubble-original rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%]">
                <p className="text-sm font-prompt text-slate-300 leading-relaxed">
                  {seg.original_text}
                </p>
              </div>
            </div>

            {/* Translated text — right aligned bubble */}
            <div className="flex items-start gap-2.5 justify-end animate-slide-in-right"
              style={{ animationDelay: `${Math.min(idx * 0.05 + 0.1, 0.4)}s` }}>
              <div className="bubble-translated rounded-2xl rounded-tr-md px-4 py-2.5 max-w-[85%]">
                <p className="text-sm font-medium text-slate-100 leading-relaxed">
                  {seg.translated_text}
                </p>
                <div className="flex items-center gap-1 mt-1.5 justify-end">
                  <Clock className="w-3 h-3 text-slate-600" />
                  <span className="text-[10px] text-slate-600 tabular-nums">
                    {formatTime(seg.timestamp)}
                  </span>
                </div>
              </div>
              <div className="shrink-0 w-7 h-7 rounded-full bg-cyan-400/10 flex items-center justify-center mt-0.5">
                <Languages className="w-3.5 h-3.5 text-cyan-400/60" />
              </div>
            </div>
          </div>
        ))}

        {/* Partial / streaming text */}
        {(partialOriginal || partialTranslation) && (
          <div className="space-y-2 animate-fade-in">
            {/* Partial original */}
            <div className="flex items-start gap-2.5">
              <div className="shrink-0 w-7 h-7 rounded-full bg-cyan-400/10 flex items-center justify-center mt-0.5">
                <Mic className="w-3.5 h-3.5 text-cyan-400/60 animate-pulse" />
              </div>
              <div className="bubble-original rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%] border-dashed !border-cyan-400/20">
                {partialOriginal ? (
                  <p className="text-sm font-prompt text-slate-400 leading-relaxed">
                    {partialOriginal}
                    <span className="inline-block w-0.5 h-4 bg-cyan-400 animate-pulse ml-0.5 align-middle rounded-full" />
                  </p>
                ) : (
                  <div className="flex items-center gap-1.5 py-0.5">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-400/40 animate-pulse"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Partial translation */}
            {partialTranslation && (
              <div className="flex items-start gap-2.5 justify-end">
                <div className="bubble-translated rounded-2xl rounded-tr-md px-4 py-2.5 max-w-[85%] border-dashed !border-cyan-400/30">
                  <p className="text-sm font-medium text-slate-300 leading-relaxed animate-glow-pulse">
                    {partialTranslation}
                    <span className="inline-block w-0.5 h-4 bg-cyan-400 animate-pulse ml-0.5 align-middle rounded-full" />
                  </p>
                </div>
                <div className="shrink-0 w-7 h-7 rounded-full bg-cyan-400/10 flex items-center justify-center mt-0.5">
                  <Languages className="w-3.5 h-3.5 text-cyan-400/60 animate-pulse" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
