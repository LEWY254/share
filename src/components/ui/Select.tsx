import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-[#a1a1aa]">{label}</label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'w-full h-10 px-3 bg-[#18181b] border border-[#27272a] rounded-lg text-[#fafafa] transition-colors duration-150 appearance-none cursor-pointer',
              'focus:outline-none focus:border-[#d4d4d8] focus:ring-1 focus:ring-[#d4d4d8]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]',
              className
            )}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717a] pointer-events-none" />
        </div>
        {error && <p className="text-sm text-[#ef4444]">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
