import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../services/apiService.js';
import UsersTable   from '../components/admin/UsersTable.jsx';
import VideosTable  from '../components/admin/VideosTable.jsx';
import ReportsTable from '../components/admin/ReportsTable.jsx';
import { useToast } from '../contexts/ToastContext.jsx';

const TABS = [
    { key: 'reports', label: 'Signalements', icon: '' },
    { key: 'users',   label: 'Utilisateurs', icon: '' },
    { key: 'videos',  label: 'Vidéos',       icon: '' },
];

function StatCard({ label, value, sub, color = 'blue' }) {
    const colors = {
        blue:   'bg-blue-50 text-blue-700 border-blue-100',
        red:    'bg-red-50 text-red-700 border-red-100',
        green:  'bg-green-50 text-green-700 border-green-100',
        purple: 'bg-purple-50 text-purple-700 border-purple-100',
    };
    return (
        <div className={`rounded-2xl border p-4 ${colors[color]}`}>
            <p className="text-2xl font-bold">{value ?? '—'}</p>
            <p className="text-sm font-medium mt-0.5">{label}</p>
            {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
        </div>
    );
}

export default function Admin() {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('reports');

    const [users,   setUsers]   = useState([]);
    const [videos,  setVideos]  = useState([]);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);

    const loadAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [usersRes, videosRes, reportsRes] = await Promise.all([
                apiService.request('/admin/users'),
                apiService.request('/admin/videos'),
                apiService.request('/admin/signalements'),
            ]);
            setUsers(usersRes.users               ?? []);
            setVideos(videosRes.videos            ?? []);
            setReports(reportsRes.signalements    ?? []);
        } catch (err) {
            console.error('Erreur chargement admin:', err);
            setError('Impossible de charger les données admin.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);

    const handleDeleteUser = async (userId) => {
        try {
            await apiService.request(`/admin/users/${userId}`, { method: 'DELETE' });
            setUsers(prev => prev.filter(u => u.id !== userId));
            setVideos(prev => prev.filter(v => v.user_id !== userId));
            toast.success('Compte supprimé');
        } catch (err) {
            toast.error('Erreur lors de la suppression du compte');
        }
    };

    const handleDeleteVideo = async (videoId, reportId = null) => {
        try {
            await apiService.request(`/admin/videos/${videoId}`, { method: 'DELETE' });
            setVideos(prev => prev.filter(v => v.id !== videoId));
            if (reportId) {
                setReports(prev => prev.map(r =>
                    r.video_id === videoId ? { ...r, statut: 'reviewed' } : r
                ));
            }
            toast.success('Vidéo supprimée');
        } catch (err) {
            toast.error('Erreur lors de la suppression de la vidéo');
        }
    };

    const handleUpdateStatut = async (reportId, statut) => {
        try {
            await apiService.request(`/admin/signalements/${reportId}`, {
                method: 'PATCH',
                body: JSON.stringify({ statut }),
            });
            setReports(prev => prev.map(r => r.id === reportId ? { ...r, statut } : r));
            toast.success(statut === 'dismissed' ? 'Signalement ignoré' : 'Statut mis à jour');
        } catch (err) {
            toast.error('Erreur lors de la mise à jour');
        }
    };

    const pendingReports = reports.filter(r => r.statut === 'pending').length;
    const totalViews     = videos.reduce((acc, v) => acc + (v.views ?? 0), 0);
    const formatNum = (n) =>
        n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + 'M' :
            n >= 1_000     ? (n / 1_000).toFixed(1) + 'k' :
                String(n);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">⚙️</span>
                        <h1 className="text-xl font-bold text-gray-900">Administration LaughTube</h1>
                    </div>
                    <button
                        onClick={loadAll}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 border border-gray-200
                                   rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                        Actualiser
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard label="Utilisateurs"              value={users.length}       color="blue"/>
                    <StatCard label="Vidéos"                    value={videos.length}      color="purple"/>
                    <StatCard label="Vues totales"              value={formatNum(totalViews)} color="green"/>
                    <StatCard
                        label="Signalements en attente"
                        value={pendingReports}
                        color={pendingReports > 0 ? 'red' : 'green'}
                        sub={pendingReports > 0 ? 'Action requise' : 'Tout est traité'}
                    />
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex border-b border-gray-100">
                        {TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors relative
                                    ${activeTab === tab.key
                                    ? 'text-gray-900 bg-white'
                                    : 'text-gray-500 bg-gray-50 hover:bg-gray-100 hover:text-gray-700'
                                }`}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                                {tab.key === 'reports' && pendingReports > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full leading-none">
                                        {pendingReports}
                                    </span>
                                )}
                                {activeTab === tab.key && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"/>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="p-4 sm:p-6">
                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin"/>
                            </div>
                        ) : (
                            <>
                                {activeTab === 'reports' && (
                                    <ReportsTable
                                        reports={reports}
                                        onUpdateStatut={handleUpdateStatut}
                                        onDeleteVideo={handleDeleteVideo}
                                    />
                                )}
                                {activeTab === 'users' && (
                                    <UsersTable
                                        users={users}
                                        onDeleteUser={handleDeleteUser}
                                    />
                                )}
                                {activeTab === 'videos' && (
                                    <VideosTable
                                        videos={videos}
                                        onDeleteVideo={handleDeleteVideo}
                                    />
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}