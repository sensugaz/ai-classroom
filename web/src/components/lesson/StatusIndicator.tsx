'use client';

import type { ProcessingStatus } from '@/lib/types';
import BouncingDots from '@/components/animations/BouncingDots';
import SoundWave from '@/components/animations/SoundWave';

interface StatusIndicatorProps {
  status: ProcessingStatus;
  isSpeaking?: boolean;
}

const statusConfig: Record<
  ProcessingStatus,
  { label: string; icon: string; color: string; dotColor: string }
> = {
  idle: {
    label: 'Ready',
    icon: '⏸️',
    color: 'from-slate-100 to-slate-50 border-slate-200',
    dotColor: 'bg-slate-400',
  },
  listening: {
    label: 'Listening',
    icon: '🎤',
    color: 'from-indigo-100 to-violet-50 border-indigo-200',
    dotColor: 'bg-indigo-400',
  },
  processing: {
    label: 'Processing',
    icon: '🧠',
    color: 'from-amber-100 to-orange-50 border-amber-200',
    dotColor: 'bg-amber-400',
  },
  translating: {
    label: 'Translating',
    icon: '🌐',
    color: 'from-emerald-100 to-teal-50 border-emerald-200',
    dotColor: 'bg-emerald-400',
  },
  speaking: {
    label: 'Speaking',
    icon: '🔊',
    color: 'from-pink-100 to-rose-50 border-pink-200',
    dotColor: 'bg-pink-400',
  },
};

export default function StatusIndicator({ status, isSpeaking = false }: StatusIndicatorProps) {
  // Override display when user is actively speaking during listening state
  const isVoiceActive = isSpeaking && (status === 'listening' || status === 'idle');

  const displayConfig = isVoiceActive
    ? {
        label: 'Speaking',
        icon: '🗣️',
        color: 'from-violet-100 to-purple-50 border-violet-300',
        dotColor: 'bg-violet-500',
      }
    : statusConfig[status];

  // When listening but not speaking, show "Waiting..."
  const isWaiting = !isSpeaking && status === 'listening';
  const config = isWaiting
    ? {
        ...statusConfig.listening,
        label: 'Waiting...',
        icon: '👂',
      }
    : displayConfig;

  return (
    <div
      className={`
        flex items-center gap-4 px-6 py-4
        bg-gradient-to-r ${config.color}
        rounded-2xl border
        transition-all duration-300
      `}
    >
      <span className="text-2xl">{config.icon}</span>

      <div className="flex items-center gap-3 flex-1">
        <span className="text-base font-bold font-nunito text-slate-700">
          {config.label}
        </span>
        {isVoiceActive && (
          <SoundWave active color={config.dotColor} bars={5} size="sm" />
        )}
        {isWaiting && (
          <BouncingDots color={config.dotColor} size="sm" />
        )}
        {!isVoiceActive && !isWaiting && status === 'listening' && (
          <SoundWave active color={config.dotColor} bars={4} size="sm" />
        )}
        {(status === 'processing' || status === 'translating') && (
          <BouncingDots color={config.dotColor} size="sm" />
        )}
        {status === 'speaking' && (
          <SoundWave active color={config.dotColor} bars={5} size="sm" />
        )}
      </div>
    </div>
  );
}
