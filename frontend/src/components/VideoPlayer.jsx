import React, { useRef, useEffect, useState, useCallback } from 'react';
import apiService from '../services/apiService.js';
import AdPlayer from './AdPlayer.jsx';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipForward, X } from 'lucide-react';

const AUTOPLAY_DELAY = 8;

const VideoPlayer = ({
    src,
    poster,
    videoId = null,
    onPlay,
    onTimeUpdate,
    onEnded,
    onViewRecorded,
    onError,
    onLoadedMetadata,
    autoPlay = true,
    className = "",
    nextVideo = null,
    onNextVideo = null,
}) => {
    const videoRef = useRef(null);
    const viewedRef = useRef(false);
    const countdownRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [countdown, setCountdown] = useState(null);

    const getShowAd = () => {
        const count = parseInt(localStorage.getItem('video_count') || '0') + 1;
        localStorage.setItem('video_count', count.toString());
        return count % 5 === 1;
    };
    const [showAd, setShowAd] = useState(() => getShowAd());
    const [adDone, setAdDone] = useState(false);

    const cancelCountdown = useCallback(() => {
        clearInterval(countdownRef.current);
        setCountdown(null);
    }, []);

    const startCountdown = useCallback(() => {
        if (!nextVideo || !onNextVideo) return;
        setCountdown(AUTOPLAY_DELAY);
        let remaining = AUTOPLAY_DELAY;
        countdownRef.current = setInterval(() => {
            remaining -= 1;
            setCountdown(remaining);
            if (remaining <= 0) {
                clearInterval(countdownRef.current);
                setCountdown(null);
                onNextVideo(nextVideo);
            }
        }, 1000);
    }, [nextVideo, onNextVideo]);

    useEffect(() => {
        return () => clearInterval(countdownRef.current);
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoadStart = () => { setIsLoading(true); setHasError(false); };
        const handleLoadedMetadata = () => {
            setDuration(video.duration);
            setIsLoading(false);
            if (onLoadedMetadata) onLoadedMetadata();
        };
        const handleCanPlay = () => {
            setIsLoading(false);
            if (autoPlay) video.play().catch(err => console.warn('AutoPlay bloqué:', err));
        };
        const handleError = (e) => {
            setIsLoading(false);
            setHasError(true);
            const error = video.error;
            let message = 'Erreur lors du chargement de la vidéo';
            if (error) {
                switch (error.code) {
                    case 1: message = 'Chargement annulé'; break;
                    case 2: message = 'Erreur réseau lors du chargement'; break;
                    case 3: message = 'Erreur de décodage de la vidéo'; break;
                    case 4: message = 'Format vidéo non supporté'; break;
                    default: message = 'Erreur inconnue';
                }
            }
            setErrorMessage(message);
            if (onError) onError(e);
        };
        const handleWaiting = () => setIsLoading(true);
        const handlePlaying = () => setIsLoading(false);

        video.addEventListener('loadstart', handleLoadStart);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('error', handleError);
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('playing', handlePlaying);

        return () => {
            video.removeEventListener('loadstart', handleLoadStart);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('error', handleError);
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('playing', handlePlaying);
        };
    }, [src, autoPlay, onLoadedMetadata, onError, adDone]);

    const togglePlay = async () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            try {
                await video.play();
                setIsPlaying(true);
                onPlay?.();
                cancelCountdown();
            } catch (e) { console.warn("play failed:", e); }
        } else {
            video.pause();
            setIsPlaying(false);
        }
    };

    const sendViewStartOnce = async () => {
        if (!videoId) return;
        const tokenPayload = apiService.decodeToken(localStorage.getItem('access_token'));
        const userId = tokenPayload?.sub ?? tokenPayload?.user_id ?? null;
        const sessionId = apiService.getOrCreateSessionId();
        if (viewedRef.current) return;
        if (apiService.hasViewedVideo(videoId, userId)) return;
        viewedRef.current = true;
        apiService.markVideoAsViewed(videoId, userId);
        try {
            const res = await apiService.recordView(videoId, {
                user_id: userId, session_id: sessionId,
                watch_time: 0, watch_percentage: 0, completed: false,
            });
            const ok = res?.success === true || res?.message != null;
            if (ok && !res?.alreadyViewed) onViewRecorded?.();
        } catch (e) { viewedRef.current = false; }
    };

    const toggleMute = () => {
        const video = videoRef.current;
        if (!video) return;
        video.muted = !video.muted;
        setIsMuted(video.muted);
    };

    const handleVolumeChange = (e) => {
        const video = videoRef.current;
        if (!video) return;
        const newVolume = parseFloat(e.target.value);
        video.volume = newVolume;
        setVolume(newVolume);
        setIsMuted(newVolume === 0);
    };

    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (!video) return;
        setCurrentTime(video.currentTime);
        if (onTimeUpdate) onTimeUpdate();
    };

    const handleSeek = (e) => {
        const video = videoRef.current;
        if (!video) return;
        const seekTime = parseFloat(e.target.value);
        video.currentTime = seekTime;
        setCurrentTime(seekTime);
    };

    const toggleFullscreen = () => {
        const video = videoRef.current;
        if (!video) return;
        if (!document.fullscreenElement) {
            video.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const formatTime = (seconds) => {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    let hideControlsTimeout;
    const handleMouseMove = () => {
        setShowControls(true);
        clearTimeout(hideControlsTimeout);
        hideControlsTimeout = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 3000);
    };

    const handleVideoEnded = () => {
        setIsPlaying(false);
        if (videoId && viewedRef.current) {
            const tokenPayload = apiService.decodeToken(localStorage.getItem('access_token'));
            const userId = tokenPayload?.sub ?? tokenPayload?.user_id ?? null;
            const sessionId = apiService.getOrCreateSessionId();
            const vid = videoRef.current;
            const watchedSec = vid ? Math.floor(vid.currentTime) : 0;
            const pct = vid && vid.duration > 0 ? Math.round((vid.currentTime / vid.duration) * 100) : 100;
            apiService.recordView(videoId, {
                user_id: userId, session_id: sessionId,
                watch_time: watchedSec, watch_percentage: pct, completed: true,
            }).then(() => apiService.markVideoAsViewed(videoId, userId)).catch(() => {});
        }
        onEnded?.();
        startCountdown();
    };

    if (hasError) {
        if (!src) return <div className="aspect-video bg-black flex items-center justify-center text-white">Vidéo indisponible</div>;
        return (
            <div className="relative bg-black rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
                <div className="text-center text-white p-8">
                    <h3 className="text-xl font-semibold mb-2">Erreur de lecture</h3>
                    <p className="text-gray-300 mb-4">{errorMessage}</p>
                </div>
            </div>
        );
    }

    if (showAd) {
        return <AdPlayer onComplete={() => {
            setShowAd(false);
            setAdDone(true);
            setTimeout(() => {
                const video = videoRef.current;
                if (video) { video.load(); video.play().catch(() => {}); }
            }, 100);
        }} />;
    }

    return (
        <div
            className={`relative bg-black rounded-2xl overflow-hidden ${className}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
        >
            <style>{`
                @keyframes playPulse {
                    0%,100% { transform:scale(1); box-shadow:0 0 0 0 rgba(59,130,246,0.5); }
                    50%     { transform:scale(1.08); box-shadow:0 0 0 12px rgba(59,130,246,0); }
                }
                @keyframes countdownShrink {
                    from { stroke-dashoffset: 0; }
                    to   { stroke-dashoffset: 100; }
                }
                .play-pulse-btn { animation: playPulse 1.8s ease-in-out infinite; }
            `}</style>

            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-20 bg-black bg-opacity-50">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent"></div>
                </div>
            )}

            <video
                key={adDone ? 'after-ad' : 'normal'}
                ref={videoRef}
                className="w-full aspect-video"
                src={src}
                poster={poster}
                playsInline
                onPlaying={() => { setIsPlaying(true); sendViewStartOnce(); }}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleVideoEnded}
                preload="metadata"
            >
                Votre navigateur ne supporte pas la lecture de vidéos.
            </video>

            {countdown !== null && nextVideo && (
                <div className="absolute inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-30 rounded-2xl">
                    <div className="text-center text-white max-w-xs px-6">
                        {nextVideo.thumbnail && (
                            <img
                                src={`/uploads/thumbnails/${nextVideo.thumbnail}`}
                                alt={nextVideo.title}
                                className="w-40 h-24 object-cover rounded-xl mx-auto mb-4 opacity-90"
                            />
                        )}
                        <p className="text-gray-400 text-sm mb-1">Prochaine vidéo</p>
                        <p className="text-white font-semibold text-base mb-4 line-clamp-2">{nextVideo.title}</p>

                        {/* Cercle compte à rebours */}
                        <div className="relative w-16 h-16 mx-auto mb-5">
                            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#374151" strokeWidth="2.5" />
                                <circle
                                    cx="18" cy="18" r="15.9" fill="none"
                                    stroke="#3b82f6" strokeWidth="2.5"
                                    strokeDasharray="100"
                                    strokeDashoffset={100 - (countdown / AUTOPLAY_DELAY) * 100}
                                    strokeLinecap="round"
                                    style={{ transition: 'stroke-dashoffset 0.9s linear' }}
                                />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg">
                                {countdown}
                            </span>
                        </div>

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={cancelCountdown}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition-colors"
                            >
                                <X size={16} /> Annuler
                            </button>
                            <button
                                onClick={() => { cancelCountdown(); onNextVideo(nextVideo); }}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                            >
                                <SkipForward size={16} /> Suivante
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                <input
                    type="range" min="0" max={duration || 0} value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer mb-4"
                    style={{ background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #4b5563 ${(currentTime / duration) * 100}%, #4b5563 100%)` }}
                />
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={togglePlay} className="text-white hover:text-blue-400 transition-all hover:scale-110 active:scale-90">
                            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                        </button>
                        <div className="flex items-center gap-2">
                            <button onClick={toggleMute} className="text-white hover:text-blue-400 transition-all hover:scale-110 active:scale-90">
                                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                            <input type="range" min="0" max="1" step="0.1" value={volume}
                                   onChange={handleVolumeChange}
                                   className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
                        </div>
                        <span className="text-white text-sm">{formatTime(currentTime)} / {formatTime(duration)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={toggleFullscreen} className="text-white hover:text-blue-400 transition-all hover:scale-110 active:scale-90">
                            <Maximize size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {!isPlaying && !isLoading && countdown === null && (
                <button
                    onClick={togglePlay}
                    className="absolute inset-0 m-auto w-20 h-20 bg-blue-600 bg-opacity-80 hover:bg-opacity-100 rounded-full flex items-center justify-center transition-all z-10 play-pulse-btn"
                >
                    <Play size={32} className="text-white ml-1" />
                </button>
            )}
        </div>
    );
};

export default VideoPlayer;