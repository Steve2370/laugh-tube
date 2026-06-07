import React, { useState, useEffect, useCallback } from 'react';
import { Radio, Trophy, Calendar, DollarSign, Play, Square, Award, RefreshCw } from 'lucide-react';
import apiService from '../../services/apiService.js';
import { useToast } from '../../contexts/ToastContext.jsx';


const STATUS_LABELS = {
    upcoming: { label: 'À venir', color: 'bg-gray-100 text-gray-600' },
    submissions: { label: 'Soumissions', color: 'bg-blue-100 text-blue-700' },
    voting: { label: 'Votes ouverts', color: 'bg-orange-100 text-orange-700' },
    ended: { label: 'Terminé', color: 'bg-green-100 text-green-700' },
};

const formatDateLocal = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('fr-CA', {
        day: 'numeric', month: 'long', year: 'numeric',
    });
};

const toInputDate = (isoString) => {
    if (!isoString) return '';
    return isoString.slice(0, 10);
};


const StatCard = ({ label, value, icon: Icon, color = 'blue' }) => {
    const colors = {
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        red: 'bg-red-50 text-red-700 border-red-100',
        green: 'bg-green-50 text-green-700 border-green-100',
        yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    };
    return (
        <div className={`rounded-2xl border p-4 ${colors[color]}`}>
            <div className="flex items-center gap-2 mb-1">
                <Icon size={16} />
                <p className="text-sm font-medium">{label}</p>
            </div>
            <p className="text-2xl font-bold">{value ?? '—'}</p>
        </div>
    );
};


const ContestForm = ({ initial, onSave, saving }) => {
    const [form, setForm] = useState({
        edition: initial?.edition ?? new Date().getFullYear().toString(),
        titre: initial?.titre ?? '',
        submission_start: toInputDate(initial?.submission_start) ?? '',
        submission_end: toInputDate(initial?.submission_end) ?? '',
        vote_start: toInputDate(initial?.vote_start) ?? '',
        vote_end: toInputDate(initial?.vote_end) ?? '',
        results_date: toInputDate(initial?.results_date) ?? '',
        prize_1: initial?.prize_1 ?? 200,
        prize_2: initial?.prize_2 ?? 75,
        prize_3: initial?.prize_3 ?? 25,
        status: initial?.status ?? 'upcoming',
    });

    const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    const Field = ({ label, children }) => (
        <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {label}
            </label>
            {children}
        </div>
    );

    const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent";

    return (
        <div className="space-y-6">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Édition">
                    <input type="text" className={inputClass} value={form.edition} onChange={e => set('edition', e.target.value)} placeholder="2025" />
                </Field>
                <Field label="Titre">
                    <input type="text" className={inputClass} value={form.titre} onChange={e => set('titre', e.target.value)} placeholder="Jok-Air — 1ère Édition" />
                </Field>
            </div>

            <Field label="Statut">
                <select className={inputClass} value={form.status} onChange={e => set('status', e.target.value)}>
                    <option value="upcoming">À venir</option>
                    <option value="submissions">Soumissions ouvertes</option>
                    <option value="voting">Votes ouverts</option>
                    <option value="ended">Terminé</option>
                </select>
            </Field>

            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Calendar size={13} /> Calendrier
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Début des soumissions">
                        <input type="date" className={inputClass} value={form.submission_start} onChange={e => set('submission_start', e.target.value)} />
                    </Field>
                    <Field label="Fin des soumissions">
                        <input type="date" className={inputClass} value={form.submission_end} onChange={e => set('submission_end', e.target.value)} />
                    </Field>
                    <Field label="Début des votes">
                        <input type="date" className={inputClass} value={form.vote_start} onChange={e => set('vote_start', e.target.value)} />
                    </Field>
                    <Field label="Fin des votes">
                        <input type="date" className={inputClass} value={form.vote_end} onChange={e => set('vote_end', e.target.value)} />
                    </Field>
                    <Field label="Proclamation des résultats">
                        <input type="date" className={inputClass} value={form.results_date} onChange={e => set('results_date', e.target.value)} />
                    </Field>
                </div>
            </div>

            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <DollarSign size={13} /> Prix (CAD)
                </p>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-yellow-600 mb-1">1er place</label>
                        <input type="number" className={inputClass} value={form.prize_1} onChange={e => set('prize_1', parseInt(e.target.value))} min={0} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">2e place</label>
                        <input type="number" className={inputClass} value={form.prize_2} onChange={e => set('prize_2', parseInt(e.target.value))} min={0} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-orange-600 mb-1">3e place</label>
                        <input type="number" className={inputClass} value={form.prize_3} onChange={e => set('prize_3', parseInt(e.target.value))} min={0} />
                    </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                    Total : <strong>{(form.prize_1 || 0) + (form.prize_2 || 0) + (form.prize_3 || 0)}$</strong>
                </p>
            </div>

            <button
                onClick={() => onSave(form)}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
                {saving
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sauvegarde...</>
                    : <><Play size={14} /> {initial ? 'Mettre à jour' : 'Créer le concours'}</>
                }
            </button>
        </div>
    );
};

const LeaderboardPreview = ({ contestId, onComputeRanks, computing }) => {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!contestId) return;
        apiService.requestV2(`/jokair/${contestId}/leaderboard`)
            .then(data => setEntries(Array.isArray(data) ? data : []))
            .catch(() => setEntries([]))
            .finally(() => setLoading(false));
    }, [contestId]);

    if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" /></div>;

    if (entries.length === 0) return (
        <div className="text-center py-8 text-sm text-gray-400">Aucune soumission pour le moment</div>
    );

    return (
        <div className="space-y-2">
            {entries.map((entry, i) => (
                <div key={entry.id || i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <span className={`w-7 text-center font-bold text-sm ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-gray-400'}`}>
                        {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">@{entry.user?.username}</div>
                        <div className="text-xs text-gray-400 truncate">{entry.video?.titre || entry.video?.title}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">{parseFloat(entry.score || 0).toFixed(1)}</div>
                        <div className="text-xs text-gray-400">{entry.vote_count} votes</div>
                    </div>
                </div>
            ))}

            <button
                onClick={onComputeRanks}
                disabled={computing}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 w-full justify-center"
            >
                {computing
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Calcul...</>
                    : <><Award size={14} /> Proclamer les résultats</>
                }
            </button>
        </div>
    );
};


export default function JokairAdminPanel() {
    const toast = useToast();
    const [contest, setContest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [computing, setComputing] = useState(false);
    const [mode, setMode] = useState('view');

    const loadContest = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiService.requestV2('/jokair/active');
            setContest(data);
            setMode('view');
        } catch {
            setContest(null);
            setMode('create');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadContest(); }, [loadContest]);

    const handleSave = async (form) => {
        setSaving(true);
        try {
            if (contest) {
                await apiService.requestV2(`/jokair/admin/${contest.id}/status`, {
                    method: 'PUT',
                    body: JSON.stringify(form),
                });
                toast.success('Concours mis à jour');
            } else {
                await apiService.requestV2('/jokair/admin', {
                    method: 'POST',
                    body: JSON.stringify(form),
                });
                toast.success('Concours créé');
            }
            await loadContest();
        } catch (e) {
            toast.error(e.message || 'Erreur lors de la sauvegarde');
        } finally {
            setSaving(false);
        }
    };

    const handleComputeRanks = async () => {
        if (!contest) return;
        setComputing(true);
        try {
            await apiService.requestV2(`/jokair/admin/${contest.id}/compute-ranks`, { method: 'POST' });
            toast.success('Rangs calculés — résultats proclamés !');
            await loadContest();
        } catch (e) {
            toast.error(e.message || 'Erreur lors du calcul');
        } finally {
            setComputing(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
        </div>
    );

    const statusInfo = STATUS_LABELS[contest?.status] || STATUS_LABELS.upcoming;

    return (
        <div className="space-y-6">

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Radio size={20} className="text-red-600" />
                    <h2 className="text-lg font-bold text-gray-900">Gestion Jok-Air</h2>
                    {contest && (
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}>
                            {statusInfo.label}
                        </span>
                    )}
                </div>
                <button onClick={loadContest} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors">
                    <RefreshCw size={13} /> Actualiser
                </button>
            </div>

            {contest && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard label="Édition" value={contest.edition}  icon={Radio}    color="blue" />
                    <StatCard label="1er prix" value={`${contest.prize_1}$`} icon={Trophy}   color="yellow" />
                    <StatCard label="Fin des votes" value={formatDateLocal(contest.vote_end)} icon={Calendar} color="blue" />
                    <StatCard label="Résultats" value={formatDateLocal(contest.results_date)} icon={Award} color="green" />
                </div>
            )}

            {contest && (
                <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Calendrier</p>
                    <div className="flex gap-0 overflow-hidden rounded-xl border border-gray-200">
                        {[
                            { label: 'Soumissions', start: contest.submission_start, end: contest.submission_end, active: contest.status === 'submissions' },
                            { label: 'Votes',       start: contest.vote_start,       end: contest.vote_end,       active: contest.status === 'voting' },
                            { label: 'Résultats',   start: contest.results_date,     end: null,                   active: contest.status === 'ended' },
                        ].map((p, i, arr) => (
                            <div key={i} style={{ flex: 1, borderRight: i < arr.length - 1 ? '1px solid #e5e7eb' : 'none' }}
                                 className={`p-3 text-center ${p.active ? 'bg-gray-900 text-white' : 'bg-white'}`}>
                                <div className={`text-xs font-semibold ${p.active ? 'text-white' : 'text-gray-500'}`}>{p.active && '● '}{p.label}</div>
                                <div className={`text-xs mt-0.5 ${p.active ? 'text-gray-300' : 'text-gray-400'}`}>
                                    {formatDateLocal(p.start)}{p.end ? ` → ${formatDateLocal(p.end)}` : ''}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-sm font-bold text-gray-900">
                        {contest ? (mode === 'edit' ? 'Modifier le concours' : 'Concours actif') : 'Créer un nouveau concours'}
                    </h3>
                    {contest && mode === 'view' && (
                        <button
                            onClick={() => setMode('edit')}
                            className="text-xs text-gray-500 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
                        >
                            Modifier
                        </button>
                    )}
                </div>

                {mode === 'view' && contest ? (
                    <div className="text-sm text-gray-500 space-y-2">
                        <div><strong className="text-gray-900">Titre :</strong> {contest.titre}</div>
                        <div><strong className="text-gray-900">Soumissions :</strong> {formatDateLocal(contest.submission_start)} → {formatDateLocal(contest.submission_end)}</div>
                        <div><strong className="text-gray-900">Votes :</strong> {formatDateLocal(contest.vote_start)} → {formatDateLocal(contest.vote_end)}</div>
                        <div><strong className="text-gray-900">Résultats :</strong> {formatDateLocal(contest.results_date) || '—'}</div>
                        <div><strong className="text-gray-900">Prix :</strong> {contest.prize_1}$ / {contest.prize_2}$ / {contest.prize_3}$</div>
                    </div>
                ) : (
                    <ContestForm initial={contest} onSave={handleSave} saving={saving} />
                )}
            </div>

            {contest && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Trophy size={15} className="text-yellow-500" /> Classement actuel
                    </h3>
                    <LeaderboardPreview
                        contestId={contest.id}
                        onComputeRanks={handleComputeRanks}
                        computing={computing}
                    />
                </div>
            )}
        </div>
    );
}