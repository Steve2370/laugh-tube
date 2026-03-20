import { useCallback, useEffect, useMemo, useState } from 'react';
import videoService from '../services/videoService.js';
import apiService from "../services/apiService.js";

export const useVideos = (filters = {}) => {
    const [videos, setVideos]   = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState(null);

    const filtersKey = useMemo(() => JSON.stringify(filters ?? {}), [filters]);

    const loadVideos = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const parsedFilters = JSON.parse(filtersKey);
            const params = { limit: 20, ...parsedFilters };
            const data = await videoService.getVideos(params);
            setVideos(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [filtersKey]);

    useEffect(() => { loadVideos(); }, [loadVideos]);

    const getUserVideos = useCallback(async (userId) => {
        if (!userId) return;
        setLoading(true);
        try {
            const data = await apiService.getUserVideos(userId);
            setVideos(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const getTrending = useCallback(
        (opts) => videoService.getTrending(opts),
        []
    );

    const getPopular = useCallback(
        (limit) => videoService.getPopular(limit),
        []
    );

    const searchVideos = useCallback(
        (query, { limit = 20 } = {}) => videoService.searchVideos(query, limit),
        []
    );

    return {
        videos,
        loading,
        error,
        loadVideos,
        reload: loadVideos,
        getUserVideos,
        getTrending,
        getPopular,
        searchVideos,
    };
};