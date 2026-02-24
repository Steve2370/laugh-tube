import React, { useState } from 'react';
import { Shield, ShieldOff, Trash2, RotateCcw, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import apiService from '../../services/apiService.js';
import { useToast } from '../../contexts/ToastContext.jsx';

const SUSPEND_OPTIONS = [
    { label: '1 heure', hours: 1 },
    { label: '24 heures', hours: 24 },
    { label: '7 jours', hours: 168 },
    { label: '30 jours', hours: 720 },
    { label: '1 an', hours: 8760 },
];

const SUSPEND_REASONS = [
    'Violation des règles de la communauté',
    'Contenu inapproprié répété',
    'Spam ou comportement abusif',
    'Usurpation d\'identité',
    'Autre',
];

function UserRow({ user, onRefresh }) {
    const toast = useToast();
    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [suspendHours, setSuspendHours] = useState(24);
    const [suspendReason, setSuspendReason] = useState(SUSPEND_REASONS[0]);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const isDeleted    = !!user.deleted_at;
    const isSuspended  = user.account_locked_until && new Date(user.account_locked_until) > new Date();
    const isLocked     = user.failed_login_attempts >= 5 && !isSuspended;

    const getStatus = () => {
        if (isDeleted)   return { label: 'Supprimé', bg: 'bg-gray-100 text-gray-600' };
        if (isSuspended) return { label: 'Suspendu', bg: 'bg-red-100 text-red-700' };
        if (isLocked)    return { label: 'Verrouillé', bg: 'bg-orange-100 text-orange-700' };
        return { label: 'Actif', bg: 'bg-green-100 text-green-700' };
    };

    const status = getStatus();

    const handleSuspend = async () => {
        setLoading(true);
        try {
            await apiService.request(`/admin/users/${user.id}/suspend`, {
                method: 'PATCH',
                body: JSON.stringify({ hours: suspendHours, reason: suspendReason }),
            });
            toast.success(`${user.username} suspendu`);
            setExpanded(false);
            onRefresh();
        } catch (err) {
            toast.error(err.message || 'Erreur');
        } finally {
            setLoading(false);
        }
    };

    const handleUnsuspend = async () => {
        setLoading(true);
        try {
            await apiService.request(`/admin/users/${user.id}/unsuspend`, { method: 'PATCH' });
            toast.success('Suspension levée');
            onRefresh();
        } catch (err) {
            toast.error(err.message || 'Erreur');
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async () => {
        setLoading(true);
        try {
            await apiService.request(`/admin/users/${user.id}/restore`, { method: 'PATCH' });
            toast.success(`Compte de ${user.username} restauré`);
            onRefresh();
        } catch (err) {
            toast.error(err.message || 'Erreur');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '—';

    return (
        <div className={`border-b border-gray-100 ${isDeleted ? 'opacity-60' : ''}`}>
            <div
                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">
                        {user.username?.charAt(0).toUpperCase()}
                    </span>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900">{user.username}</span>
                        {user.role === 'admin' && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Admin</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.bg}`}>
                            {status.label}
                        </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    {isSuspended && (
                        <p className="text-xs text-red-500">Jusqu'au {formatDate(user.account_locked_until)}</p>
                    )}
                </div>

                <div className="hidden sm:flex items-center gap-4 text-xs text-gray-400 flex-shrink-0">
                    <span>{user.video_count ?? 0} vidéos</span>
                    <span>{user.failed_login_attempts ?? 0} échecs</span>
                </div>

                {expanded ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
                    : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
            </div>

            {expanded && (
                <div className="bg-gray-50 border-t border-gray-100 px-4 py-4 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-500">
                        <div><span className="font-semibold block">Inscrit le</span>{formatDate(user.created_at)}</div>
                        <div><span className="font-semibold block">Dernière connexion</span>{formatDate(user.last_login)}</div>
                        <div><span className="font-semibold block">Tentatives échouées</span>{user.failed_login_attempts ?? 0}</div>
                        <div><span className="font-semibold block">Email vérifié</span>{user.email_verified ? '✅' : '❌'}</div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {isDeleted && (
                            <button
                                onClick={handleRestore}
                                disabled={loading}
                                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                <RotateCcw size={14} />
                                Restaurer le compte
                            </button>
                        )}

                        {(isSuspended || isLocked) && !isDeleted && (
                            <button
                                onClick={handleUnsuspend}
                                disabled={loading}
                                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                <ShieldOff size={14} />
                                Lever la sanction
                            </button>
                        )}

                        {!isDeleted && !isSuspended && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <select
                                    value={suspendHours}
                                    onChange={e => setSuspendHours(Number(e.target.value))}
                                    className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-gray-900"
                                >
                                    {SUSPEND_OPTIONS.map(o => (
                                        <option key={o.hours} value={o.hours}>{o.label}</option>
                                    ))}
                                </select>
                                <select
                                    value={suspendReason}
                                    onChange={e => setSuspendReason(e.target.value)}
                                    className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-gray-900"
                                >
                                    {SUSPEND_REASONS.map(r => (
                                        <option key={r}>{r}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleSuspend}
                                    disabled={loading}
                                    className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                    <Shield size={14} />
                                    Suspendre
                                </button>
                            </div>
                        )}

                        {!isDeleted && (
                            <>
                                {!confirmDelete ? (
                                    <button
                                        onClick={() => setConfirmDelete(true)}
                                        className="flex items-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors ml-auto"
                                    >
                                        <Trash2 size={14} />
                                        Supprimer
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2 ml-auto">
                                        <span className="text-xs text-red-600 flex items-center gap-1">
                                            <AlertTriangle size={12} /> Confirmer ?
                                        </span>
                                        <button
                                            onClick={() => { setConfirmDelete(false); }}
                                            className="text-xs px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            onClick={async () => {
                                                setLoading(true);
                                                try {
                                                    await apiService.request(`/admin/users/${user.id}`, { method: 'DELETE' });
                                                    toast.success('Compte supprimé');
                                                    onRefresh();
                                                } catch (err) {
                                                    toast.error('Erreur suppression');
                                                } finally {
                                                    setLoading(false);
                                                    setConfirmDelete(false);
                                                }
                                            }}
                                            disabled={loading}
                                            className="text-xs px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                        >
                                            Supprimer
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

const UsersTable = ({ users, onDeleteUser, onRefresh }) => {
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');

    const now = new Date();
    const filtered = users.filter(u => {
        const matchSearch = !search ||
            u.username?.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase());

        const isDeleted   = !!u.deleted_at;
        const isSuspended = u.account_locked_until && new Date(u.account_locked_until) > now;
        const isLocked    = u.failed_login_attempts >= 5 && !isSuspended;

        if (filter === 'active')    return matchSearch && !isDeleted && !isSuspended && !isLocked;
        if (filter === 'suspended') return matchSearch && isSuspended;
        if (filter === 'locked')    return matchSearch && isLocked;
        if (filter === 'deleted')   return matchSearch && isDeleted;
        return matchSearch;
    });

    const counts = {
        all:       users.length,
        active:    users.filter(u => !u.deleted_at && !(u.account_locked_until && new Date(u.account_locked_until) > now) && u.failed_login_attempts < 5).length,
        suspended: users.filter(u => u.account_locked_until && new Date(u.account_locked_until) > now).length,
        locked:    users.filter(u => u.failed_login_attempts >= 5 && !(u.account_locked_until && new Date(u.account_locked_until) > now)).length,
        deleted:   users.filter(u => !!u.deleted_at).length,
    };

    const FILTERS = [
        { key: 'all', label: 'Tous' },
        { key: 'active', label: 'Actifs' },
        { key: 'suspended', label: 'Suspendus', alert: counts.suspended > 0 },
        { key: 'locked', label: 'Verrouillés', alert: counts.locked > 0 },
        { key: 'deleted', label: 'Supprimés' },
    ];

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex flex-wrap gap-2">
                    {FILTERS.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                                ${filter === f.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            {f.label}
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === f.key ? 'bg-white text-gray-900' : f.alert ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                {counts[f.key]}
                            </span>
                        </button>
                    ))}
                </div>
                <input
                    type="text"
                    placeholder="Rechercher..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gray-900 w-48"
                />
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {filtered.length === 0 ? (
                    <p className="text-center py-10 text-gray-400 text-sm">Aucun utilisateur</p>
                ) : (
                    filtered.map(user => (
                        <UserRow
                            key={user.id}
                            user={user}
                            onRefresh={onRefresh}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default UsersTable;