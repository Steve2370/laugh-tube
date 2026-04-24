import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Shield, ShieldOff } from 'lucide-react';
import apiService from '../services/apiService.js';

const BoutonBloquer = ({ userId }) => {
    const { user: currentUser, token } = useAuth();
    const [isBlocked, setIsBlocked] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (currentUser && userId && currentUser.id !== userId) {
            checkBlockStatus();
        }
    }, [userId, currentUser]);

    const checkBlockStatus = async () => {
        try {
            const response = await fetch(`/api/v2/users/${userId}/block-status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            setIsBlocked(data.is_blocked);
        } catch (err) {
            console.error('Block status error:', err);
        }
    };

    const toggleBlock = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const method = isBlocked ? 'DELETE' : 'POST';
            const endpoint = isBlocked ? 'unblock' : 'block';
            const response = await fetch(`/api/v2/users/${userId}/${endpoint}`, {
                method,
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            setIsBlocked(data.is_blocked ?? !isBlocked);
        } catch (err) {
            console.error('Block toggle error:', err);
        }
        setLoading(false);
    };

    if (!currentUser || currentUser.id === userId) return null;

    return (
        <button
            onClick={toggleBlock}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                isBlocked
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
            }`}
        >
            {loading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isBlocked ? (
                <ShieldOff size={16} />
            ) : (
                <Shield size={16} />
            )}
            {isBlocked ? 'Débloquer' : 'Bloquer'}
        </button>
    );
};

export default BoutonBloquer;