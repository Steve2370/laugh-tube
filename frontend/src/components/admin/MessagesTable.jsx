import React, { useState } from 'react';
import { Send, MessageSquare, Search, User, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import apiService from '../../services/apiService.js';
import { useToast } from '../../contexts/ToastContext.jsx';

const MessagesTable = ({ users, messages, onMessageSent }) => {
    const toast = useToast();
    const [search, setSearch]       = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [subject, setSubject]     = useState('');
    const [message, setMessage]     = useState('');
    const [loading, setLoading]     = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showUserList, setShowUserList] = useState(false);

    const QUICK_SUBJECTS = [
        'Avertissement — Violation des règles',
        'Contenu inapproprié retiré',
        'Suspension temporaire de compte',
        'Rappel des règles de la communauté',
        'Demande de vérification de contenu',
    ];

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    const handleSend = async () => {
        if (!selectedUser) { toast.error('Sélectionnez un utilisateur'); return; }
        if (!subject.trim()) { toast.error('Sujet requis'); return; }
        if (!message.trim()) { toast.error('Message requis'); return; }

        setLoading(true);
        try {
            await apiService.request('/admin/messages', {
                method: 'POST',
                body: JSON.stringify({
                    user_id: selectedUser.id,
                    subject: subject.trim(),
                    message: message.trim(),
                }),
            });
            toast.success(`Email envoyé à ${selectedUser.username}`);
            setSubject('');
            setMessage('');
            setSelectedUser(null);
            setSearch('');
            if (onMessageSent) onMessageSent();
        } catch (err) {
            toast.error(err.message || "Erreur lors de l'envoi");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    return (
        <div className="space-y-6">

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="bg-gray-900 px-6 py-4 flex items-center gap-3">
                    <MessageSquare size={20} className="text-white" />
                    <h2 className="text-white font-bold text-lg">Envoyer un message</h2>
                </div>

                <div className="p-6 space-y-5">

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Destinataire
                        </label>
                        <div className="relative">
                            <div className="flex items-center gap-2 border-2 border-gray-200 rounded-xl px-4 py-3 focus-within:border-gray-900 transition-colors">
                                <Search size={16} className="text-gray-400 flex-shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Rechercher un utilisateur..."
                                    value={selectedUser ? selectedUser.username : search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setSelectedUser(null);
                                        setShowUserList(true);
                                    }}
                                    onFocus={() => setShowUserList(true)}
                                    className="flex-1 outline-none text-sm"
                                />
                                {selectedUser && (
                                    <button
                                        onClick={() => { setSelectedUser(null); setSearch(''); }}
                                        className="text-gray-400 hover:text-gray-600 text-xs"
                                    >✕</button>
                                )}
                            </div>

                            {showUserList && !selectedUser && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                                    {filteredUsers.length === 0 ? (
                                        <p className="px-4 py-3 text-sm text-gray-500">Aucun utilisateur trouvé</p>
                                    ) : (
                                        filteredUsers.slice(0, 20).map(u => (
                                            <button
                                                key={u.id}
                                                onClick={() => {
                                                    setSelectedUser(u);
                                                    setSearch('');
                                                    setShowUserList(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-white text-xs font-bold">
                                                        {u.username.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">{u.username}</p>
                                                    <p className="text-xs text-gray-500">{u.email}</p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {selectedUser && (
                            <div className="mt-2 flex items-center gap-2 bg-gray-900 text-white px-3 py-2 rounded-lg w-fit">
                                <User size={14} />
                                <span className="text-sm font-medium">{selectedUser.username}</span>
                                <span className="text-xs opacity-60">{selectedUser.email}</span>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Sujet
                        </label>
                        <input
                            type="text"
                            placeholder="Objet du message..."
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            maxLength={255}
                            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-900 transition-colors"
                        />
                        <div className="flex flex-wrap gap-2 mt-2">
                            {QUICK_SUBJECTS.map(s => (
                                <button
                                    key={s}
                                    onClick={() => setSubject(s)}
                                    className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-900 hover:text-white text-gray-600 rounded-lg transition-colors"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Message
                        </label>
                        <textarea
                            placeholder="Rédigez votre message..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={6}
                            maxLength={5000}
                            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-900 transition-colors resize-none"
                        />
                        <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-gray-400">
                                L'utilisateur recevra cet email avec reply-to : legal@laughtube.ca
                            </p>
                            <span className="text-xs text-gray-400">{message.length}/5000</span>
                        </div>
                    </div>

                    <button
                        onClick={handleSend}
                        disabled={loading || !selectedUser || !subject.trim() || !message.trim()}
                        className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Send size={16} />
                        )}
                        {loading ? 'Envoi...' : 'Envoyer le message'}
                    </button>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Clock size={18} className="text-gray-500" />
                        <span className="font-bold text-gray-900">Historique des messages ({messages.length})</span>
                    </div>
                    {showHistory ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </button>

                {showHistory && (
                    <div className="border-t border-gray-100">
                        {messages.length === 0 ? (
                            <p className="text-center py-10 text-gray-400 text-sm">Aucun message envoyé</p>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {messages.map(msg => (
                                    <div key={msg.id} className="px-6 py-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <span className="text-sm font-bold text-gray-900">{msg.user_username}</span>
                                                    <span className="text-xs text-gray-400">{msg.user_email}</span>
                                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                        par {msg.admin_username}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-semibold text-gray-700 mb-1">{msg.subject}</p>
                                                <p className="text-sm text-gray-500 line-clamp-2">{msg.message}</p>
                                            </div>
                                            <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                                                {formatDate(msg.sent_at)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessagesTable;