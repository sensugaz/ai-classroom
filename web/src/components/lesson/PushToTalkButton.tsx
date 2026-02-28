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
    <div className="flex flex-col items-center gap-2 w-full max-w-xs">
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
          w-full h-12 rounded-xl
          flex items-center justify-center gap-2
          transition-all duration-150 ease-out
          touch-manipulation select-none
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${
            isPressed
              ? 'bg-blue-600 text-white scale-[0.98] shadow-sm'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }
        `}
      >
        <Mic className={`w-4 h-4 ${isPressed ? 'text-white' : 'text-slate-500'}`} />
        <span className="text-sm font-medium">
          {isPressed ? 'Release to send' : 'Hold to speak'}
        </span>
      </button>
    </div>
  );
}
