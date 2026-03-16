import React, { useEffect, useState } from 'react';
import { CheckCircle, Star, Gift, XCircle, BellRing } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useNotificationStore, type NotificationType } from '../../store/notificationStore';
import { api } from '../../services/api';

export const Notifications: React.FC = () => {
    const { notifications, markRead, markAllRead, setNotifications } = useNotificationStore();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                setLoading(true);
                const res = await api.get('/notifications').catch(() => ({ data: [] }));
                setNotifications(res.data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchNotifications();
    }, [setNotifications]);

    const getIcon = (type: NotificationType) => {
        switch (type) {
            case 'KPI_APPROVED': return <CheckCircle className="text-[#10b981]" size={20} />;
            case 'KPI_REJECTED': return <XCircle className="text-[#f43f5e]" size={20} />;
            case 'BADGE_UNLOCKED': return <Star className="text-[#f59e0b]" size={20} />;
            case 'REDEMPTION_APPROVED': return <Gift className="text-[#7c3aed]" size={20} />;
            default: return <BellRing className="text-[#06b6d4]" size={20} />;
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await api.post('/notifications/mark-all-read');
            markAllRead();
        } catch (err) {
            console.error(err);
        }
    };

    const handleMarkRead = async (id: string, isRead: boolean) => {
        if (isRead) return;
        try {
            await api.put(`/notifications/${id}/read`);
            markRead(id);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-white">Notifications</h1>
                <Button variant="ghost" onClick={handleMarkAllRead}>
                    Mark all as read
                </Button>
            </div>

            <Card className="p-0 overflow-hidden min-h-[500px]">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 rounded-full border-2 border-[#7c3aed] border-t-transparent animate-spin" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                        <BellRing size={48} className="mb-4 opacity-50" />
                        <p>You're all caught up!</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/10">
                        {notifications.map((notif) => (
                            <div
                                key={notif.id}
                                onClick={() => handleMarkRead(notif.id, notif.read)}
                                className={`p-4 flex gap-4 transition-colors cursor-pointer hover:bg-white/5
                  ${!notif.read ? 'bg-white/5 border-l-4 border-l-[#7c3aed]' : 'border-l-4 border-l-transparent'}
                `}
                            >
                                <div className="mt-1 flex-shrink-0">
                                    {getIcon(notif.type)}
                                </div>
                                <div className="flex-1">
                                    <p className={`text-sm ${!notif.read ? 'text-white font-medium' : 'text-gray-300'}`}>
                                        {notif.message}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
};
