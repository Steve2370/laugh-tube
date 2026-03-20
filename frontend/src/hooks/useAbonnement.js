import { useEffect, useState, useCallback, useRef } from 'react';
import apiService from '../services/apiService.js';
import { useAuth } from '../contexts/AuthContext';

export function useAbonnement(targetUserId) {
    const { isAuthenticated, user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [subscribersCount, setSubscribersCount] = useState(0);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [error, setError] = useState(null);

    const userIdRef = useRef(user?.id);
    const isAuthRef = useRef(isAuthenticated);

    useEffect(() => {
        userIdRef.current = user?.id;
        isAuthRef.current = isAuthenticated;
    }, [user?.id, isAuthenticated]);

    const refresh = useCallback(async () => {
        if (!targetUserId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const countResponse = await apiService.request(`/users/${targetUserId}/subscribers-count`);
            setSubscribersCount(countResponse.count ?? countResponse.subscribers_count ?? 0);

            if (isAuthRef.current && userIdRef.current) {
                const statusResponse = await apiService.request(`/users/${targetUserId}/subscribe-status`);
                setIsSubscribed(!!statusResponse.is_subscribed);
            } else {
                setIsSubscribed(false);
            }
        } catch (err) {
            console.error('Error fetching subscription data:', err);
            setError(err?.message || 'Erreur');
            setSubscribersCount(0);
            setIsSubscribed(false);
        } finally {
            setLoading(false);
        }
    }, [targetUserId]);

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
        if (targetUserId) {
            refresh();
        }
    }, [targetUserId]);

    return { loading, subscribersCount, isSubscribed, error, toggle, refresh };
}

export default useAbonnement;