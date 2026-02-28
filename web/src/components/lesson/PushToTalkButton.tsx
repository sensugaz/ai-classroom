'use client';

import { Mic } from 'lucide-react';

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
    <div className="flex flex-col items-center gap-1.5 w-full">
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
          w-full max-w-sm h-14 rounded-xl
          flex items-center justify-center gap-2.5
          transition-all duration-150 ease-out
          touch-manipulation select-none
          font-semibold
          focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dark
          disabled:opacity-40 disabled:cursor-not-allowed
          ${
            isPressed
              ? 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 glow-cyan scale-[0.98]'
              : 'glass text-slate-300 hover:bg-white/[0.08] hover:border-white/[0.12]'
          }
        `}
      >
        <span className="relative flex items-center justify-center">
          {isPressed && (
            <span className="absolute inset-0 -m-2 rounded-full bg-cyan-400/20 animate-ping" />
          )}
          <Mic className="w-5 h-5 relative" />
        </span>
        <span className="text-sm">
          {isPressed ? 'Release to send' : 'Hold to speak'}
        </span>
      </button>
    </div>
  );
}
