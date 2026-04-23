import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SkillBadgeProps {
  skill: string;
  variant?: 'default' | 'matched' | 'gap' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
}

export function SkillBadge({ skill, variant = 'default', size = 'md', className }: SkillBadgeProps) {
  const variants = {
    default: 'bg-muted text-foreground',
    matched: 'bg-success/10 text-success border border-success/30',
    gap: 'bg-accent/10 text-accent border border-accent/30',
    outline: 'border border-border text-muted-foreground',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "inline-flex items-center rounded-full font-medium transition-all",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {skill}
    </motion.span>
  );
}
