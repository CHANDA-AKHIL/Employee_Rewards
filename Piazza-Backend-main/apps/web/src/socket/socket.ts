import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';

const SOCKET_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:3000';

let socket: Socket | null = null;

export const initSocket = () => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    if (socket) {
        socket.disconnect();
    }

    socket = io(SOCKET_URL, {
        auth: { token },
    });

    socket.on('connect', () => {
        console.log('Socket connected:', socket?.id);
    });

    socket.on('notification:new', (notification) => {
        useNotificationStore.getState().addNotification(notification);
        // Optional: show a toast here if needed
    });

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export const getSocket = () => socket;
