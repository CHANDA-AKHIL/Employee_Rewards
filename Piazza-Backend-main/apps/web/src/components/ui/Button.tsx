import React from 'react';
import { cn } from '../../utils/cn';
import { LoadingSpinner } from './LoadingSpinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {

        const variants = {
            primary: 'bg-[#7c3aed] text-white hover:bg-[#6d28d9] hover:shadow-[0_0_15px_rgba(124,58,237,0.5)] border border-transparent',
            secondary: 'bg-[#06b6d4] text-white hover:bg-[#0891b2] hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] border border-transparent',
            ghost: 'bg-transparent text-white hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.1)]',
            danger: 'bg-[#f43f5e] text-white hover:bg-[#e11d48] hover:shadow-[0_0_15px_rgba(244,63,94,0.5)] border border-transparent'
        };

        const sizes = {
            sm: 'px-3 py-1.5 text-sm',
            md: 'px-4 py-2 text-base',
            lg: 'px-6 py-3 text-lg'
        };

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(
                    'relative inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7c3aed] focus:ring-offset-[#0a0a0f] disabled:opacity-50 disabled:cursor-not-allowed',
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            >
                {isLoading && (
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <LoadingSpinner size="sm" color="currentColor" />
                    </span>
                )}
                <span className={cn('flex items-center gap-2', isLoading && 'invisible')}>
                    {children}
                </span>
            </button>
        );
    }
);
Button.displayName = 'Button';
