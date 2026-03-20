import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext.jsx';
import apiService from '../services/apiService.js';
import { Send, MessageSquare, Mail, User, FileText, ArrowLeft } from 'lucide-react';

const SUBJECTS = [
    'Doléance — Contenu inapproprié',
    'Signalement d\'un bug',
    'Question sur mon compte',
    'Demande de suppression de données',
    'Violation de droits d\'auteur',
    'Autre',
];

const Contact = () => {
    const { user, isAuthenticated } = useAuth();
    const toast = useToast();

    const [name,    setName]    = useState(isAuthenticated ? user?.username || '' : '');
    const [email,   setEmail]   = useState(isAuthenticated ? user?.email    || '' : '');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent,    setSent]    = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
            toast.error('Tous les champs sont requis');
            return;
        }
        setLoading(true);
        try {
            await apiService.request('/contact', {
                method: 'POST',
                body: JSON.stringify({ name, email, subject, message }),
            });
            setSent(true);
        } catch (err) {
            toast.error(err.message || 'Erreur lors de l\'envoi');
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center px-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Send size={28} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Message envoyé !</h2>
                    <p className="text-gray-500 mb-8">
                        Votre message a bien été transmis à l'équipe LaughTube. Nous vous répondrons à <strong>{email}</strong>.
                    </p>
                    <button
                        onClick={() => window.location.hash = '#/home'}
                        className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-700 transition-colors"
                    >
                        Retour à l'accueil
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-20">
            <div className="max-w-2xl mx-auto px-4 py-10">

                <button
                    onClick={() => window.history.back()}
                    className="mb-8 flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-medium"
                >
                    <ArrowLeft size={18} />
                    Retour
                </button>

                <div className="bg-gray-900 rounded-2xl p-8 mb-8 text-white">
                    <div className="flex items-center gap-3 mb-3">
                        <MessageSquare size={28} className="opacity-80" />
                        <span className="text-sm font-semibold uppercase tracking-widest opacity-60">Support</span>
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Nous contacter</h1>
                    <p className="text-gray-400">Doléances, signalements ou questions — nous vous répondrons dans les plus brefs délais.</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Nom</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User size={16} className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Votre nom"
                                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 transition-colors text-sm"
                                    required
                                />
                            </div>
                        </div>

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
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Sujet</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <FileText size={16} className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    placeholder="Objet de votre message"
                                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 transition-colors text-sm"
                                    maxLength={255}
                                    required
                                />
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {SUBJECTS.map(s => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setSubject(s)}
                                        className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-900 hover:text-white text-gray-600 rounded-lg transition-colors"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
                            <textarea
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="Décrivez votre problème ou question en détail..."
                                rows={6}
                                maxLength={5000}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 transition-colors text-sm resize-none"
                                required
                            />
                            <div className="flex justify-between mt-1">
                                <p className="text-xs text-gray-400">Nous vous répondrons à legal@laughtube.ca</p>
                                <span className="text-xs text-gray-400">{message.length}/5000</span>
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
                                <Send size={18} />
                            )}
                            {loading ? 'Envoi...' : 'Envoyer le message'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Contact;