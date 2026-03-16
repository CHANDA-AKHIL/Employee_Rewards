import React, { useEffect } from 'react';
import { cn } from '../../utils/cn';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, className }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Dialog */}
            <div
                className={cn(
                    'relative w-full max-w-md bg-[#0a0a0f] border border-white/10 shadow-2xl rounded-2xl p-6',
                    'transform transition-all scale-100 opacity-100',
                    className
                )}
            >
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-full p-1 hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                >
                    <X size={20} />
                </button>

                {title && (
                    <h2 className="text-xl font-semibold mb-4 text-white">
                        {title}
                    </h2>
                )}

                <div className="text-gray-200">
                    {children}
                </div>
            </div>
        </div>
    );
};
