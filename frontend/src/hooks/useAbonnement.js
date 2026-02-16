import { useEffect, useState, useCallback } from 'react';
import apiService from '../services/apiService.js';
import { useAuth } from '../contexts/AuthContext';

export function useAbonnement(targetUserId) {
    const { isAuthenticated, user } = useAuth();

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
            const countResponse = await apiService.request(`/users/${targetUserId}/subscribers-count`);
            setSubscribersCount(countResponse.subscribers_count || 0);

            if (isAuthenticated && user?.id) {
                const statusResponse = await apiService.request(`/users/${targetUserId}/subscribe-status`);
                setIsSubscribed(!!statusResponse.is_subscribed);
            } else {
                setIsSubscribed(false);
            }
        } catch (err) {
            setError(err?.message || 'Erreur');
            setSubscribersCount(0);
            setIsSubscribed(false);
        } finally {
            setLoading(false);
        }
    }, [targetUserId, isAuthenticated, user?.id]);

    const toggle = useCallback(async () => {
        if (!isAuthenticated) throw new Error('AUTH_REQUIRED');

        try {
            if (isSubscribed) {
                await apiService.request(`/users/${targetUserId}/unsubscribe`, { method: 'DELETE' });
                setIsSubscribed(false);
                setSubscribersCount((prev) => Math.max(0, prev - 1));
            } else {
                await apiService.request(`/users/${targetUserId}/subscribe`, { method: 'POST' });
                setIsSubscribed(true);
                setSubscribersCount((prev) => prev + 1);
            }
        } catch (err) {
            await refresh();
            throw err;
        }
    }, [isAuthenticated, isSubscribed, targetUserId, refresh]);

    useEffect(() => {
        refresh();
    }, [targetUserId, isAuthenticated, user?.id, refresh]);

    return { loading, subscribersCount, isSubscribed, error, toggle, refresh };
}

export default useAbonnement;
