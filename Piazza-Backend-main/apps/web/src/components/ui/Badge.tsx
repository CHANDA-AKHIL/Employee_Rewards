import React from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'success' | 'warning' | 'error' | 'info' | 'purple' | 'gray';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
    ({ className, variant = 'gray', children, ...props }, ref) => {

        const variants = {
            success: 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30',
            warning: 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30',
            error: 'bg-[#f43f5e]/15 text-[#f43f5e] border-[#f43f5e]/30',
            info: 'bg-[#06b6d4]/15 text-[#06b6d4] border-[#06b6d4]/30',
            purple: 'bg-[#7c3aed]/15 text-[#7c3aed] border-[#7c3aed]/30',
            gray: 'bg-white/10 text-gray-300 border-white/20'
        };

        return (
            <span
                ref={ref}
                className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                    variants[variant],
                    className
                )}
                {...props}
            >
                {children}
            </span>
        );
    }
);
Badge.displayName = 'Badge';
