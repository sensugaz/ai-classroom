'use client';

import { Mic, Volume2, Loader2, Radio } from 'lucide-react';
import type { ProcessingStatus } from '@/lib/types';

interface StatusIndicatorProps {
  status: ProcessingStatus;
  isSpeaking?: boolean;
}

export default function StatusIndicator({ status, isSpeaking = false }: StatusIndicatorProps) {
  const isVoiceActive = isSpeaking && (status === 'listening' || status === 'idle');
  const isWaiting = !isSpeaking && (status === 'listening' || status === 'idle');
  const isTtsSpeaking = status === 'speaking';
  const isWorking = status === 'processing' || status === 'translating';

  let icon = <Radio className="w-4 h-4" />;
  let label = 'Ready';
  let color = 'text-slate-500';
  let dotColor = 'bg-slate-500';
  let barColor = 'bg-slate-500';
  let animate = false;

  if (isVoiceActive) {
    icon = <Mic className="w-4 h-4" />;
    label = 'Speaking';
    color = 'text-cyan-400';
    dotColor = 'bg-cyan-400';
    barColor = 'bg-cyan-400';
    animate = true;
  } else if (isWaiting) {
    icon = <Mic className="w-4 h-4" />;
    label = 'Listening';
    color = 'text-cyan-400';
    dotColor = 'bg-cyan-400';
    barColor = 'bg-cyan-400';
    animate = true;
  } else if (isWorking) {
    icon = <Loader2 className="w-4 h-4 animate-spin" />;
    label = status === 'processing' ? 'Processing' : 'Translating';
    color = 'text-amber-400';
    dotColor = 'bg-amber-400';
    barColor = 'bg-amber-400';
  } else if (isTtsSpeaking) {
    icon = <Volume2 className="w-4 h-4" />;
    label = 'Playing';
    color = 'text-emerald-400';
    dotColor = 'bg-emerald-400';
    barColor = 'bg-emerald-400';
    animate = true;
  }

  return (
    <div className="flex items-center justify-center">
      <div className="glass inline-flex items-center gap-2.5 px-4 py-2 rounded-full transition-colors duration-200">
        {/* Animated ring dot */}
        <span className="relative flex h-2 w-2">
          {animate && (
            <span className={`absolute inset-0 rounded-full ${dotColor} opacity-75 animate-ping`} />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
        </span>

        {/* Icon */}
        <span className={color}>{icon}</span>

        {/* Label */}
        <span className={`text-sm font-medium ${color}`}>
          {label}
        </span>

        {/* Sound wave bars for speaking/playing */}
        {(isVoiceActive || isTtsSpeaking) && (
          <div className="flex items-center gap-[3px] h-3.5 ml-0.5">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`w-[3px] rounded-full animate-sound-wave ${barColor}`}
                style={{
                  height: '100%',
                  animationDelay: `${i * 0.12}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
