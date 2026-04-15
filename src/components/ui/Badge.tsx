import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-[#27272a] text-[#a1a1aa]',
    success: 'bg-[#22c55e]/20 text-[#22c55e]',
    warning: 'bg-[#eab308]/20 text-[#eab308]',
    error: 'bg-[#ef4444]/20 text-[#ef4444]',
    info: 'bg-[#71717a]/20 text-[#a1a1aa]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
