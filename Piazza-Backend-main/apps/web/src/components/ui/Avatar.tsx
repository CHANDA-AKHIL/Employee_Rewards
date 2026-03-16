import React from 'react';
import { cn } from '../../utils/cn';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
    src?: string;
    fallback: string;
    size?: 'sm' | 'md' | 'lg';
}

export const Avatar: React.FC<AvatarProps> = ({ src, fallback, size = 'md', className, ...props }) => {
    const sizes = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-16 h-16 text-lg'
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    return (
        <div
            className={cn(
                'relative inline-flex items-center justify-center rounded-full overflow-hidden bg-[#7c3aed]/20 text-[#7c3aed] border border-[#7c3aed]/30',
                sizes[size],
                className
            )}
            {...props}
        >
            {src ? (
                <img
                    src={src}
                    alt={fallback}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                    }}
                />
            ) : (
                <span className="font-semibold">{getInitials(fallback)}</span>
            )}
        </div>
    );
};
