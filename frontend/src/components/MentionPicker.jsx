import React, { useState, useEffect, useRef } from 'react';
import apiService from '../services/apiService';

const MentionPicker = ({ onSelect, onClose }) => {
    const [subscribers, setSubscribers] = useState([]);
    const [loading, setLoading] = useState(true);
    const ref = useRef(null);

    useEffect(() => {
        apiService.requestV2('/users/me/subscribers')
            .then(r => setSubscribers(r.subscribers || []))
            .catch(() => setSubscribers([]))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const handleClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) onClose();
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [onClose]);

    const getAvatarUrl = (url) => {
        if (!url) return '/default-avatar.png';
        if (url.startsWith('http')) return url;
        return `/uploads/profiles/${url}`;
    };

    return (
        <div ref={ref} className="absolute bottom-full mb-2 left-0 bg-white rounded-2xl shadow-2xl border border-gray-100 w-72 max-h-64 overflow-y-auto z-50">
            <div className="px-3 py-2 border-b border-gray-100 sticky top-0 bg-white">
                <p className="text-xs font-semibold text-gray-500">Mentionner un abonné</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                </div>
            ) : subscribers.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-400">Aucun abonné</div>
            ) : (
                <div>
                    {/* All */}
                    <button
                        onClick={() => onSelect('all', subscribers)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 transition-colors text-left"
                    >
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            All
                        </div>
                        <div>
                            <p className="text-sm font-bold text-blue-600">Tous les abonnés</p>
                            <p className="text-xs text-gray-400">{subscribers.length} abonné{subscribers.length > 1 ? 's' : ''}</p>
                        </div>
                    </button>
                    <div className="border-t border-gray-50" />
                    {subscribers.map(s => (
                        <button
                            key={s.id}
                            onClick={() => onSelect('user', [s])}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                        >
                            <img
                                src={getAvatarUrl(s.avatar_url)}
                                alt={s.username}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                onError={(e) => { e.target.src = '/default-avatar.png'; }}
                            />
                            <p className="text-sm font-medium text-gray-900">@{s.username}</p>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MentionPicker;