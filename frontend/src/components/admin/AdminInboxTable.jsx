import React, { useMemo, useState } from 'react';
import {
    Mail, MailOpen, ChevronDown, ChevronUp, Reply, Trash2, Search,
    CheckCheck, MailCheck, X, Inbox, Sparkles,
} from 'lucide-react';
import apiService from '../../services/apiService.js';
import { useToast } from '../../contexts/ToastContext.jsx';

const STATUT_LABELS = {
    unread:  { label: 'Non lu',  bg: 'bg-red-100 text-red-700' },
    read:    { label: 'Lu',      bg: 'bg-gray-100 text-gray-600' },
    replied: { label: 'Répondu', bg: 'bg-green-100 text-green-700' },
};

const FILTERS = [
    { key: 'all',     label: 'Tous' },
    { key: 'unread',  label: 'Non lus' },
    { key: 'read',    label: 'Lus' },
    { key: 'replied', label: 'Répondus' },
];

const PAGE_SIZE = 20;
const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
        return date.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('fr-CA', {
        day: 'numeric', month: 'short',
        year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
    });
};

const formatFullDate = (d) => d ? new Date(d).toLocaleString('fr-CA', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
}) : '';

const AdminInboxTable = ({ inbox, setInbox }) => {
    const toast = useToast();
    const [expanded, setExpanded] = useState(null);
    const [filter, setFilter] = useState('all');
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(() => new Set());
    const [confirmIds, setConfirmIds] = useState(null);
    const [busy, setBusy] = useState(false);
    const [limit, setLimit] = useState(PAGE_SIZE);

    const counts = useMemo(() => ({
        all: inbox.length,
        unread: inbox.filter(m => m.statut === 'unread').length,
        read: inbox.filter(m => m.statut === 'read').length,
        replied: inbox.filter(m => m.statut === 'replied').length,
    }), [inbox]);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return inbox.filter(m => {
            if (filter !== 'all' && m.statut !== filter) return false;
            if (!q) return true;
            return [m.name, m.email, m.username, m.subject, m.message]
                .some(v => (v || '').toLowerCase().includes(q));
        });
    }, [inbox, filter, query]);

    const shown = visible.slice(0, limit);
    const selectedIds = [...selected].filter(id => inbox.some(m => m.id === id));
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

    const runBulk = async (ids, action, { silent = false } = {}) => {
        if (ids.length === 0) return;
        setBusy(true);
        try {
            await apiService.requestV2('/admin/contact/bulk', {
                method: 'POST',
                body: JSON.stringify({ ids, action }),
            });
            if (action === 'delete') {
                setInbox(prev => prev.filter(m => !ids.includes(m.id)));
                if (ids.includes(expanded)) setExpanded(null);
                toast.success(`${plural(ids.length, 'message')} supprimé${ids.length > 1 ? 's' : ''}`);
            } else {
                setInbox(prev => prev.map(m => ids.includes(m.id) ? { ...m, statut: action } : m));
                if (!silent) {
                    const label = action === 'replied' ? 'répondu' : action === 'read' ? 'lu' : 'non lu';
                    toast.success(`${plural(ids.length, 'message')} marqué${ids.length > 1 ? 's' : ''} comme ${label}`);
                }
            }
            setSelected(prev => {
                const next = new Set(prev);
                ids.forEach(id => next.delete(id));
                return next;
            });
        } catch (err) {
            toast.error(err.message || 'Action impossible pour le moment');
        } finally {
            setBusy(false);
            setConfirmIds(null);
        }
    };

    const openMessage = (msg) => {
        setExpanded(expanded === msg.id ? null : msg.id);
        if (msg.statut === 'unread') runBulk([msg.id], 'read', { silent: true });
    };

    const repliedIds = inbox.filter(m => m.statut === 'replied').map(m => m.id);

    return (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="bg-gray-900 px-5 sm:px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <Inbox size={20} className="text-white" />
                    <h2 className="text-white font-bold text-lg">Boîte de réception</h2>
                    {counts.unread > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {counts.unread} non lu{counts.unread > 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                {repliedIds.length > 0 && (
                    <button
                        onClick={() => setConfirmIds(repliedIds)}
                        disabled={busy}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Sparkles size={14} />
                        Nettoyer : supprimer les répondus ({repliedIds.length})
                    </button>
                )}
            </div>

            <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="flex gap-1.5 flex-wrap">
                    {FILTERS.map(f => (
                        <button
                            key={f.key}
                            onClick={() => { setFilter(f.key); setLimit(PAGE_SIZE); }}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                                filter === f.key
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {f.label}
                            <span className={`ml-1.5 tabular-nums ${filter === f.key ? 'text-gray-300' : 'text-gray-400'}`}>
                                {counts[f.key]}
                            </span>
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 lg:ml-auto lg:w-72 focus-within:border-gray-900 transition-colors">
                    <Search size={15} className="text-gray-400 flex-shrink-0" />
                    <input
                        id="inbox-search"
                        type="search"
                        placeholder="Rechercher un nom, un sujet…"
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setLimit(PAGE_SIZE); }}
                        className="flex-1 min-w-0 outline-none text-sm bg-transparent"
                    />
                </div>
            </div>

            {confirmIds && (
                <div className="px-5 sm:px-6 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm text-red-800">
                        Supprimer définitivement <strong>{plural(confirmIds.length, 'message')}</strong> ? Cette action est irréversible.
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setConfirmIds(null)}
                            className="text-sm font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-100 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={() => runBulk(confirmIds, 'delete')}
                            disabled={busy}
                            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
                        >
                            <Trash2 size={14} /> Supprimer
                        </button>
                    </div>
                </div>
            )}

            {selectedIds.length > 0 && !confirmIds && (
                <div className="px-5 sm:px-6 py-2.5 bg-gray-900/[0.03] border-b border-gray-100 flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 mr-2">
                        {plural(selectedIds.length, 'sélectionné')}
                    </span>
                    <button
                        onClick={() => runBulk(selectedIds, 'read')}
                        disabled={busy}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors disabled:opacity-50"
                    >
                        <MailOpen size={14} /> Marquer lu
                    </button>
                    <button
                        onClick={() => runBulk(selectedIds, 'replied')}
                        disabled={busy}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors disabled:opacity-50"
                    >
                        <MailCheck size={14} /> Marquer répondu
                    </button>
                    <button
                        onClick={() => setConfirmIds(selectedIds)}
                        disabled={busy}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
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

            {inbox.length === 0 ? (
                <div className="text-center py-14">
                    <CheckCheck size={32} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-sm font-semibold text-gray-700">Boîte de réception vide</p>
                    <p className="text-xs text-gray-400 mt-1">Les messages du formulaire de contact apparaîtront ici.</p>
                </div>
            ) : visible.length === 0 ? (
                <p className="text-center py-12 text-gray-400 text-sm">Aucun message ne correspond à ce filtre.</p>
            ) : (
                <>
                    <div className="px-5 sm:px-6 py-2 border-b border-gray-100 flex items-center gap-3">
                        <input
                            id="inbox-select-all"
                            type="checkbox"
                            checked={allShownSelected}
                            onChange={toggleAllShown}
                            className="w-4 h-4 rounded border-gray-300 accent-gray-900 cursor-pointer"
                        />
                        <label htmlFor="inbox-select-all" className="text-xs text-gray-500 cursor-pointer select-none">
                            Tout sélectionner ({shown.length})
                        </label>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {shown.map(msg => {
                            const isOpen = expanded === msg.id;
                            const isUnread = msg.statut === 'unread';
                            const isChecked = selected.has(msg.id);
                            return (
                                <div
                                    key={msg.id}
                                    className={`group transition-colors ${isChecked ? 'bg-gray-50' : isUnread ? 'bg-blue-50/60' : 'bg-white'}`}
                                >
                                    <div
                                        className="flex items-center gap-3 sm:gap-4 px-5 sm:px-6 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
                                        onClick={() => openMessage(msg)}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={() => toggleOne(msg.id)}
                                            aria-label={`Sélectionner le message de ${msg.name}`}
                                            className="w-4 h-4 rounded border-gray-300 accent-gray-900 cursor-pointer flex-shrink-0"
                                        />
                                        <div className="flex-shrink-0 hidden sm:block">
                                            {isUnread
                                                ? <Mail size={18} className="text-blue-600" />
                                                : <MailOpen size={18} className="text-gray-400" />}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-sm text-gray-900 ${isUnread ? 'font-bold' : 'font-semibold'}`}>{msg.name}</span>
                                                <span className="text-xs text-gray-400 truncate">{msg.email}</span>
                                                {msg.username && (
                                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">@{msg.username}</span>
                                                )}
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_LABELS[msg.statut]?.bg}`}>
                                                    {STATUT_LABELS[msg.statut]?.label}
                                                </span>
                                            </div>
                                            <p className={`text-sm truncate ${isUnread ? 'text-gray-900 font-semibold' : 'text-gray-700 font-medium'}`}>{msg.subject}</p>
                                            {!isOpen && <p className="text-xs text-gray-400 truncate">{msg.message}</p>}
                                        </div>

                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="text-xs text-gray-400 whitespace-nowrap tabular-nums">{formatDate(msg.sent_at)}</span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setConfirmIds([msg.id]); }}
                                                aria-label="Supprimer ce message"
                                                title="Supprimer"
                                                className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-all"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                            {isOpen
                                                ? <ChevronUp size={16} className="text-gray-400" />
                                                : <ChevronDown size={16} className="text-gray-400" />}
                                        </div>
                                    </div>

                                    {isOpen && (
                                        <div className="px-5 sm:px-6 pb-5 bg-white">
                                            <p className="text-xs text-gray-400 mb-2">Reçu le {formatFullDate(msg.sent_at)}</p>
                                            <div className="bg-gray-50 rounded-xl p-5 mb-4">
                                                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed break-words">{msg.message}</p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <a
                                                    href={`mailto:${msg.email}?subject=${encodeURIComponent(`Re: ${msg.subject || ''}`)}`}
                                                    onClick={() => runBulk([msg.id], 'replied', { silent: true })}
                                                    className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                                                >
                                                    <Reply size={14} /> Répondre par courriel
                                                </a>
                                                {msg.statut !== 'replied' && (
                                                    <button
                                                        onClick={() => runBulk([msg.id], 'replied')}
                                                        disabled={busy}
                                                        className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                                    >
                                                        <MailCheck size={14} /> Marquer comme répondu
                                                    </button>
                                                )}
                                                {msg.statut !== 'unread' && (
                                                    <button
                                                        onClick={() => { runBulk([msg.id], 'unread'); setExpanded(null); }}
                                                        disabled={busy}
                                                        className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                                    >
                                                        <Mail size={14} /> Marquer non lu
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setConfirmIds([msg.id])}
                                                    disabled={busy}
                                                    className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 sm:ml-auto"
                                                >
                                                    <Trash2 size={14} /> Supprimer
                                                </button>
                                            </div>
                                        </div>
                                    )}
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

export default AdminInboxTable;
