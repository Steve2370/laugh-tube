import { useState, useEffect, useRef } from 'react';
import { X, ExternalLink, Volume2, VolumeX } from 'lucide-react';

const AdPlayer = ({ onComplete }) => {
    const [ad, setAd] = useState(null);
    const [countdown, setCountdown] = useState(null);
    const [canSkip, setCanSkip] = useState(false);
    const [muted, setMuted] = useState(false);
    const [progress, setProgress] = useState(0);
    const videoRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => {
        fetch('/api/v2/ads/random')
            .then(r => r.json())
            .then(data => {
                if (data.ad) {
                    setAd(data.ad);
                    setCountdown(data.ad.skip_after_seconds);
                } else {
                    onComplete();
                }
            })
            .catch(() => onComplete());
    }, []);

    useEffect(() => {
        if (!ad) return;
        if (countdown > 0) {
            timerRef.current = setTimeout(() => setCountdown(c => c - 1), 1000);
        } else {
            setCanSkip(true);
        }
        return () => clearTimeout(timerRef.current);
    }, [countdown, ad]);

    const handleSkip = () => {
        if (canSkip) onComplete();
    };

    const handleClick = () => {
        if (!ad) return;
        fetch(`/api/v2/ads/${ad.id}/click`, { method: 'POST' });
        window.open(ad.redirect_url, '_blank');
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
            setProgress(p || 0);
        }
    };

    if (!ad) return null;

    return (
        <div className="relative w-full aspect-video bg-black flex flex-col overflow-hidden rounded-2xl">
        {/* Vidéo */}
            <div className="relative flex-1 cursor-pointer" onClick={handleClick}>
                <video
                    ref={videoRef}
                    src={ad.video_url}
                    autoPlay
                    muted={muted}
                    playsInline
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={onComplete}
                    className="w-full h-full object-contain"
                />

                {/* Barre de progression */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                    <div className="h-full bg-yellow-400 transition-all" style={{ width: `${progress}%` }} />
                </div>

                {/* Info annonceur */}
                <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-full flex items-center gap-2">
                    <span className="text-white text-xs font-semibold">Annonce</span>
                    <span className="text-gray-300 text-xs">{ad.advertiser_name}</span>
                </div>

                <button
                    onClick={handleClick}
                    className="absolute bottom-6 left-4 bg-white text-black px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-100"
                >
                    <ExternalLink size={14} />
                    Visiter le site
                </button>

                <button
                    onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}
                    className="absolute bottom-6 right-4 bg-black/60 p-2 rounded-full text-white"
                >
                    {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
            </div>

            <div className="absolute top-4 right-4">
                {canSkip ? (
                    <button
                        onClick={handleSkip}
                        className="bg-black/80 border border-white/30 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-white/20"
                    >
                        Ignorer <X size={14} />
                    </button>
                ) : (
                    <div className="bg-black/80 border border-white/30 text-white px-4 py-2 rounded-lg text-sm">
                        Ignorer dans {countdown}s
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdPlayer;