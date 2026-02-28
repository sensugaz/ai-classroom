'use client';

interface SoundWaveProps {
  active?: boolean;
  color?: string;
  bars?: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function SoundWave({
  active = true,
  color = 'bg-indigo-400',
  bars = 5,
  size = 'md',
}: SoundWaveProps) {
  const barHeight = {
    sm: 'h-4',
    md: 'h-8',
    lg: 'h-12',
  }[size];

  const barWidth = {
    sm: 'w-1',
    md: 'w-1.5',
    lg: 'w-2',
  }[size];

  return (
    <div className={`flex items-center gap-1 ${barHeight}`}>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={`
            ${barWidth} ${color} rounded-full
            ${active ? 'animate-sound-wave' : 'scale-y-[0.3]'}
            transition-transform origin-center
          `}
          style={{
            height: '100%',
            animationDelay: active ? `${i * 0.12}s` : '0s',
          }}
        />
      ))}
    </div>
  );
}
