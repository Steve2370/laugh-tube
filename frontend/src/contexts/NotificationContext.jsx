import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext(null);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within an NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const addNotification = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now() + Math.random();
        const notification = { id, message, type };

        setNotifications(prev => [...prev, notification]);

        if (duration > 0) {
            setTimeout(() => {
                removeNotification(id);
            }, duration);
        }

        return id;
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    const success = useCallback((message, duration) => {
        return addNotification(message, 'success', duration);
    }, [addNotification]);

    const info = useCallback((message, duration) => {
        return addNotification(message, 'info', duration);
    }, [addNotification]);

    const warning = useCallback((message, duration) => {
        return addNotification(message, 'warning', duration);
    }, [addNotification]);

    const value = {
        notifications,
        addNotification,
        removeNotification,
        clearNotifications,
        success,
        info,
        warning
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};