import { create } from 'zustand';

export interface Notification {
    id: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
}

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    setNotifications: (notifications: Notification[], total?: number) => void;
    addNotification: (notification: Notification) => void;
    markRead: (id: string) => void;
    markAllRead: () => void;
    setUnreadCount: (count: number) => void;
}

export const useNotificationStore = create<NotificationState>((set, _get) => ({
    notifications: [],
    unreadCount: 0,

    setNotifications: (notifications, _total) => {
        set({
            notifications,
            unreadCount: notifications.filter(n => !n.isRead).length,
        });
    },

    addNotification: (notification) => {
        set(state => ({
            notifications: [notification, ...state.notifications],
            unreadCount: state.unreadCount + (notification.isRead ? 0 : 1),
        }));
    },

    markRead: (id) => {
        set(state => ({
            notifications: state.notifications.map(n =>
                n.id === id ? { ...n, isRead: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
        }));
    },

    markAllRead: () => {
        set(state => ({
            notifications: state.notifications.map(n => ({ ...n, isRead: true })),
            unreadCount: 0,
        }));
    },

    setUnreadCount: (count) => set({ unreadCount: count }),
}));