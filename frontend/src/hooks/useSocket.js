import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useNotifications } from './useNotifications';
import { useAuth } from '../context/AuthContext';

export function useSocket() {
    const { addNotification } = useNotifications();
    const { user } = useAuth();
    const socketRef = useRef(null);

    const stableAddNotification = useCallback(addNotification, [addNotification]);

    useEffect(() => {

        
        if (!user) {
            return;
        }

        const userId = user.id;


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
            console.error('Socket connection error:', error);
        });

        socket.on('task-assigned', (data) => {
            stableAddNotification(data.message, 'success', 7000);
        });

        socket.on('task-unassigned', (data) => {
            stableAddNotification(data.message, 'info', 7000);
        });

        socket.on('task-updated', (data) => {
            stableAddNotification(data.message, 'info', 5000);
        });

        socket.on('task-comment', (data) => {
            console.log('🔔 Received task-comment event:', data);
            stableAddNotification(data.message, 'info', 5000);
        });

        socket.on('task-archived', (data) => {
            console.log('🔔 Received task-archived event:', data);
            stableAddNotification(data.message, 'warning', 5000);
        });

        socket.on('task-created', (data) => {
            stableAddNotification(data.message, 'success', 5000);
        });

        return () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }
        };
    }, [user, stableAddNotification]);

    return socketRef.current;
}