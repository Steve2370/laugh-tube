import {useCallback, useEffect, useState} from 'react';
import videoService from '../services/videoService.js';

export const useVideos = (filters = {}) => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const loadVideos = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await videoService.getVideos(filters);
            setVideos(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        loadVideos();
    }, [loadVideos]);

    const uploadVideo = useCallback(async (file, metadata, onProgress) => {
        try {
            setLoading(true);
            const result = await videoService.uploadVideo(file, metadata, onProgress);
            await loadVideos();
            return { success: true, data: result };
        } catch (err) {
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, [loadVideos]);

    const deleteVideo = useCallback(async (videoId) => {
        try {
            await videoService.deleteVideo(videoId);
            await loadVideos();
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [loadVideos]);

    const getTrending = useCallback(async (options = {}) => {
        try {
            return await videoService.getTrendingVideos(options);
        } catch (err) {
            return { success: false, videos: [] };
        }
    }, []);

    const searchVideos = useCallback(async (query, options = {}) => {
        try {
            return await videoService.searchVideos(query, options);
        } catch (err) {
            return { success: false, videos: [], total: 0 };
        }
    }, []);

    const getUserVideos = useCallback(async (userId) => {
        try {
            setLoading(true);
            setError(null);
            const data = await videoService.getUserVideos(userId);
            setVideos(data);
            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        videos,
        loading,
        error,
        loadVideos,
        uploadVideo,
        deleteVideo,
        getTrending,
        searchVideos,
        getUserVideos,
        reload: loadVideos
    };
};