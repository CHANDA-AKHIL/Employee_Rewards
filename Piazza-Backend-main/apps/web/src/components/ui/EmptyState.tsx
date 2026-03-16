import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
    icon: LucideIcon;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon: Icon,
    title,
    description,
    action,
    className,
    ...props
}) => {
    return (
        <div
            className={cn('flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-dashed border-white/10 bg-white/5', className)}
            {...props}
        >
            <div className="h-12 w-12 rounded-full bg-[#7c3aed]/10 flex items-center justify-center mb-4">
                <Icon className="h-6 w-6 text-[#7c3aed]" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
            {description && <p className="text-sm text-gray-400 mb-6 max-w-sm">{description}</p>}
            {action && <div>{action}</div>}
        </div>
    );
};
