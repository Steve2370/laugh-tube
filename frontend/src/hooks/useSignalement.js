import {useState} from 'react';
import apiService from '../services/apiService.js';

export function useSignalement(videoId) {
    const [loading, setLoading] = useState(false);

    const signaler = async (raison, description = '') => {
        if (!apiService.isAuthenticated()) {
            throw new Error('AUTH_REQUIRED');
        }

        setLoading(true);
        try {
            return await apiService.request(`/videos/${videoId}/signaler`, {
                method: 'POST',
                body: JSON.stringify({raison, description}),
            });
        } finally {
            setLoading(false);
        }
    };

    return { signaler, loading };
}