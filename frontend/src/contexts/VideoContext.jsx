import React, { createContext, useContext, useState, useCallback } from "react";
import videoService from "../services/videoService.js";

const VideoContext = createContext(null);

export const useVideoContext = () => {
    const context = useContext(VideoContext);
    if (!context) {
        throw new Error('useVideoContext must be used within a VideoProvider');
    }
    return context;
};

export const VideoProvider = ({ children }) => {
    const [videos, setVideos] = useState([]);
    const [currentVideo, setCurrentVideo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const normalizeVideosResponse = useCallback((payload) => {
        if (Array.isArray(payload)) return payload;

        if (Array.isArray(payload?.videos)) return payload.videos;

        if (Array.isArray(payload?.data)) return payload.data;

        if (Array.isArray(payload?.data?.videos)) return payload.data.videos;

        console.warn('Format de réponse inattendu:', payload);
        return [];
    }, []);

    const normalizeVideoResponse = useCallback((payload) => {
        return payload?.data ?? payload;
    }, []);

    const loadVideos = useCallback(async (filters = {}) => {
        try {
            setLoading(true);
            console.log('VideoContext.loadVideos - Début');

            const response = await videoService.getVideos(filters);
            const videosList = normalizeVideosResponse(response);

            console.log('VideoContext.loadVideos - Succès:', videosList.length, 'vidéos');
            setVideos(videosList);

            return {
                success: true,
                data: videosList
            };

        } catch (error) {
            console.error('VideoContext.loadVideos - Erreur:', error);

            const errorMessage =
                error?.message ||
                error?.response?.data?.message ||
                'Erreur lors du chargement des vidéos';

            return {
                success: false,
                error: errorMessage
            };

        } finally {
            setLoading(false);
        }
    }, [normalizeVideosResponse]);

    const loadVideo = useCallback(async (id) => {
        try {
            setLoading(true);
            console.log('VideoContext.loadVideo - ID:', id);

            const response = await videoService.getVideo(id);
            const video = normalizeVideoResponse(response);

            console.log('VideoContext.loadVideo - Succès:', video);
            setCurrentVideo(video);

            return {
                success: true,
                data: video
            };

        } catch (error) {
            console.error('VideoContext.loadVideo - Erreur:', error);

            return {
                success: false,
                error: error?.message || 'Vidéo introuvable'
            };

        } finally {
            setLoading(false);
        }
    }, [normalizeVideoResponse]);

    const uploadVideo = useCallback(async (file, metadata) => {
        try {
            setLoading(true);
            setUploadProgress(0);

            console.log('VideoContext.uploadVideo - Début:', {
                fileName: file?.name,
                metadata
            });

            const onProgress = (progressEvent) => {
                const progress = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                );
                console.log('Upload progress:', progress, '%');
                setUploadProgress(progress);
            };

            const response = await videoService.uploadVideo(
                file,
                metadata,
                onProgress
            );

            console.log('VideoContext.uploadVideo - Succès:', response);
            setUploadProgress(100);

            await loadVideos();

            return {
                success: true,
                data: response
            };

        } catch (error) {
            console.error('VideoContext.uploadVideo - Erreur:', error);

            return {
                success: false,
                error: error?.message || 'Erreur lors de l\'upload'
            };

        } finally {
            setLoading(false);
            setTimeout(() => setUploadProgress(0), 1000);
        }
    }, [loadVideos]);

    const deleteVideo = useCallback(async (id) => {
        try {
            console.log('VideoContext.deleteVideo - ID:', id);

            await videoService.deleteVideo(id);

            setVideos(prev => prev.filter(v => v.id !== id));

            if (currentVideo?.id === id) {
                setCurrentVideo(null);
            }

            console.log('VideoContext.deleteVideo - Succès');

            return { success: true };

        } catch (error) {
            console.error('VideoContext.deleteVideo - Erreur:', error);

            return {
                success: false,
                error: error?.message || 'Erreur lors de la suppression'
            };
        }
    }, [currentVideo]);

    const contextValue = {
        videos,
        currentVideo,
        loading,
        uploadProgress,

        loadVideos,
        loadVideo,
        uploadVideo,
        deleteVideo,
        setCurrentVideo,
    };

    return (
        <VideoContext.Provider value={contextValue}>
            {children}
        </VideoContext.Provider>
    );
};