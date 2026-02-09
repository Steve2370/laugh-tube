import React, { useState } from 'react';
import useAbonnement from '../hooks/useAbonnement';
import { useToast } from '../contexts/ToastContext';

export default function BoutonAbonne({ targetUserId }) {
    const { loading, subscribersCount, isSubscribed, toggle } = useAbonnement(targetUserId);
    const toast = useToast();
    const [busy, setBusy] = useState(false);

    const onClick = async () => {
        try {
            setBusy(true);
            await toggle();
            toast.success(isSubscribed ? 'Désabonné' : 'Abonné !');
        } catch (err) {
            if (err?.message === 'AUTH_REQUIRED') {
                toast.info('Veuillez vous connecter pour vous abonner');
                setTimeout(() => {
                    window.location.hash = '#/login';
                }, 1500);
                return;
            }
            toast.error('Erreur lors de l\'abonnement');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="flex items-center gap-3">
            <button
                onClick={onClick}
                disabled={loading || busy}
                className={`px-6 py-2 rounded-xl font-medium transition-all shadow-sm
                ${isSubscribed
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                {busy ? 'Chargement...' : isSubscribed ? 'Abonné' : "S'abonner"}
            </button>
            {subscribersCount !== null && (
                <span className="text-sm text-gray-600 font-medium">
                    {subscribersCount} {subscribersCount > 1 ? 'abonnés' : 'abonné'}
                </span>
            )}
        </div>
    );
}