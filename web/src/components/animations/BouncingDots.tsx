'use client';

interface BouncingDotsProps {
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export default function BouncingDots({
  color = 'bg-indigo-400',
  size = 'md',
  label,
}: BouncingDotsProps) {
  const dotSize = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  }[size];

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`
              ${dotSize} ${color} rounded-full inline-block
              animate-bounce
            `}
            style={{
              animationDelay: `${i * 0.15}s`,
              animationDuration: '0.8s',
            }}
          />
        ))}
      </div>
      {label && (
        <span className="text-sm font-medium text-slate-500 font-nunito">
          {label}
        </span>
      )}
    </div>
  );
}
