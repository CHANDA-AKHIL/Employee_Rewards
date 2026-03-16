import React from 'react';
import { Outlet } from 'react-router-dom';
import { VideoBackground } from '../components/ui/VideoBackground';

export const AuthLayout: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative font-sans overflow-hidden">
            <VideoBackground />

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] flex items-center justify-center mb-4 shadow-lg shadow-[#7c3aed]/20">
                        <span className="text-3xl font-bold text-white">P</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                        Piazza Rewards
                    </h1>
                    <p className="text-gray-400 mt-2">
                        Elevate your team's performance
                    </p>
                </div>

                <Outlet />
            </div>
        </div>
    );
};
