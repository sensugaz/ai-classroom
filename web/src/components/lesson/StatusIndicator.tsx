'use client';

import type { ProcessingStatus } from '@/lib/types';
import BouncingDots from '@/components/animations/BouncingDots';
import SoundWave from '@/components/animations/SoundWave';

interface StatusIndicatorProps {
  status: ProcessingStatus;
  isSpeaking?: boolean;
}

export default function StatusIndicator({ status, isSpeaking = false }: StatusIndicatorProps) {
  const isVoiceActive = isSpeaking && (status === 'listening' || status === 'idle');
  const isWaiting = !isSpeaking && (status === 'listening' || status === 'idle');
  const isTtsSpeaking = status === 'speaking';
  const isWorking = status === 'processing' || status === 'translating';

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Main animated circle */}
      <div className="relative flex items-center justify-center">
        {/* Pulse rings when speaking */}
        {isVoiceActive && (
          <>
            <span className="absolute w-20 h-20 rounded-full bg-violet-400/30 animate-ring-expand" />
            <span
              className="absolute w-20 h-20 rounded-full bg-violet-400/20 animate-ring-expand"
              style={{ animationDelay: '0.5s' }}
            />
          </>
        )}

        {/* TTS pulse rings */}
        {isTtsSpeaking && (
          <>
            <span className="absolute w-20 h-20 rounded-full bg-pink-400/30 animate-ring-expand" />
            <span
              className="absolute w-20 h-20 rounded-full bg-pink-400/20 animate-ring-expand"
              style={{ animationDelay: '0.5s' }}
            />
          </>
        )}

        {/* Center circle */}
        <div
          className={`
            relative w-20 h-20 rounded-full flex items-center justify-center
            transition-all duration-300 shadow-lg
            ${isVoiceActive
              ? 'bg-gradient-to-br from-violet-500 to-purple-600 animate-mic-pulse shadow-violet-300'
              : isTtsSpeaking
                ? 'bg-gradient-to-br from-pink-500 to-rose-600 animate-mic-pulse shadow-pink-300'
                : isWorking
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-200'
                  : isWaiting
                    ? 'bg-gradient-to-br from-indigo-400 to-violet-500 shadow-indigo-200'
                    : 'bg-gradient-to-br from-slate-300 to-slate-400 shadow-slate-200'
            }
          `}
        >
          <span className="text-3xl">
            {isVoiceActive ? '🗣️' : isTtsSpeaking ? '🔊' : isWorking ? '🧠' : isWaiting ? '🎤' : '⏸️'}
          </span>
        </div>
      </div>

      {/* Label + animation */}
      <div className="flex items-center gap-2 h-6">
        {isVoiceActive && (
          <>
            <span className="text-sm font-bold font-nunito text-violet-600">Speaking</span>
            <SoundWave active color="bg-violet-500" bars={5} size="sm" />
          </>
        )}
        {isWaiting && (
          <>
            <span className="text-sm font-bold font-nunito text-indigo-500">Listening</span>
            <BouncingDots color="bg-indigo-400" size="sm" />
          </>
        )}
        {isWorking && (
          <>
            <span className="text-sm font-bold font-nunito text-amber-600">
              {status === 'processing' ? 'Processing' : 'Translating'}
            </span>
            <BouncingDots color="bg-amber-400" size="sm" />
          </>
        )}
        {isTtsSpeaking && (
          <>
            <span className="text-sm font-bold font-nunito text-pink-600">Playing</span>
            <SoundWave active color="bg-pink-500" bars={5} size="sm" />
          </>
        )}
        {!isVoiceActive && !isWaiting && !isWorking && !isTtsSpeaking && (
          <span className="text-sm font-bold font-nunito text-slate-400">Ready</span>
        )}
      </div>
    </div>
  );
}
