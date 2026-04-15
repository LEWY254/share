import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-[#a1a1aa]">{label}</label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'w-full px-3 py-2 bg-[#18181b] border border-[#27272a] rounded-lg text-[#fafafa] placeholder:text-[#71717a] transition-colors duration-150 min-h-[100px] resize-y',
            'focus:outline-none focus:border-[#d4d4d8] focus:ring-1 focus:ring-[#d4d4d8]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]',
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-[#ef4444]">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
