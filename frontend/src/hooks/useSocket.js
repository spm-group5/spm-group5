import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useNotifications } from './useNotifications';
import { useAuth } from '../context/AuthContext';

export function useSocket() {
    const { addNotification } = useNotifications();
    const { user } = useAuth();
    const socketRef = useRef(null);

    useEffect(() => {
        if (!user) {
            return;
        }

        const userId = user.user?.id;

        if (!userId) {
            return;
        }


        // Create socket connection
        socketRef.current = io('http://localhost:3000', {
            withCredentials: true
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
            socket.emit('user-authenticate', userId);
        });

        socket.on('connect_error', (error) => {
            console.error('❌ Socket connection error:', error);
        });

        socket.on('task-assigned', (data) => {
            addNotification(data.message, 'success', 7000);
        });

        socket.on('task-unassigned', (data) => {
            addNotification(data.message, 'info', 7000);
        });

        socket.on('task-updated', (data) => {
            addNotification(data.message, 'info', 5000);
        });

        return () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }
        };
    }, [user, addNotification]);

    return socketRef.current;
}