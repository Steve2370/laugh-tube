import { useEffect, useState, useCallback } from 'react';
import userService from '../services/userService.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function useAbonnement(targetUserId) {
    const { isAuthenticated } = useAuth();
    const [loading, setLoading] = useState(true);
    const [subscribersCount, setSubscribersCount] = useState(0);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [error, setError] = useState(null);

    const refresh = useCallback(async () => {
        if (!targetUserId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const statsData = await userService.getUserStats(targetUserId);
            const count = statsData?.subscribers_count || 0;
            setSubscribersCount(count);

            if (isAuthenticated) {
                const subscribed = await userService.isSubscribed(targetUserId);
                setIsSubscribed(subscribed);
            } else {
                setIsSubscribed(false);
            }
        } catch (err) {
            setError(err.message);
            setSubscribersCount(0);
            setIsSubscribed(false);
        } finally {
            setLoading(false);
        }
    }, [targetUserId, isAuthenticated]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const toggle = useCallback(async () => {
        if (!isAuthenticated) {
            throw new Error('AUTH_REQUIRED');
        }

        if (!targetUserId) {
            return;
        }

        try {
            if (isSubscribed) {
                await userService.unsubscribe(targetUserId);
                setIsSubscribed(false);
                setSubscribersCount(prev => Math.max(0, prev - 1));
            } else {
                await userService.subscribe(targetUserId);
                setIsSubscribed(true);
                setSubscribersCount(prev => prev + 1);
            }
        } catch (err) {
            await refresh();
            throw err;
        }
    }, [isAuthenticated, targetUserId, isSubscribed, refresh]);

    const getSubscribers = useCallback(async (options = {}) => {
        try {
            return await userService.getSubscribers(targetUserId, options);
        } catch (err) {
            return { success: false, subscribers: [], total: 0 };
        }
    }, [targetUserId]);

    const getSubscriptions = useCallback(async (options = {}) => {
        try {
            return await userService.getSubscriptions(targetUserId, options);
        } catch (err) {
            return { success: false, subscriptions: [], total: 0 };
        }
    }, [targetUserId]);

    return {
        loading,
        subscribersCount,
        isSubscribed,
        toggle,
        error,
        getSubscribers,
        getSubscriptions,
        refresh
    };
}