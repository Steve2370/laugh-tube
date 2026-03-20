import React, { useState } from 'react';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import apiService from '../services/apiService.js';
import { useToast } from '../contexts/ToastContext.jsx';

const ForgotPassword = () => {
    const toast = useToast();
    const [email, setEmail]   = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent]     = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim()) { toast.error('Entrez votre email'); return; }
        setLoading(true);
        try {
            await apiService.request('/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email }),
                skipAuth: true,
            });
            setSent(true);
        } catch (err) {
            setSent(true);
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-16 px-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Mail size={28} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Email envoyé !</h2>
                    <p className="text-gray-500 mb-8">
                        Si un compte existe pour <strong>{email}</strong>, vous recevrez un lien de réinitialisation dans les prochaines minutes.
                    </p>
                    <button
                        onClick={() => { window.location.hash = '#/login'; }}
                        className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-700 transition-colors"
                    >
                        Retour à la connexion
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
                        <Mail size={24} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Mot de passe oublié</h2>
                    <p className="text-gray-500 text-sm">Entrez votre email et nous vous enverrons un lien de réinitialisation.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail size={16} className="text-gray-400" />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="votre@email.com"
                                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 transition-colors text-sm"
                                required
                                autoFocus
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 text-white py-3.5 rounded-xl font-semibold transition-colors disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Send size={16} />
                        )}
                        {loading ? 'Envoi...' : 'Envoyer le lien'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ForgotPassword;