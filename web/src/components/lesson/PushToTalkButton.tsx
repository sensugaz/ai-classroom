'use client';

import { Mic, MicOff } from 'lucide-react';

interface PushToTalkButtonProps {
  isPressed: boolean;
  onPressStart: () => void;
  onPressEnd: () => void;
  disabled?: boolean;
}

export default function PushToTalkButton({
  isPressed,
  onPressStart,
  onPressEnd,
  disabled = false,
}: PushToTalkButtonProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Orb-style PTT button */}
      <div className="relative flex items-center justify-center">
        {/* Ripple rings when pressed */}
        {isPressed && (
          <>
            <span className="absolute w-28 h-28 rounded-full border border-cyan-400/30 animate-ring-pulse" />
            <span className="absolute w-28 h-28 rounded-full border border-cyan-400/20 animate-ring-pulse" style={{ animationDelay: '0.5s' }} />
            <span className="absolute w-28 h-28 rounded-full border border-violet-400/20 animate-ring-pulse" style={{ animationDelay: '1s' }} />
          </>
        )}

        {/* Main button */}
        <button
          type="button"
          disabled={disabled}
          onMouseDown={onPressStart}
          onMouseUp={onPressEnd}
          onMouseLeave={onPressEnd}
          onTouchStart={(e) => {
            e.preventDefault();
            onPressStart();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            onPressEnd();
          }}
          onTouchCancel={onPressEnd}
          className={`
            relative w-24 h-24 rounded-full
            flex items-center justify-center
            transition-all duration-200 ease-out
            touch-manipulation select-none
            focus:outline-none
            disabled:opacity-30 disabled:cursor-not-allowed
            ${
              isPressed
                ? 'orb-gradient-active scale-95'
                : 'orb-gradient hover:scale-105'
            }
          `}
          style={{
            boxShadow: isPressed
              ? '0 0 50px rgba(6, 182, 212, 0.5), 0 0 100px rgba(6, 182, 212, 0.2), inset 0 0 30px rgba(0,0,0,0.4)'
              : '0 0 30px rgba(6, 182, 212, 0.2), 0 0 60px rgba(139, 92, 246, 0.1), inset 0 0 30px rgba(0,0,0,0.5)',
          }}
        >
          {/* Inner circle */}
          <div className={`
            absolute inset-2 rounded-full bg-dark-DEFAULT/85 backdrop-blur-sm
            flex items-center justify-center transition-colors duration-200
            ${isPressed ? 'bg-dark-DEFAULT/70' : ''}
          `}>
            {disabled ? (
              <MicOff className="w-7 h-7 text-slate-600" />
            ) : (
              <Mic className={`w-7 h-7 transition-colors ${isPressed ? 'text-cyan-300' : 'text-slate-300'}`} />
            )}
          </div>
        </button>

        {/* Rotating sound bars when pressed */}
        {isPressed && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <span
                key={i}
                className="absolute w-[2px] rounded-full animate-sound-wave bg-cyan-400/40"
                style={{
                  height: '14px',
                  transform: `rotate(${i * 30}deg) translateY(-52px)`,
                  animationDelay: `${i * 0.08}s`,
                  transformOrigin: 'center 52px',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Label */}
      <span className={`text-xs font-medium tracking-widest uppercase transition-colors ${
        isPressed ? 'text-cyan-400' : 'text-slate-500'
      }`}>
        {isPressed ? 'Release to send' : 'Hold to speak'}
      </span>
    </div>
  );
}
