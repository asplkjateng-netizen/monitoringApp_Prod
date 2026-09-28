import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-1 text-left">
        {label && (
          <label className="block text-xs font-semibold text-stone-600">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors",
            error && "border-red-500 focus:ring-red-200 focus:border-red-500",
            className
          )}
          {...props}
        />
        {error && <p className="text-[11px] text-red-500">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
