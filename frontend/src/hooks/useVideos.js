import { useCallback, useEffect, useMemo, useState } from 'react';
import videoService from '../services/videoService.js';

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

    return { videos, loading, error, loadVideos, reload: loadVideos };
};
