import React, { useState } from 'react';
import { Mail, MailOpen, ChevronDown, ChevronUp, Reply } from 'lucide-react';
import apiService from '../../services/apiService.js';
import { useToast } from '../../contexts/ToastContext.jsx';

const STATUT_LABELS = {
    unread:  { label: 'Non lu',  bg: 'bg-red-100 text-red-700' },
    read:    { label: 'Lu',      bg: 'bg-gray-100 text-gray-600' },
    replied: { label: 'Répondu', bg: 'bg-green-100 text-green-700' },
};

const AdminInboxTable = ({ inbox, onRefresh }) => {
    const toast = useToast();
    const [expanded, setExpanded] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);

    const unreadCount = inbox.filter(m => m.statut === 'unread').length;

    const handleMarkRead = async (msgId) => {
        setUpdatingId(msgId);
        try {
            await apiService.request(`/admin/contact/${msgId}`, {
                method: 'PATCH',
                body: JSON.stringify({ statut: 'read' }),
            });
            if (onRefresh) onRefresh();
        } catch (err) {
            toast.error('Erreur mise à jour statut');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleMarkReplied = async (msgId) => {
        setUpdatingId(msgId);
        try {
            await apiService.request(`/admin/contact/${msgId}`, {
                method: 'PATCH',
                body: JSON.stringify({ statut: 'replied' }),
            });
            if (onRefresh) onRefresh();
            toast.success('Marqué comme répondu');
        } catch (err) {
            toast.error('Erreur mise à jour statut');
        } finally {
            setUpdatingId(null);
        }
    };

    const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    return (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Mail size={20} className="text-white" />
                    <h2 className="text-white font-bold text-lg">Messages reçus</h2>
                    {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
                        </span>
                    )}
                </div>
            </div>

            {inbox.length === 0 ? (
                <p className="text-center py-12 text-gray-400 text-sm">Aucun message reçu</p>
            ) : (
                <div className="divide-y divide-gray-100">
                    {inbox.map(msg => (
                        <div
                            key={msg.id}
                            className={`transition-colors ${msg.statut === 'unread' ? 'bg-blue-50' : 'bg-white'}`}
                        >
                            <div
                                className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => {
                                    setExpanded(expanded === msg.id ? null : msg.id);
                                    if (msg.statut === 'unread') handleMarkRead(msg.id);
                                }}
                            >
                                <div className="flex-shrink-0">
                                    {msg.statut === 'unread'
                                        ? <Mail size={18} className="text-blue-600" />
                                        : <MailOpen size={18} className="text-gray-400" />
                                    }
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-sm text-gray-900">{msg.name}</span>
                                        <span className="text-xs text-gray-400">{msg.email}</span>
                                        {msg.username && (
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                @{msg.username}
                                            </span>
                                        )}
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_LABELS[msg.statut]?.bg}`}>
                                            {STATUT_LABELS[msg.statut]?.label}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-700 font-medium truncate">{msg.subject}</p>
                                    <p className="text-xs text-gray-400 truncate">{msg.message}</p>
                                </div>

                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(msg.sent_at)}</span>
                                    {expanded === msg.id
                                        ? <ChevronUp size={16} className="text-gray-400" />
                                        : <ChevronDown size={16} className="text-gray-400" />
                                    }
                                </div>
                            </div>

                            {expanded === msg.id && (
                                <div className="px-6 pb-5 border-t border-gray-100 bg-white">
                                    <div className="bg-gray-50 rounded-xl p-5 mt-4 mb-4">
                                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <a
                                            href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)}`}
                                            onClick={() => handleMarkReplied(msg.id)}
                                            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                                        >
                                            <Reply size={14} />
                                            Répondre par email
                                        </a>
                                        {msg.statut !== 'replied' && (
                                            <button
                                                onClick={() => handleMarkReplied(msg.id)}
                                                disabled={updatingId === msg.id}
                                                className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                            >
                                                Marquer comme répondu
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminInboxTable;