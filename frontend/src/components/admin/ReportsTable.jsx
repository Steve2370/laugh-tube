import React, { useState } from 'react';

const STATUT_LABELS = {
    pending:   { label: 'En attente', className: 'bg-yellow-100 text-yellow-700' },
    reviewed:  { label: 'Traité',     className: 'bg-green-100 text-green-700' },
    dismissed: { label: 'Ignoré',     className: 'bg-gray-100 text-gray-500' },
};

const RAISON_LABELS = {
    spam:             'Spam',
    inapproprie:      'Inapproprié',
    haine:            'Discours haineux',
    desinformation:   'Désinformation',
    droits:           'Droits d\'auteur',
    autre:            'Autre',
};

export default function ReportsTable({ reports, onUpdateStatut, onDeleteVideo }) {
    const [filter, setFilter] = useState('pending');

    const filtered = filter === 'all'
        ? reports
        : reports.filter(r => r.statut === filter);

    const formatDate = (d) => d ? new Date(d).toLocaleString('fr-CA') : '—';

    const counts = {
        all:       reports.length,
        pending:   reports.filter(r => r.statut === 'pending').length,
        reviewed:  reports.filter(r => r.statut === 'reviewed').length,
        dismissed: reports.filter(r => r.statut === 'dismissed').length,
    };

    return (
        <div>
            <div className="flex gap-2 mb-4 flex-wrap">
                {[
                    { key: 'all',       label: 'Tous' },
                    { key: 'pending',   label: 'En attente' },
                    { key: 'reviewed',  label: 'Traités' },
                    { key: 'dismissed', label: 'Ignorés' },
                ].map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors
                            ${filter === key
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {label}
                        <span className="ml-1.5 text-xs opacity-70">({counts[key]})</span>
                    </button>
                ))}
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Vidéo</th>
                        <th className="px-4 py-3">Signalé par</th>
                        <th className="px-4 py-3">Raison</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Statut</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                    {filtered.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                                Aucun signalement dans cette catégorie
                            </td>
                        </tr>
                    ) : filtered.map(report => (
                        <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-gray-400 font-mono">#{report.id}</td>
                            <td className="px-4 py-3">
                                <div className="font-medium text-gray-800 max-w-xs line-clamp-1">
                                    {report.video_title}
                                </div>
                                <div className="text-xs text-gray-400">par {report.video_author}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                                {report.reporter_username ?? 'Anonyme'}
                            </td>
                            <td className="px-4 py-3">
                                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                                        {RAISON_LABELS[report.raison] ?? report.raison}
                                    </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 max-w-xs">
                                <span className="line-clamp-2 text-xs">{report.description || '—'}</span>
                            </td>
                            <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                                        ${STATUT_LABELS[report.statut]?.className ?? 'bg-gray-100 text-gray-500'}`}>
                                        {STATUT_LABELS[report.statut]?.label ?? report.statut}
                                    </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                                {formatDate(report.created_at)}
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex flex-col gap-1">
                                    {report.statut === 'pending' && (
                                        <>
                                            <button
                                                onClick={() => onDeleteVideo(report.video_id, report.id)}
                                                className="px-2 py-1 text-xs font-medium text-white bg-red-600
                                                               rounded-lg hover:bg-red-700 transition-colors"
                                            >
                                                Supprimer vidéo
                                            </button>
                                            <button
                                                onClick={() => onUpdateStatut(report.id, 'dismissed')}
                                                className="px-2 py-1 text-xs font-medium text-gray-600 border
                                                               border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                Ignorer
                                            </button>
                                        </>
                                    )}
                                    {report.statut !== 'pending' && (
                                        <button
                                            onClick={() => onUpdateStatut(report.id, 'pending')}
                                            className="px-2 py-1 text-xs font-medium text-blue-600 border
                                                           border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                                        >
                                            Réouvrir
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            <p className="mt-2 text-xs text-gray-400">{filtered.length} signalement(s)</p>
        </div>
    );
}