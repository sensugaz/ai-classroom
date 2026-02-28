'use client';

interface ToggleProps {
  label?: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'md' | 'lg';
}

export default function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  size = 'md',
}: ToggleProps) {
  const trackSize = size === 'lg' ? 'w-16 h-9' : 'w-12 h-7';
  const thumbSize = size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';
  const thumbTranslate = size === 'lg'
    ? (checked ? 'translate-x-7' : 'translate-x-1')
    : (checked ? 'translate-x-5' : 'translate-x-1');

  return (
    <label
      className={`
        flex items-center justify-between gap-4 cursor-pointer select-none
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <div className="flex-1">
        {label && (
          <span className="block text-base font-bold font-nunito text-slate-700">
            {label}
          </span>
        )}
        {description && (
          <span className="block text-sm text-slate-500 mt-0.5">
            {description}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`
          relative inline-flex items-center shrink-0
          ${trackSize} rounded-full
          transition-colors duration-300 ease-in-out
          focus:outline-none focus:ring-4 focus:ring-indigo-100
          ${checked
            ? 'bg-gradient-to-r from-indigo-500 to-violet-500'
            : 'bg-slate-300'
          }
        `}
      >
        <span
          className={`
            ${thumbSize} rounded-full bg-white shadow-md
            transition-transform duration-300 ease-in-out
            ${thumbTranslate}
          `}
        />
      </button>
    </label>
  );
}
