import { useState, useEffect, useCallback } from 'react';
import userService from '../services/userService';

export const useUserProfile = (userId) => {
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState(null);
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadProfile = useCallback(async () => {
        if (!userId) return;

        try {
            setLoading(true);
            setError(null);

            const [profileData, statsData, videosData] = await Promise.all([
                userService.getUserProfile(userId),
                userService.getUserStats(userId),
                userService.getUserVideos(userId)
            ]);

            const raw = profileData.profile || profileData.data || profileData;
            setProfile(normalizeProfile(raw));
            setStats(statsData);
            setVideos(videosData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const normalizeProfile = (p) => {
        if (!p) return null;
        return {
            ...p,
            avatar_url:
                p.avatar_url ?? p.avatar ?? p.avatarUrl ?? p.profile_image ?? null,
            cover_url:
                p.cover_url ?? p.cover ?? p.coverUrl ?? p.banner ?? null,
        };
    };


    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    const updateProfile = useCallback(async (profileData) => {
        try {
            await userService.updateProfile(profileData);
            await loadProfile();
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [loadProfile]);

    const updateBio = useCallback(async (bio) => {
        try {
            await userService.updateBio(bio);
            await loadProfile();
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [loadProfile]);

    const uploadAvatar = useCallback(async (file) => {
        try {
            const result = await userService.uploadAvatar(file);
            await loadProfile();
            return { success: true, data: result };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [loadProfile]);

    const uploadCover = useCallback(async (file) => {
        try {
            const result = await userService.uploadCover(file);
            await loadProfile();
            return { success: true, data: result };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [loadProfile]);

    const subscribe = useCallback(async (creatorId) => {
        try {
            await userService.subscribe(creatorId);
            await loadProfile();
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [loadProfile]);

    const unsubscribe = useCallback(async (creatorId) => {
        try {
            await userService.unsubscribe(creatorId);
            await loadProfile();
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [loadProfile]);

    return {
        profile,
        stats,
        videos,
        loading,
        error,
        updateProfile,
        updateBio,
        uploadAvatar,
        uploadCover,
        subscribe,
        unsubscribe,
        reload: loadProfile
    };
};