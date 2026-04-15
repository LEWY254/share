import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, type = 'text', ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-[#a1a1aa]">{label}</label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            className={cn(
              'w-full h-10 px-3 bg-[#18181b] border border-[#27272a] rounded-lg text-[#fafafa] placeholder:text-[#71717a] transition-colors duration-150',
              'focus:outline-none focus:border-[#d4d4d8] focus:ring-1 focus:ring-[#d4d4d8]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              icon && 'pl-10',
              error && 'border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-sm text-[#ef4444]">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
