import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { api } from '../../services/api';

interface NavbarProps {
    onMenuClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
    const { user } = useAuthStore();
    const { unreadCount, notifications, setNotifications, setUnreadCount, markAllRead } = useNotificationStore();
    const navigate = useNavigate();

    // ── Load unread count + recent notifications on mount ─────────────────────
    // GET /notifications?limit=5 → { success, data: Notification[], pagination }
    // GET /notifications/unread-count → { success, data: { count } }
    const loadNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const [notifPayload, countPayload] = await Promise.allSettled([
                api.get('/notifications?limit=5'),
                api.get('/notifications/unread-count'),
            ]);

            if (notifPayload.status === 'fulfilled') {
                const p = notifPayload.value as any;
                const list = Array.isArray(p?.data) ? p.data : [];
                setNotifications(list);
            }

            if (countPayload.status === 'fulfilled') {
                const p = countPayload.value as any;
                // sendSuccess → { success, data: { count } }
                const count = p?.data?.count ?? 0;
                setUnreadCount(count);
            }
        } catch {
            // Fail silently — navbar should never crash the app
        }
    }, [user, setNotifications, setUnreadCount]);

    useEffect(() => {
        loadNotifications();
        // Refresh count every 60s
        const interval = setInterval(loadNotifications, 60000);
        return () => clearInterval(interval);
    }, [loadNotifications]);

    // ── Mark all read ─────────────────────────────────────────────────────────
    const handleMarkAllRead = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (unreadCount === 0) return;
        try {
            await api.put('/notifications/read-all');
            markAllRead();
        } catch {
            // fail silently
        }
    };

    if (!user) return null;

    const notifPath = user.role === 'ADMIN' ? '/admin/notifications' : '/employee/notifications';

    return (
        <header className="sticky top-0 z-40 w-full bg-[#0a0c14]/80 backdrop-blur-xl border-b border-[#1f2540] px-4 py-2.5 shadow-lg">
            <div className="flex items-center justify-between gap-4">

                {/* Left: Mobile toggle + live indicator */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={onMenuClick}
                        className="md:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#171b2e] transition-colors"
                    >
                        <i className="fa-solid fa-bars text-lg"></i>
                    </button>
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#111420] border border-[#1f2540]">
                        <span className="w-2 h-2 rounded-full bg-[#43e97b] animate-pulse"></span>
                        <span className="text-[10px] font-bold text-[#43e97b] uppercase tracking-wider">Live</span>
                    </div>
                </div>

                {/* Center: Search */}
                <div className="flex-1 max-w-xl hidden md:block">
                    <div className="relative group">
                        <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#6c63ff] transition-colors"></i>
                        <input
                            type="text"
                            placeholder="Search anything…"
                            className="w-full bg-[#111420] border border-[#1f2540] rounded-xl py-2 pl-10 pr-4 text-sm text-[#e8eaf6] focus:outline-none focus:border-[#6c63ff] focus:ring-1 focus:ring-[#6c63ff]/30 transition-all"
                        />
                    </div>
                </div>

                {/* Right: Notifications + user */}
                <div className="flex items-center gap-3">

                    {/* Notifications bell with dropdown */}
                    <div className="relative group">
                        <button
                            className="relative p-2.5 text-gray-400 hover:text-[#e8eaf6] hover:bg-[#171b2e] rounded-xl transition-all"
                            onClick={() => navigate(notifPath)}
                        >
                            <i className="fa-solid fa-bell text-lg"></i>
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#ff6584] border-2 border-[#0a0c14] text-[9px] font-bold text-white flex items-center justify-center">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Hover dropdown preview */}
                        <div className="absolute top-full right-0 mt-2 w-80 bg-[#111420] border border-[#1f2540] rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all -translate-y-1 group-hover:translate-y-0 z-50 overflow-hidden">
                            <div className="p-3 border-b border-[#1f2540] flex items-center justify-between">
                                <span className="text-xs font-bold text-[#e8eaf6]">
                                    Notifications
                                    {unreadCount > 0 && (
                                        <span className="ml-2 text-[10px] bg-[#ff6584] text-white px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                                    )}
                                </span>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllRead}
                                        className="text-[10px] text-[#6c63ff] hover:underline"
                                    >
                                        Mark all read
                                    </button>
                                )}
                            </div>

                            <div className="max-h-64 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="py-8 text-center text-xs text-gray-600">
                                        <i className="fa-solid fa-bell-slash mb-2 block text-xl opacity-30"></i>
                                        No notifications
                                    </div>
                                ) : (
                                    notifications.slice(0, 5).map(n => (
                                        <div
                                            key={n.id}
                                            onClick={() => navigate(notifPath)}
                                            className={`px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors hover:bg-[#171b2e] ${!n.isRead ? 'border-l-2 border-l-[#6c63ff]' : ''}`}
                                        >
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${!n.isRead ? 'bg-[#6c63ff]' : 'bg-transparent'}`} />
                                            <p className={`text-xs leading-relaxed line-clamp-2 ${!n.isRead ? 'text-[#e8eaf6] font-medium' : 'text-gray-400'}`}>
                                                {n.message}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="border-t border-[#1f2540] p-2">
                                <button
                                    onClick={() => navigate(notifPath)}
                                    className="w-full py-2 text-xs font-bold text-[#6c63ff] hover:bg-[#6c63ff]/10 rounded-lg transition-colors"
                                >
                                    View all notifications →
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="h-6 w-px bg-[#1f2540]" />

                    {/* User chip */}
                    <div className="flex items-center gap-3 p-1 pl-2 rounded-xl hover:bg-[#171b2e] cursor-pointer transition-colors border border-transparent hover:border-[#1f2540]">
                        <div className="hidden lg:block text-right">
                            <div className="text-xs font-bold text-[#e8eaf6]">{user.name}</div>
                            <div className="text-[10px] text-[#6b7280] uppercase">{user.role}</div>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6c63ff] to-[#ff6584] flex items-center justify-center text-white text-sm font-bold shadow-lg border border-white/10">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};