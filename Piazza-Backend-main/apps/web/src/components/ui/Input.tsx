import React from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, error, ...props }, ref) => {
        return (
            <div className="w-full">
                <input
                    ref={ref}
                    className={cn(
                        'flex h-10 w-full rounded-md border bg-white/5 px-3 py-2 text-sm text-white transition-colors',
                        'border-white/10 placeholder:text-gray-500',
                        'focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/50 focus:border-[#7c3aed]',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        error && 'border-[#f43f5e] focus:border-[#f43f5e] focus:ring-[#f43f5e]/50',
                        className
                    )}
                    {...props}
                />
                {error && (
                    <p className="mt-1 text-sm text-[#f43f5e]">
                        {error}
                    </p>
                )}
            </div>
        );
    }
);
Input.displayName = 'Input';
