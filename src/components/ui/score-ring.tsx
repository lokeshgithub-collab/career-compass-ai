import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ScoreRingProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export function ScoreRing({ score, size = 'md', label, className }: ScoreRingProps) {
  const sizes = {
    sm: { ring: 60, stroke: 6, text: 'text-lg' },
    md: { ring: 100, stroke: 8, text: 'text-2xl' },
    lg: { ring: 140, stroke: 10, text: 'text-4xl' },
  };

  const { ring, stroke, text } = sizes[size];
  const radius = (ring - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      <svg width={ring} height={ring} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={ring / 2}
          cy={ring / 2}
          r={radius}
          strokeWidth={stroke}
          className="fill-none stroke-muted"
        />
        {/* Progress circle */}
        <motion.circle
          cx={ring / 2}
          cy={ring / 2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          className="fill-none stroke-primary"
          style={{
            strokeDasharray: circumference,
          }}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn("font-display font-bold text-foreground", text)}>
          {score}%
        </span>
      </div>
      {label && (
        <span className="mt-2 text-sm font-medium text-muted-foreground">{label}</span>
      )}
    </div>
  );
}
