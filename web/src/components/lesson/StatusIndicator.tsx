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
  const isActive = isVoiceActive || isWaiting || isTtsSpeaking;

  let icon = <Radio className="w-5 h-5" />;
  let label = 'Ready';
  let orbClass = 'orb-gradient';
  let glowColor = 'rgba(100, 116, 139, 0.2)';
  let textColor = 'text-slate-500';

  if (isVoiceActive) {
    icon = <Mic className="w-5 h-5" />;
    label = 'Speaking';
    orbClass = 'orb-gradient-active';
    glowColor = 'rgba(6, 182, 212, 0.4)';
    textColor = 'text-cyan-400';
  } else if (isWaiting) {
    icon = <Mic className="w-5 h-5" />;
    label = 'Listening';
    orbClass = 'orb-gradient';
    glowColor = 'rgba(6, 182, 212, 0.3)';
    textColor = 'text-cyan-400';
  } else if (isWorking) {
    icon = <Loader2 className="w-5 h-5 animate-spin" />;
    label = status === 'processing' ? 'Processing' : 'Translating';
    orbClass = 'orb-gradient-processing';
    glowColor = 'rgba(245, 158, 11, 0.4)';
    textColor = 'text-amber-400';
  } else if (isTtsSpeaking) {
    icon = <Volume2 className="w-5 h-5" />;
    label = 'Playing';
    orbClass = 'orb-gradient-speaking';
    glowColor = 'rgba(16, 185, 129, 0.4)';
    textColor = 'text-emerald-400';
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Animated Orb */}
      <div className="relative flex items-center justify-center">
        {/* Outer ring pulses */}
        {isActive && (
          <>
            <span
              className="absolute w-24 h-24 rounded-full animate-ring-pulse"
              style={{ border: `1px solid ${glowColor}` }}
            />
            <span
              className="absolute w-24 h-24 rounded-full animate-ring-pulse"
              style={{ border: `1px solid ${glowColor}`, animationDelay: '0.7s' }}
            />
          </>
        )}

        {/* Spinning gradient ring */}
        <div
          className={`w-20 h-20 rounded-full ${orbClass} ${isWorking ? 'animate-orb-spin' : 'animate-orb-breathe'}`}
          style={{
            boxShadow: `0 0 40px ${glowColor}, 0 0 80px ${glowColor}, inset 0 0 30px rgba(0,0,0,0.5)`,
          }}
        >
          {/* Inner dark circle with icon */}
          <div className="absolute inset-2 rounded-full bg-dark-DEFAULT/90 flex items-center justify-center backdrop-blur-sm">
            <span className={textColor}>{icon}</span>
          </div>
        </div>

        {/* Sound wave bars around orb */}
        {(isVoiceActive || isTtsSpeaking) && (
          <div className="absolute inset-0 flex items-center justify-center">
            {[...Array(8)].map((_, i) => (
              <span
                key={i}
                className="absolute w-[2px] rounded-full animate-sound-wave"
                style={{
                  height: '32px',
                  background: glowColor,
                  transform: `rotate(${i * 45}deg) translateY(-44px)`,
                  animationDelay: `${i * 0.1}s`,
                  transformOrigin: 'center 44px',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Status label */}
      <span className={`text-xs font-medium tracking-widest uppercase ${textColor}`}>
        {label}
      </span>
    </div>
  );
}
