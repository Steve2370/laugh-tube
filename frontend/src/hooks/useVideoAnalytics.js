import { useState, useEffect, useCallback } from 'react';
import videoService from '../services/videoService';

export const useVideoAnalytics = (videoId, period = '7d') => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const loadAnalytics = useCallback(async () => {
        if (!videoId) return;

        try {
            setLoading(true);
            setError(null);
            const result = await videoService.getAnalytics(videoId, period);
            setAnalytics(result.analytics || result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [videoId, period]);

    useEffect(() => {
        loadAnalytics();
    }, [loadAnalytics]);

    const changePeriod = useCallback((newPeriod) => {
        return loadAnalytics();
    }, [loadAnalytics]);

    return {
        analytics,
        loading,
        error,
        changePeriod,
        reload: loadAnalytics
    };
};