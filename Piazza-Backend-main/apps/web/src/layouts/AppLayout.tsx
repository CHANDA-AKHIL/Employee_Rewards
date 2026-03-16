import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/ui/Navbar';
import { Sidebar } from '../components/ui/Sidebar';
import { initSocket, disconnectSocket } from '../socket/socket';
import { useAuthStore } from '../store/authStore';

export const AppLayout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const user = useAuthStore((state) => state.user);

    useEffect(() => {
        if (user) {
            initSocket();
        }
        return () => {
            disconnectSocket();
        };
    }, [user]);

    return (
        <div className="min-h-screen bg-[#0a0c14] text-[#e8eaf6] flex flex-col font-dm selection:bg-[#6c63ff] selection:text-white">
            <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

            <div className="flex flex-1 h-[calc(100vh-60px)] overflow-hidden">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

                <main className="flex-1 overflow-y-auto custom-scrollbar relative z-10 w-full bg-[#0a0c14]">
                    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-screen-2xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};
