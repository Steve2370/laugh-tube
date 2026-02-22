import React, { useState } from 'react';

export default function VideosTable({ videos, onDeleteVideo }) {
    const [search, setSearch]         = useState('');
    const [confirmDelete, setConfirm] = useState(null);
    const [sortBy, setSortBy]         = useState('created_at');
    const [sortDir, setSortDir]       = useState('desc');

    const toggleSort = (col) => {
        if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        else { setSortBy(col); setSortDir('desc'); }
    };

    const sorted = [...videos]
        .filter(v =>
            v.title?.toLowerCase().includes(search.toLowerCase()) ||
            v.username?.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => {
            const val = (x) => x[sortBy] ?? 0;
            return sortDir === 'desc' ? val(b) - val(a) : val(a) - val(b);
        });

    const formatNum = (n) => {
        if (!n) return '0';
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
        if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k';
        return String(n);
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-CA') : '—';

    const SortIcon = ({ col }) => (
        <span className={`ml-1 ${sortBy === col ? 'text-blue-500' : 'text-gray-300'}`}>
            {sortBy === col ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
        </span>
    );

    return (
        <div>
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Rechercher par titre ou auteur..."
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
                        <th className="px-4 py-3">Miniature</th>
                        <th className="px-4 py-3">Titre</th>
                        <th className="px-4 py-3">Auteur</th>
                        <th className="px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort('views')}>
                            Vues <SortIcon col="views"/>
                        </th>
                        <th className="px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort('likes')}>
                            Likes <SortIcon col="likes"/>
                        </th>
                        <th className="px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort('dislikes')}>
                            Dislikes <SortIcon col="dislikes"/>
                        </th>
                        <th className="px-4 py-3">Signalements</th>
                        <th className="px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort('created_at')}>
                            Date <SortIcon col="created_at"/>
                        </th>
                        <th className="px-4 py-3">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                    {sorted.length === 0 ? (
                        <tr>
                            <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                                Aucune vidéo trouvée
                            </td>
                        </tr>
                    ) : sorted.map(video => (
                        <tr
                            key={video.id}
                            className={`hover:bg-gray-50 transition-colors
                                    ${video.report_count > 0 ? 'bg-red-50/50' : ''}`}
                        >
                            <td className="px-4 py-3">
                                <div className="w-20 h-12 bg-gray-100 rounded-lg overflow-hidden">
                                    {video.thumbnail_url
                                        ? <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover"/>
                                        : <div className="w-full h-full flex items-center justify-center text-gray-300">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z"/>
                                            </svg>
                                        </div>
                                    }
                                </div>
                            </td>
                            <td className="px-4 py-3 max-w-xs">
                                <span className="font-medium text-gray-800 line-clamp-2">{video.title}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{video.username}</td>
                            <td className="px-4 py-3 text-gray-700 font-medium">{formatNum(video.views)}</td>
                            <td className="px-4 py-3 text-green-600">{formatNum(video.likes)}</td>
                            <td className="px-4 py-3 text-red-500">{formatNum(video.dislikes)}</td>
                            <td className="px-4 py-3">
                                {video.report_count > 0
                                    ? <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                            {video.report_count} signalement{video.report_count > 1 ? 's' : ''}
                                          </span>
                                    : <span className="text-gray-400">—</span>
                                }
                            </td>
                            <td className="px-4 py-3 text-gray-500">{formatDate(video.created_at)}</td>
                            <td className="px-4 py-3">
                                <button
                                    onClick={() => setConfirm(video.id)}
                                    className="px-3 py-1 text-xs font-medium text-red-600 border border-red-200
                                                   rounded-lg hover:bg-red-50 transition-colors"
                                >
                                    Supprimer
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            <p className="mt-2 text-xs text-gray-400">{sorted.length} vidéo(s)</p>

            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Supprimer la vidéo ?</h3>
                        <p className="text-sm text-gray-500 mb-5">
                            Cette vidéo sera supprimée définitivement pour tous les utilisateurs.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirm(null)}
                                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={async () => { await onDeleteVideo(confirmDelete); setConfirm(null); }}
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