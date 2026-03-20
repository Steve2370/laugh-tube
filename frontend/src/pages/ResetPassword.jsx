import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Check, X, ArrowLeft } from 'lucide-react';
import apiService from '../services/apiService.js';
import { useToast } from '../contexts/ToastContext.jsx';

const ResetPassword = () => {
    const toast = useToast();
    const [token, setToken]               = useState('');
    const [password, setPassword]         = useState('');
    const [confirm, setConfirm]           = useState('');
    const [showPwd, setShowPwd]           = useState(false);
    const [showConfirm, setShowConfirm]   = useState(false);
    const [loading, setLoading]           = useState(false);
    const [success, setSuccess]           = useState(false);

    const requirements = [
        { label: 'Au moins 8 caractères', test: p => p.length >= 8 },
        { label: 'Une majuscule',          test: p => /[A-Z]/.test(p) },
        { label: 'Une minuscule',          test: p => /[a-z]/.test(p) },
        { label: 'Un chiffre',             test: p => /[0-9]/.test(p) },
    ];

    useEffect(() => {
        const hash = window.location.hash;
        const queryStart = hash.indexOf('?');
        if (queryStart !== -1) {
            const params = new URLSearchParams(hash.slice(queryStart));
            const t = params.get('token');
            if (t) setToken(t);
        }
    }, []);

    const allValid = requirements.every(r => r.test(password));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!token) { toast.error('Token invalide ou manquant'); return; }
        if (!allValid) { toast.error('Le mot de passe ne respecte pas les critères'); return; }
        if (password !== confirm) { toast.error('Les mots de passe ne correspondent pas'); return; }

        setLoading(true);
        try {
            await apiService.resetPassword(token, password, confirm);
            setSuccess(true);
            toast.success('Mot de passe réinitialisé !');
        } catch (err) {
            toast.error(err.message || 'Token invalide ou expiré');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-16 px-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 max-w-md w-full text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Lien invalide</h2>
                    <p className="text-gray-500 mb-6">Ce lien de réinitialisation est invalide ou a expiré.</p>
                    <button
                        onClick={() => { window.location.hash = '#/forgot-password'; }}
                        className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-700 transition-colors"
                    >
                        Demander un nouveau lien
                    </button>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-16 px-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check size={28} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Mot de passe modifié !</h2>
                    <p className="text-gray-500 mb-8">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
                    <button
                        onClick={() => { window.location.hash = '#/login'; }}
                        className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-700 transition-colors"
                    >
                        Se connecter
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-16 px-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 max-w-md w-full">
                <button
                    onClick={() => window.history.back()}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-6 text-sm font-medium"
                >
                    <ArrowLeft size={16} />
                    Retour
                </button>

                <div className="text-center mb-8">
                    <div className="w-14 h-14 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock size={24} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Nouveau mot de passe</h2>
                    <p className="text-gray-500 text-sm">Choisissez un mot de passe sécurisé.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Nouveau mot de passe */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Nouveau mot de passe</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock size={16} className="text-gray-400" />
                            </div>
                            <input
                                type={showPwd ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-10 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 transition-colors text-sm"
                                required
                            />
                            <button type="button" onClick={() => setShowPwd(!showPwd)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600">
                                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {password && (
                            <div className="mt-2 space-y-1">
                                {requirements.map((req, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs">
                                        {req.test(password)
                                            ? <Check size={12} className="text-green-500" />
                                            : <X size={12} className="text-gray-300" />
                                        }
                                        <span className={req.test(password) ? 'text-green-600' : 'text-gray-400'}>
                                            {req.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Confirmer le mot de passe</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock size={16} className="text-gray-400" />
                            </div>
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-10 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 transition-colors text-sm"
                                required
                            />
                            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600">
                                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {confirm && (
                            <p className={`mt-1 text-xs flex items-center gap-1 ${password === confirm ? 'text-green-600' : 'text-red-500'}`}>
                                {password === confirm ? <Check size={12} /> : <X size={12} />}
                                {password === confirm ? 'Les mots de passe correspondent' : 'Les mots de passe ne correspondent pas'}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !allValid || password !== confirm}
                        className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 text-white py-3.5 rounded-xl font-semibold transition-colors disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Lock size={16} />
                        )}
                        {loading ? 'Enregistrement...' : 'Réinitialiser le mot de passe'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;