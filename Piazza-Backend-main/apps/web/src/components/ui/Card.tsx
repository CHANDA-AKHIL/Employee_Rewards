import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    hoverLift?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, hoverLift = false, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    'glass-panel p-6',
                    hoverLift && 'hover:-translate-y-1 hover:shadow-lg transition-transform duration-200',
                    className
                )}
                {...props}
            />
        );
    }
);
Card.displayName = 'Card';
