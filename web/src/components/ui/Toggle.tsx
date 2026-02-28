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
  return (
    <label
      className={`
        flex items-center justify-between gap-4 cursor-pointer select-none
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <div className="flex-1">
        {label && (
          <span className="block text-sm font-medium text-slate-200">
            {label}
          </span>
        )}
        {description && (
          <span className="block text-xs text-slate-500 mt-0.5">
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
          w-10 h-6 rounded-full
          transition-colors duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]
          ${checked ? 'bg-cyan-500' : 'bg-white/10'}
        `}
      >
        <span
          className={`
            w-4 h-4 rounded-full bg-white shadow
            transition-transform duration-200
            ${checked ? 'translate-x-5' : 'translate-x-0.5'}
          `}
        />
      </button>
    </label>
  );
}
