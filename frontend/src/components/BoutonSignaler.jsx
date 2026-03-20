import React, { useState } from 'react';
import { useSignalement } from '../hooks/useSignalement.js';
import { useToast } from '../contexts/ToastContext';

const RAISONS = [
    { value: 'spam', label: 'Spam ou publicité' },
    { value: 'inapproprie', label: 'Contenu inapproprié' },
    { value: 'haine', label: 'Discours haineux' },
    { value: 'desinformation', label: 'Désinformation' },
    { value: 'droits', label: 'Violation de droits d\'auteur' },
    { value: 'autre', label: 'Autre raison' },
];

export default function BoutonSignaler({ videoId, userId }) {
    const { signaler, loading } = useSignalement(videoId);
    const toast = useToast();

    const [modalOpen, setModalOpen] = useState(false);
    const [raison, setRaison] = useState('');
    const [description, setDescription] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const openModal = () => {
        setRaison('');
        setDescription('');
        setModalOpen(true);
    };

    const closeModal = () => {
        if (loading) return;
        setModalOpen(false);
    };

    const onSubmit = async () => {
        if (!raison) {
            toast.error('Veuillez choisir une raison');
            return;
        }

        try {
            await signaler(raison, description);
            setSubmitted(true);
            toast.success('Signalement envoyé, merci !');
            setTimeout(() => {
                setModalOpen(false);
                setSubmitted(false);
            }, 1500);
        } catch (err) {
            if (err?.message === 'AUTH_REQUIRED') {
                toast.info('Veuillez vous connecter pour signaler une vidéo');
                setModalOpen(false);
                setTimeout(() => {
                    window.location.hash = '#/login';
                }, 1500);
                return;
            }
            if (err?.message?.includes('déjà signalé') || err?.message?.includes('already')) {
                toast.info('Vous avez déjà signalé cette vidéo');
                setModalOpen(false);
                return;
            }
            toast.error('Erreur lors du signalement');
        }
    };

    return (
        <>
            <button
                onClick={openModal}
                className={userId
                    ? "flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl border border-gray-200 transition-all"
                    : "flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                }
                title={userId ? "Signaler cette chaîne" : "Signaler cette vidéo"}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                    <line x1="4" y1="22" x2="4" y2="15"/>
                </svg>
                Signaler
            </button>

            {modalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
                >
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {userId ? 'Signaler la chaîne' : 'Signaler la vidéo'}
                            </h2>
                            <button
                                onClick={closeModal}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>

                        {submitted ? (
                            <div className="px-6 py-10 text-center">
                                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                                    </svg>
                                </div>
                                <p className="text-gray-700 font-medium">Signalement envoyé</p>
                                <p className="text-sm text-gray-500 mt-1">Notre équipe va examiner ce contenu.</p>
                            </div>
                        ) : (
                            <div className="px-6 py-5 space-y-4">
                                <p className="text-sm text-gray-600">
                                    Pourquoi signalez-vous cette vidéo ?
                                </p>

                                <div className="space-y-2">
                                    {RAISONS.map(({ value, label }) => (
                                        <label
                                            key={value}
                                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                                                ${raison === value
                                                ? 'border-red-400 bg-red-50'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="raison"
                                                value={value}
                                                checked={raison === value}
                                                onChange={() => setRaison(value)}
                                                className="accent-red-500"
                                            />
                                            <span className="text-sm text-gray-700">{label}</span>
                                        </label>
                                    ))}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Détails supplémentaires <span className="text-gray-400 font-normal">(optionnel)</span>
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Décrivez le problème..."
                                        rows={3}
                                        maxLength={500}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none
                                                   focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
                                    />
                                </div>

                                <div className="flex gap-3 pt-1">
                                    <button
                                        onClick={closeModal}
                                        disabled={loading}
                                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium
                                                   text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={onSubmit}
                                        disabled={loading || !raison}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium
                                                   hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? 'Envoi...' : 'Envoyer le signalement'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}