import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../services/api';
import { useNotificationStore } from '../../store/notificationStore';

interface Notification {
    id: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
}

function typeIcon(type: string) {
    switch (type) {
        case 'KPI_APPROVED': return { icon: 'fa-circle-check', color: '#43e97b' };
        case 'KPI_REJECTED': return { icon: 'fa-circle-xmark', color: '#ff6584' };
        case 'KPI_ASSIGNED': return { icon: 'fa-bullseye', color: '#6c63ff' };
        case 'BADGE_UNLOCKED': return { icon: 'fa-medal', color: '#f7b731' };
        case 'REWARD_APPROVED': return { icon: 'fa-gift', color: '#06b6d4' };
        case 'REWARD_REJECTED': return { icon: 'fa-ban', color: '#ff6584' };
        default: return { icon: 'fa-bell', color: '#6b7280' };
    }
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

export const AdminNotifications: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
    const [markingAll, setMarkingAll] = useState(false);

    const { markAllRead: storeMarkAllRead, markRead: storeMarkRead, setUnreadCount } = useNotificationStore();

    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const payload = await api.get('/notifications?limit=50') as any;
            const list: Notification[] = Array.isArray(payload?.data) ? payload.data : [];
            setNotifications(list);
            setUnreadCount(list.filter(n => !n.isRead).length);
        } catch {
            setError('Failed to load notifications.');
        } finally {
            setLoading(false);
        }
    }, [setUnreadCount]);

    useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

    const handleMarkRead = async (id: string) => {
        const n = notifications.find(n => n.id === id);
        if (!n || n.isRead) return;
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            storeMarkRead(id);
        } catch { /* fail silently */ }
    };

    const handleMarkAllRead = async () => {
        try {
            setMarkingAll(true);
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            storeMarkAllRead();
        } catch { /* fail silently */ } finally {
            setMarkingAll(false);
        }
    };

    const shown = filter === 'UNREAD' ? notifications.filter(n => !n.isRead) : notifications;
    const unread = notifications.filter(n => !n.isRead).length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">Notifications</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {unread > 0 ? `${unread} unread` : 'All caught up!'}
                    </p>
                </div>
                {unread > 0 && (
                    <button
                        onClick={handleMarkAllRead}
                        disabled={markingAll}
                        className="flex items-center gap-2 px-4 py-2 bg-[#6c63ff]/10 hover:bg-[#6c63ff]/20 border border-[#6c63ff]/30 text-[#6c63ff] rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                    >
                        {markingAll
                            ? <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                            : <i className="fa-solid fa-check-double text-xs"></i>
                        }
                        Mark all as read
                    </button>
                )}
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm">
                    <i className="fa-solid fa-circle-exclamation"></i>{error}
                    <button onClick={fetchNotifications} className="ml-auto underline text-xs">Retry</button>
                </div>
            )}

            <div className="flex gap-2">
                {([
                    { key: 'ALL', label: `All (${notifications.length})` },
                    { key: 'UNREAD', label: `Unread (${unread})` },
                ] as const).map(f => (
                    <button key={f.key} onClick={() => setFilter(f.key)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f.key ? 'bg-[#6c63ff] text-white' : 'bg-[#171b2e] text-gray-500 hover:text-white border border-[#1f2540]'
                            }`}>
                        {f.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="glass-panel divide-y divide-[#1f2540]">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="px-6 py-5 flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-[#1f2540] animate-pulse flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 bg-[#1f2540] rounded animate-pulse w-3/4" />
                                <div className="h-2 bg-[#1f2540] rounded animate-pulse w-1/3" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : shown.length === 0 ? (
                <div className="glass-panel py-20 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#171b2e] flex items-center justify-center mx-auto mb-4">
                        <i className="fa-solid fa-bell-slash text-gray-600 text-2xl"></i>
                    </div>
                    <h3 className="font-syne font-bold text-[#e8eaf6]">
                        {filter === 'UNREAD' ? 'No unread notifications' : 'No notifications yet'}
                    </h3>
                </div>
            ) : (
                <div className="glass-panel overflow-hidden">
                    <div className="divide-y divide-[#1f2540]">
                        {shown.map(n => {
                            const { icon, color } = typeIcon(n.type);
                            return (
                                <div key={n.id} onClick={() => handleMarkRead(n.id)}
                                    className={`px-6 py-5 flex items-start gap-4 cursor-pointer transition-all group ${!n.isRead
                                        ? 'bg-[#6c63ff]/5 hover:bg-[#6c63ff]/10 border-l-4 border-l-[#6c63ff]'
                                        : 'hover:bg-[#171b2e]/50 border-l-4 border-l-transparent'
                                        }`}>
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                                        style={{ backgroundColor: `${color}18`, border: `1px solid ${color}30` }}>
                                        <i className={`fa-solid ${icon} text-sm`} style={{ color }}></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm leading-relaxed ${!n.isRead ? 'font-bold text-[#e8eaf6]' : 'text-gray-300'}`}>
                                            {n.message}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">
                                                {timeAgo(n.createdAt)}
                                            </span>
                                            <span className="text-[10px] text-gray-700">·</span>
                                            <span className="text-[10px] text-gray-600">
                                                {new Date(n.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                    {!n.isRead && <div className="w-2 h-2 rounded-full bg-[#6c63ff] flex-shrink-0 mt-2 animate-pulse" />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};