import { useCallback, useEffect, useMemo, useState } from 'react';
import videoService from '../services/videoService.js';
import apiService from "../services/apiService.js";

export const useVideos = (filters = {}) => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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

    useEffect(() => {
        loadVideos();
    }, [loadVideos]);

    const getUserVideos = async (userId) => {
        setLoading(true);
        try {
            const data = await apiService.getUserVideos(userId);
            setVideos(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return { videos, loading, error, loadVideos, reload: loadVideos, getUserVideos };
};
