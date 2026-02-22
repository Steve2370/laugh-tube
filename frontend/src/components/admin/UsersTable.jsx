import React, { useState } from 'react';

export default function UsersTable({ users, onDeleteUser }) {
    const [search, setSearch]           = useState('');
    const [confirmDelete, setConfirm]   = useState(null);

    const filtered = users.filter(u =>
        u.username?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    const handleDelete = (userId) => {
        setConfirm(userId);
    };

    const confirmAndDelete = async () => {
        if (confirmDelete) {
            await onDeleteUser(confirmDelete);
            setConfirm(null);
        }
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-CA') : '—';

    return (
        <div>
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Rechercher par nom ou email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full max-w-sm px-4 py-2 border border-gray-200 rounded-xl text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Utilisateur</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Vidéos</th>
                        <th className="px-4 py-3">Abonnés</th>
                        <th className="px-4 py-3">Inscrit le</th>
                        <th className="px-4 py-3">Admin</th>
                        <th className="px-4 py-3">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                    {filtered.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                                Aucun utilisateur trouvé
                            </td>
                        </tr>
                    ) : filtered.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-gray-400 font-mono">#{user.id}</td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center
                                                        text-blue-700 font-semibold text-xs overflow-hidden">
                                        {user.avatar_url
                                            ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover"/>
                                            : (user.username?.[0] || '?').toUpperCase()
                                        }
                                    </div>
                                    <span className="font-medium text-gray-800">{user.username}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{user.email}</td>
                            <td className="px-4 py-3 text-gray-600">{user.video_count ?? 0}</td>
                            <td className="px-4 py-3 text-gray-600">{user.subscriber_count ?? 0}</td>
                            <td className="px-4 py-3 text-gray-500">{formatDate(user.created_at)}</td>
                            <td className="px-4 py-3">
                                {user.is_admin
                                    ? <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">Admin</span>
                                    : <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">User</span>
                                }
                            </td>
                            <td className="px-4 py-3">
                                {!user.is_admin && (
                                    <button
                                        onClick={() => handleDelete(user.id)}
                                        className="px-3 py-1 text-xs font-medium text-red-600 border border-red-200
                                                       rounded-lg hover:bg-red-50 transition-colors"
                                    >
                                        Supprimer
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            <p className="mt-2 text-xs text-gray-400">{filtered.length} utilisateur(s)</p>

            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Supprimer le compte ?</h3>
                        <p className="text-sm text-gray-500 mb-5">
                            Cette action supprimera le compte et toutes ses vidéos. Irréversible.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirm(null)}
                                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={confirmAndDelete}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700"
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}