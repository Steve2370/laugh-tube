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
            if (videoId) {
                return await apiService.requestV2(`/videos/${videoId}/signaler`, {
                    method: 'POST',
                    body: JSON.stringify({raison, description}),
                });
            }
            return { success: true };
        } finally {
            setLoading(false);
        }
    };

    return { signaler, loading };
}