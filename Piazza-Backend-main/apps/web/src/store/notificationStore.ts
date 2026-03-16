import { create } from 'zustand';

export type NotificationType = 'KPI_APPROVED' | 'KPI_REJECTED' | 'BADGE_UNLOCKED' | 'REDEMPTION_APPROVED' | 'SYSTEM';

export interface AppNotification {
    id: string;
    type: NotificationType;
    message: string;
    read: boolean;
    createdAt: string;
}

interface NotificationState {
    notifications: AppNotification[];
    unreadCount: number;
    addNotification: (notification: AppNotification) => void;
    markRead: (id: string) => void;
    markAllRead: () => void;
    setNotifications: (notifications: AppNotification[]) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    notifications: [],
    unreadCount: 0,
    addNotification: (notification) =>
        set((state) => ({
            notifications: [notification, ...state.notifications],
            unreadCount: state.unreadCount + 1
        })),
    markRead: (id) =>
        set((state) => {
            const notifications = state.notifications.map(n =>
                n.id === id ? { ...n, read: true } : n
            );
            return {
                notifications,
                unreadCount: notifications.filter(n => !n.read).length
            };
        }),
    markAllRead: () =>
        set((state) => ({
            notifications: state.notifications.map(n => ({ ...n, read: true })),
            unreadCount: 0
        })),
    setNotifications: (notifications) =>
        set({
            notifications,
            unreadCount: notifications.filter(n => !n.read).length
        })
}));
