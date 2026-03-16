import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';

interface NavbarProps {
    onMenuClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
    const { user } = useAuthStore();
    const unreadCount = useNotificationStore((state) => state.unreadCount);

    if (!user) return null;

    return (
        <header className="sticky top-0 z-40 w-full bg-[#0a0c14]/80 backdrop-blur-xl border-b border-[#1f2540] px-4 py-2.5 shadow-lg">
            <div className="flex items-center justify-between gap-4">
                {/* Left: Mobile Toggle + Live Status */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={onMenuClick}
                        className="md:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#171b2e] transition-colors"
                    >
                        <i className="fa-solid fa-bars text-lg"></i>
                    </button>

                    <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#111420] border border-[#1f2540]">
                        <div className="pulse"></div>
                        <span className="text-[10px] font-bold text-[#43e97b] uppercase tracking-wider">Live</span>
                    </div>
                </div>

                {/* Center: Search Bar */}
                <div className="flex-1 max-w-xl hidden md:block">
                    <div className="relative group">
                        <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#6c63ff] transition-colors"></i>
                        <input
                            type="text"
                            placeholder="Search anything..."
                            className="w-full bg-[#111420] border border-[#1f2540] rounded-xl py-2 pl-10 pr-4 text-sm text-[#e8eaf6] focus:outline-none focus:border-[#6c63ff] focus:ring-1 focus:ring-[#6c63ff]/30 transition-all"
                        />
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3">
                    <button className="relative p-2.5 text-gray-400 hover:text-[#e8eaf6] hover:bg-[#171b2e] rounded-xl transition-all group">
                        <i className="fa-solid fa-bell text-lg"></i>
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#ff6584] border-2 border-[#0a0c14] text-[10px] font-bold text-white flex items-center justify-center">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                        <div className="absolute top-full right-0 mt-2 w-80 bg-[#111420] border border-[#1f2540] rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all -translate-y-2 group-hover:translate-y-0 z-50 overflow-hidden">
                            <div className="p-3 border-b border-[#1f2540] flex items-center justify-between">
                                <span className="text-xs font-bold text-[#e8eaf6]">Notifications</span>
                                <span className="text-[10px] text-[#6c63ff] hover:underline cursor-pointer">Mark all as read</span>
                            </div>
                            <div className="max-h-64 overflow-y-auto p-2 text-center text-xs text-[#6b7280] py-8">
                                No new notifications
                            </div>
                        </div>
                    </button>

                    <div className="h-6 w-px bg-[#1f2540] mx-1"></div>

                    <div className="group relative">
                        <div className="flex items-center gap-3 p-1 pl-2 rounded-xl hover:bg-[#171b2e] cursor-pointer transition-colors border border-transparent hover:border-[#1f2540]">
                            <div className="hidden lg:block text-right">
                                <div className="text-xs font-bold text-[#e8eaf6]">{user.name}</div>
                                <div className="text-[10px] text-[#6b7280]">{user.role}</div>
                            </div>
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6c63ff] to-[#ff6584] flex items-center justify-center text-white text-sm font-bold shadow-lg border border-white/10">
                                {user.name.charAt(0)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};
