import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';

const VideoPlayer = ({
    src,
    poster,
    onPlay,
    onTimeUpdate,
    onEnded,
    onError,
    onLoadedMetadata,
    autoPlay = true,
    className = ""
}) => {
    const videoRef = useRef(null);
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

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoadStart = () => {
            setIsLoading(true);
            setHasError(false);
        };

        const handleLoadedMetadata = () => {
            setDuration(video.duration);
            setIsLoading(false);
            if (onLoadedMetadata) onLoadedMetadata();
        };

        const handleCanPlay = () => {
            setIsLoading(false);
            if (autoPlay) {
                video.play().catch(err => {
                    console.warn('AutoPlay bloqué:', err);
                });
            }
        };

        const handleError = (e) => {
            setIsLoading(false);
            setHasError(true);

            const error = video.error;
            let message = 'Erreur lors du chargement de la vidéo';

            if (error) {
                switch (error.code) {
                    case 1:
                        message = 'Chargement annulé';
                        break;
                    case 2:
                        message = 'Erreur réseau lors du chargement';
                        break;
                    case 3:
                        message = 'Erreur de décodage de la vidéo';
                        break;
                    case 4:
                        message = 'Format vidéo non supporté';
                        break;
                    default:
                        message = 'Erreur inconnue';
                }
            }

            setErrorMessage(message);
            if (onError) onError(e);
        };

        const handleWaiting = () => {
            setIsLoading(true);
        };

        const handlePlaying = () => {
            setIsLoading(false);
        };

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
    }, [src, autoPlay, onLoadedMetadata, onError]);

    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;

        if (video.paused) {
            video.play();
            setIsPlaying(true);
            if (onPlay) onPlay();
        } else {
            video.pause();
            setIsPlaying(false);
        }
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

    if (hasError) {
        if (!src) {
            return (
                <div className="aspect-video bg-black flex items-center justify-center text-white">
                    Vidéo indisponible
                </div>
            );
        }

        return (
            <div className="relative bg-black rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
                <div className="text-center text-white p-8">
                    <h3 className="text-xl font-semibold mb-2">Erreur de lecture</h3>
                    <p className="text-gray-300 mb-4">{errorMessage}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
                    >
                        Recharger la page
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`relative bg-black rounded-2xl overflow-hidden ${className}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
        >
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-20 bg-black bg-opacity-50">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent"></div>
                </div>
            )}

            <video
                ref={videoRef}
                className="w-full aspect-video"
                src={src}
                poster={poster}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => {
                    setIsPlaying(false);
                    if (onEnded) onEnded();
                }}
                playsInline
                preload="metadata"
            >
                Votre navigateur ne supporte pas la lecture de vidéos.
            </video>

            <div
                className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 transition-opacity duration-300 ${
                    showControls ? 'opacity-100' : 'opacity-0'
                }`}
            >
                <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer mb-4"
                    style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #4b5563 ${(currentTime / duration) * 100}%, #4b5563 100%)`
                    }}
                />

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={togglePlay}
                            className="text-white hover:text-blue-400 transition"
                        >
                            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                        </button>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleMute}
                                className="text-white hover:text-blue-400 transition"
                            >
                                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={volume}
                                onChange={handleVolumeChange}
                                className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        <span className="text-white text-sm">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleFullscreen}
                            className="text-white hover:text-blue-400 transition"
                        >
                            <Maximize size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {!isPlaying && !isLoading && (
                <button
                    onClick={togglePlay}
                    className="absolute inset-0 m-auto w-20 h-20 bg-blue-600 bg-opacity-80 hover:bg-opacity-100 rounded-full flex items-center justify-center transition z-10"
                >
                    <Play size={32} className="text-white ml-1" />
                </button>
            )}
        </div>
    );
};

export default VideoPlayer;