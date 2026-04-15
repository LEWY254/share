import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] disabled:opacity-50 disabled:pointer-events-none';

    const variants = {
      primary:
        'bg-[#d4d4d8] text-[#09090b] hover:bg-[#f4f4f5] focus-visible:ring-[#d4d4d8] active:scale-[0.98]',
      secondary:
        'bg-[#27272a] text-[#fafafa] border border-[#3f3f46] hover:bg-[#3f3f46] focus-visible:ring-[#d4d4d8]',
      ghost:
        'text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#27272a] focus-visible:ring-[#d4d4d8]',
      danger:
        'bg-[#ef4444] text-white hover:bg-[#dc2626] focus-visible:ring-[#ef4444] active:scale-[0.98]',
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
