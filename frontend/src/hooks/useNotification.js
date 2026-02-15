import { useState, useEffect, useCallback } from 'react';
import notificationService from '../services/notificationService';

export const useNotifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const loadNotifications = useCallback(async (limit = 20, offset = 0) => {
        try {
            setLoading(true);
            setError(null);
            const result = await notificationService.getNotifications(limit, offset);
            setNotifications(result.notifications);
            setUnreadCount(result.unreadCount);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadNotifications();

        const unsubscribe = notificationService.addListener((event) => {
            if (event.event === 'update') {
                setNotifications(event.data.notifications);
                setUnreadCount(event.data.unreadCount);
            }
        });

        // notificationService.startPolling((notifications, unreadCount) => {
        //     setNotifications(notifications);
        //     setUnreadCount(unreadCount);
        // });

        return () => {
            unsubscribe();
            notificationService.stopPolling();
        };
    }, [loadNotifications]);

    const markAsRead = useCallback(async (notificationId) => {
        try {
            const result = await notificationService.markAsRead(notificationId);
            if (result.success) {
                await loadNotifications();
            }
            return result;
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [loadNotifications]);

    const markAllAsRead = useCallback(async () => {
        try {
            const result = await notificationService.markAllAsRead();
            if (result.success) {
                await loadNotifications();
            }
            return result;
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [loadNotifications]);

    const deleteNotification = useCallback(async (notificationId) => {
        try {
            const result = await notificationService.deleteNotification(notificationId);
            if (result.success) {
                await loadNotifications();
            }
            return result;
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [loadNotifications]);

    const deleteAllRead = useCallback(async () => {
        try {
            const result = await notificationService.deleteAllRead();
            if (result.success) {
                await loadNotifications();
            }
            return result;
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [loadNotifications]);

    return {
        notifications,
        unreadCount,
        loading,
        error,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllRead,
        reload: loadNotifications
    };
};