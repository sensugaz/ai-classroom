'use client';

import PulseRing from '@/components/animations/PulseRing';

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
    <div className="flex flex-col items-center gap-3">
      <PulseRing active={isPressed} color="bg-pink-400" size="xl">
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
            w-28 h-28 rounded-full
            flex items-center justify-center
            transition-all duration-200 ease-out
            touch-manipulation select-none
            focus:outline-none focus:ring-4 focus:ring-pink-200
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              isPressed
                ? 'bg-gradient-to-br from-pink-500 to-rose-500 shadow-2xl shadow-pink-300 scale-110'
                : 'bg-gradient-to-br from-pink-400 to-rose-400 shadow-xl shadow-pink-200 hover:shadow-2xl hover:scale-105'
            }
          `}
        >
          <svg
            className={`w-12 h-12 text-white transition-transform duration-200 ${
              isPressed ? 'scale-110' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
            />
          </svg>
        </button>
      </PulseRing>
      <p className="text-base font-bold font-nunito text-slate-500">
        {isPressed ? 'Listening...' : 'Hold to speak'}
      </p>
    </div>
  );
}
