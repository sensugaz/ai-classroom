'use client';

interface PulseRingProps {
  active?: boolean;
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children?: React.ReactNode;
}

export default function PulseRing({
  active = true,
  color = 'bg-indigo-400',
  size = 'md',
  children,
}: PulseRingProps) {
  const containerSize = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-40 h-40',
  }[size];

  return (
    <div className={`relative ${containerSize} flex items-center justify-center`}>
      {/* Pulse rings */}
      {active && (
        <>
          <span
            className={`absolute inset-0 rounded-full ${color} opacity-20 animate-pulse-ring`}
          />
          <span
            className={`absolute inset-0 rounded-full ${color} opacity-15 animate-pulse-ring`}
            style={{ animationDelay: '0.5s' }}
          />
          <span
            className={`absolute inset-0 rounded-full ${color} opacity-10 animate-pulse-ring`}
            style={{ animationDelay: '1s' }}
          />
        </>
      )}
      {/* Center content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
