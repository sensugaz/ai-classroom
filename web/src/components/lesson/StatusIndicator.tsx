'use client';

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

  // Determine dot color and label
  let dotColor = 'bg-slate-400';
  let label = 'Ready';

  if (isVoiceActive) {
    dotColor = 'bg-violet-600';
    label = 'Speaking...';
  } else if (isWaiting) {
    dotColor = 'bg-blue-600';
    label = 'Listening...';
  } else if (isWorking) {
    dotColor = 'bg-amber-500';
    label = status === 'processing' ? 'Processing...' : 'Translating...';
  } else if (isTtsSpeaking) {
    dotColor = 'bg-emerald-600';
    label = 'Playing...';
  }

  return (
    <div className="flex items-center justify-center gap-2 h-6">
      {/* State dot */}
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${dotColor} ${
          isVoiceActive || isTtsSpeaking ? 'animate-pulse' : ''
        }`}
      />

      {/* Label */}
      <span className="text-sm font-medium text-slate-600">
        {label}
      </span>

      {/* Sound wave bars for speaking/playing states */}
      {(isVoiceActive || isTtsSpeaking) && (
        <div className="flex items-center gap-0.5 h-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`w-0.5 rounded-full animate-sound-wave ${
                isVoiceActive ? 'bg-violet-600' : 'bg-emerald-600'
              }`}
              style={{
                height: '100%',
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
