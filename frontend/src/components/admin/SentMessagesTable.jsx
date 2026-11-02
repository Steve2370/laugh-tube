import React, { useMemo, useState } from 'react';
import { Send, Trash2, Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import apiService from '../../services/apiService.js';
import { useToast } from '../../contexts/ToastContext.jsx';

const PAGE_SIZE = 20;
const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;
const formatDate = (d) => d ? new Date(d).toLocaleString('fr-CA', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
}) : '';

const SentMessagesTable = ({ messages, setMessages }) => {
    const toast = useToast();
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(() => new Set());
    const [confirmIds, setConfirmIds] = useState(null);
    const [busy, setBusy] = useState(false);
    const [limit, setLimit] = useState(PAGE_SIZE);
    const [expanded, setExpanded] = useState(null);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return messages;
        return messages.filter(m => [m.recipient_username, m.recipient_email, m.subject, m.message]
            .some(v => (v || '').toLowerCase().includes(q)));
    }, [messages, query]);

    const shown = visible.slice(0, limit);
    const selectedIds = [...selected].filter(id => messages.some(m => m.id === id));
    const allShownSelected = shown.length > 0 && shown.every(m => selected.has(m.id));

    const toggleOne = (id) => setSelected(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });
    const toggleAllShown = () => setSelected(prev => {
        const next = new Set(prev);
        if (allShownSelected) shown.forEach(m => next.delete(m.id));
        else shown.forEach(m => next.add(m.id));
        return next;
    });

    const remove = async (ids) => {
        setBusy(true);
        try {
            await apiService.requestV2('/admin/messages/delete', {
                method: 'POST',
                body: JSON.stringify({ ids }),
            });
            setMessages(prev => prev.filter(m => !ids.includes(m.id)));
            setSelected(prev => {
                const next = new Set(prev);
                ids.forEach(id => next.delete(id));
                return next;
            });
            toast.success(`${plural(ids.length, 'message')} retiré${ids.length > 1 ? 's' : ''} de l'historique`);
        } catch (err) {
            toast.error(err.message || 'Suppression impossible pour le moment');
        } finally {
            setBusy(false);
            setConfirmIds(null);
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="bg-gray-900 px-5 sm:px-6 py-4 flex items-center gap-3">
                <Send size={18} className="text-white" />
                <h2 className="text-white font-bold text-lg">Messages envoyés</h2>
                <span className="text-xs text-gray-400 tabular-nums">{messages.length}</span>
            </div>

            <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 w-full sm:w-72 focus-within:border-gray-900 transition-colors">
                    <Search size={15} className="text-gray-400 flex-shrink-0" />
                    <input
                        id="sent-search"
                        type="search"
                        placeholder="Rechercher un destinataire, un sujet…"
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setLimit(PAGE_SIZE); }}
                        className="flex-1 min-w-0 outline-none text-sm bg-transparent"
                    />
                </div>
                <p className="text-xs text-gray-400">
                    Supprimer un message ici le retire seulement de l'historique : le courriel déjà envoyé n'est pas rappelé.
                </p>
            </div>

            {confirmIds && (
                <div className="px-5 sm:px-6 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm text-red-800">
                        Retirer définitivement <strong>{plural(confirmIds.length, 'message')}</strong> de l'historique ?
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setConfirmIds(null)}
                            className="text-sm font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-100 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={() => remove(confirmIds)}
                            disabled={busy}
                            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
                        >
                            <Trash2 size={14} /> Supprimer
                        </button>
                    </div>
                </div>
            )}

            {selectedIds.length > 0 && !confirmIds && (
                <div className="px-5 sm:px-6 py-2.5 border-b border-gray-100 flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 mr-2">{plural(selectedIds.length, 'sélectionné')}</span>
                    <button
                        onClick={() => setConfirmIds(selectedIds)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
                    >
                        <Trash2 size={14} /> Supprimer
                    </button>
                    <button
                        onClick={() => setSelected(new Set())}
                        className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
                    >
                        <X size={14} /> Désélectionner
                    </button>
                </div>
            )}

            {messages.length === 0 ? (
                <p className="text-center py-12 text-gray-400 text-sm">Aucun message envoyé</p>
            ) : visible.length === 0 ? (
                <p className="text-center py-12 text-gray-400 text-sm">Aucun message ne correspond à la recherche.</p>
            ) : (
                <>
                    <div className="px-5 sm:px-6 py-2 border-b border-gray-100 flex items-center gap-3">
                        <input
                            id="sent-select-all"
                            type="checkbox"
                            checked={allShownSelected}
                            onChange={toggleAllShown}
                            className="w-4 h-4 rounded border-gray-300 accent-gray-900 cursor-pointer"
                        />
                        <label htmlFor="sent-select-all" className="text-xs text-gray-500 cursor-pointer select-none">
                            Tout sélectionner ({shown.length})
                        </label>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {shown.map(msg => {
                            const isOpen = expanded === msg.id;
                            return (
                                <div key={msg.id} className={`group ${selected.has(msg.id) ? 'bg-gray-50' : 'bg-white'}`}>
                                    <div
                                        className="flex items-start gap-3 sm:gap-4 px-5 sm:px-6 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
                                        onClick={() => setExpanded(isOpen ? null : msg.id)}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selected.has(msg.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={() => toggleOne(msg.id)}
                                            aria-label={`Sélectionner le message à ${msg.recipient_username}`}
                                            className="w-4 h-4 mt-1 rounded border-gray-300 accent-gray-900 cursor-pointer flex-shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-bold text-gray-900">{msg.recipient_username}</span>
                                                <span className="text-xs text-gray-400 truncate">{msg.recipient_email}</span>
                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">par {msg.admin_username}</span>
                                            </div>
                                            <p className="text-sm font-semibold text-gray-700 truncate">{msg.subject}</p>
                                            {isOpen
                                                ? <p className="text-sm text-gray-600 whitespace-pre-wrap break-words mt-2 bg-gray-50 rounded-xl p-4">{msg.message}</p>
                                                : <p className="text-xs text-gray-400 truncate">{msg.message}</p>}
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="text-xs text-gray-400 whitespace-nowrap hidden sm:inline">{formatDate(msg.created_at)}</span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setConfirmIds([msg.id]); }}
                                                aria-label="Supprimer de l'historique"
                                                title="Supprimer"
                                                className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-all"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                            {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {visible.length > shown.length && (
                        <div className="px-6 py-4 border-t border-gray-100 text-center">
                            <button
                                onClick={() => setLimit(l => l + PAGE_SIZE)}
                                className="text-sm font-semibold text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Afficher plus ({visible.length - shown.length} restant{visible.length - shown.length > 1 ? 's' : ''})
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default SentMessagesTable;
