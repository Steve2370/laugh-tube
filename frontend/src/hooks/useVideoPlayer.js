import { useState, useEffect, useCallback, useRef } from 'react';
import videoService from '../services/videoService';

export const useVideoPlayer = (videoId) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const videoRef = useRef(null);
    const viewRecordedRef = useRef(false);

    const recordView = useCallback(async (watchTime, percentage) => {
        if (viewRecordedRef.current) return;

        try {
            await videoService.recordView(videoId, {
                watchTime,
                watchPercentage: percentage,
                completed: percentage >= 0.95
            });

            if (percentage >= 0.1) {
                viewRecordedRef.current = true;
            }
        } catch (error) {
            console.error('Erreur enregistrement vue:', error);
        }
    }, [videoId]);

    const handleTimeUpdate = useCallback(() => {
        if (!videoRef.current) return;

        const current = videoRef.current.currentTime;
        const total = videoRef.current.duration || 1;
        const percentage = current / total;

        setCurrentTime(current);

        if (percentage >= 0.1 && !viewRecordedRef.current) {
            recordView(Math.floor(current * 1000), percentage);
        }
    }, [recordView]);

    const play = useCallback(() => {
        videoRef.current?.play();
        setIsPlaying(true);
    }, []);

    const pause = useCallback(() => {
        videoRef.current?.pause();
        setIsPlaying(false);
    }, []);

    const togglePlay = useCallback(() => {
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    }, [isPlaying, play, pause]);

    const seek = useCallback((time) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        }
    }, []);

    const changeVolume = useCallback((vol) => {
        if (videoRef.current) {
            videoRef.current.volume = vol;
            setVolume(vol);
            setIsMuted(vol === 0);
        }
    }, []);

    const toggleMute = useCallback(() => {
        if (videoRef.current) {
            const newMuted = !isMuted;
            videoRef.current.muted = newMuted;
            setIsMuted(newMuted);
        }
    }, [isMuted]);

    const toggleFullscreen = useCallback(() => {
        if (!videoRef.current) return;

        if (!document.fullscreenElement) {
            videoRef.current.requestFullscreen?.();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.();
            setIsFullscreen(false);
        }
    }, []);

    const forward = useCallback((seconds = 10) => {
        if (videoRef.current) {
            videoRef.current.currentTime = Math.min(
                videoRef.current.currentTime + seconds,
                duration
            );
        }
    }, [duration]);

    const rewind = useCallback((seconds = 10) => {
        if (videoRef.current) {
            videoRef.current.currentTime = Math.max(
                videoRef.current.currentTime - seconds,
                0
            );
        }
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoadedMetadata = () => {
            setDuration(video.duration);
        };

        const handleEnded = () => {
            setIsPlaying(false);
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('ended', handleEnded);

        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('ended', handleEnded);
        };
    }, [handleTimeUpdate]);

    return {
        videoRef,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        isFullscreen,
        play,
        pause,
        togglePlay,
        seek,
        changeVolume,
        toggleMute,
        toggleFullscreen,
        forward,
        rewind,
        progress: duration ? (currentTime / duration) * 100 : 0
    };
};