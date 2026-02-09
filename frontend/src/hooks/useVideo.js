import { useState, useEffect, useCallback } from 'react';
import videoService from '../services/videoService';
import apiService from '../services/apiService';

export const useVideo = (videoId) => {
    const [video, setVideo] = useState(null);
    const [comments, setComments] = useState([]);
    const [reactions, setReactions] = useState({ likes: 0, dislikes: 0, userReaction: null });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadVideo = useCallback(async () => {
        if (!videoId) return;

        try {
            setLoading(true);
            setError(null);

            const [videoData, commentsData, reactionsData] = await Promise.all([
                videoService.getVideo(videoId),
                videoService.getComments(videoId),
                videoService.getReactions(videoId)
            ]);

            setVideo(videoData.video || videoData);
            setComments(commentsData.comments || []);
            setReactions(reactionsData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [videoId]);

    useEffect(() => {
        loadVideo();
    }, [loadVideo]);

    const likeVideo = useCallback(async () => {
        try {
            await videoService.likeVideo(videoId);
            await loadVideo();
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [videoId, loadVideo]);

    const dislikeVideo = useCallback(async () => {
        try {
            await videoService.dislikeVideo(videoId);
            await loadVideo();
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [videoId, loadVideo]);

    const postComment = useCallback(async (content) => {
        try {
            await videoService.postComment(videoId, content);
            await loadVideo();
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [videoId, loadVideo]);

    const recordView = useCallback(async (watchData) => {
        try {
            await videoService.recordView(videoId, watchData);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [videoId]);

    const updateMetadata = useCallback(async (metadata) => {
        try {
            await videoService.updateVideo(videoId, metadata);
            await loadVideo();
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [videoId, loadVideo]);

    const deleteVideo = useCallback(async () => {
        try {
            await videoService.deleteVideo(videoId);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [videoId]);

    return {
        video,
        comments,
        reactions,
        loading,
        error,
        likeVideo,
        dislikeVideo,
        postComment,
        recordView,
        updateMetadata,
        deleteVideo,
        reload: loadVideo
    };
};