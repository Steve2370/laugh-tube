import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Trophy, Play, ArrowRight, ArrowLeft } from 'lucide-react';
import apiService from '../services/apiService.js';
import './JokairWinners.css';

const goTo = (hash) => { window.location.hash = hash; };
const openVideo = (id) => goTo(`#/video/${id}`);

const ordinal = (n) => (n === 1 ? '1ère' : `${n}e`);
const fmtVotes = (v) => Number(v || 0).toLocaleString('fr-CA');
const fmtPrize = (p) => `${Number(p || 0).toLocaleString('fr-CA')} $`;
const fmtDate = (d) =>
    d ? new Date(`${d}T12:00:00`).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

const avatarSrc = (w) => {
    if (w.avatar_url) {
        return w.avatar_url.startsWith('http') ? w.avatar_url : `/uploads/profiles/${w.avatar_url}`;
    }
    return apiService.getProfileImageUrl(w.user_id);
};
const thumbSrc = (w) => apiService.getThumbnailUrl(w.thumbnail ? { thumbnail: w.thumbnail } : w.video_id);

function Mascot() {
    const mic = (
        <>
            <rect x="34" y="8" width="52" height="74" rx="26" />
            <path d="M44 30h32M44 44h32M44 58h32" />
            <path d="M22 54c0 22 17 40 38 40s38-18 38-40" />
            <path d="M60 94v18M40 114h40" />
        </>
    );
    return (
        <svg className="jw-mascot" viewBox="0 0 124 124" fill="none" aria-hidden="true">
            <g className="jw-mascot-shadow" stroke="currentColor" strokeWidth="5" strokeLinecap="round" transform="translate(6 6)">{mic}</g>
            <g stroke="currentColor" strokeWidth="5" strokeLinecap="round">{mic}</g>
        </svg>
    );
}

function Avatar({ winner }) {
    const [failed, setFailed] = useState(false);
    return (
        <span className="jw-avatar">
            {failed
                ? (winner.username || '?').charAt(0).toUpperCase()
                : <img src={avatarSrc(winner)} alt="" onError={() => setFailed(true)} />}
        </span>
    );
}

function FeaturedChampion({ edition, number }) {
    const w = edition.winner;
    return (
        <article className="jw-feature" aria-labelledby={`jw-champion-${edition.contest_id}`}>
            <a href={`#/video/${w.video_id}`} className="jw-media" aria-label={`Voir la vidéo gagnante : ${w.video_title}`}>
                <span className="jw-stamp"><Trophy size={15} strokeWidth={2.4} /> 1er</span>
                <img src={thumbSrc(w)} alt="" />
                <span className="jw-play"><Play size={24} fill="currentColor" /></span>
            </a>

            <div className="jw-body">
                <span className="jw-numeral" aria-hidden="true">{String(number).padStart(2, '0')}</span>
                <span className="jw-edition">{ordinal(number)} édition · {edition.edition}</span>
                <span className="jw-label"><Trophy size={16} strokeWidth={2.2} /> Champion Jok-Air</span>
                <div className="jw-person">
                    <Avatar winner={w} />
                    <h2 className="jw-name" id={`jw-champion-${edition.contest_id}`}>@{w.username}</h2>
                </div>
                <p className="jw-video-title">« {w.video_title} »</p>
                <dl className="jw-stats">
                    <div className="jw-stat"><dt>Votes</dt><dd>{fmtVotes(w.votes)}</dd></div>
                    {edition.prize > 0 && (
                        <div className="jw-stat"><dt>Prix</dt><dd className="jw-prize">{fmtPrize(edition.prize)}</dd></div>
                    )}
                    {edition.results_date && (
                        <div className="jw-stat"><dt>Couronné le</dt><dd className="jw-date">{fmtDate(edition.results_date)}</dd></div>
                    )}
                </dl>
                <button type="button" className="jw-cta" onClick={() => openVideo(w.video_id)}>
                    Voir la vidéo gagnante <ArrowRight size={18} strokeWidth={2.4} />
                </button>
            </div>
        </article>
    );
}

function ArchiveCard({ edition, number }) {
    const w = edition.winner;
    return (
        <a href={`#/video/${w.video_id}`} className="jw-card">
            <div className="jw-card-media">
                <span className="jw-stamp"><Trophy size={13} strokeWidth={2.4} /> 1er</span>
                <img src={thumbSrc(w)} alt="" loading="lazy" />
            </div>
            <div className="jw-card-body">
                <span className="jw-edition">{ordinal(number)} édition · {edition.edition}</span>
                <h3 className="jw-card-name">@{w.username}</h3>
                <span className="jw-card-meta">« {w.video_title} » · {fmtVotes(w.votes)} votes</span>
            </div>
        </a>
    );
}

export default function JokairWinners() {
    const [editions, setEditions] = useState(null);
    const [error, setError] = useState(null);
    const reduce = useReducedMotion();

    useEffect(() => {
        apiService.requestV2('/jokair/winners')
            .then((res) => setEditions(res?.editions || []))
            .catch((e) => setError(e.message || 'Erreur réseau'));
    }, []);

    const rise = (delay = 0) =>
        reduce ? {} : { initial: { y: 24 }, animate: { y: 0 }, transition: { duration: 0.6, delay, ease: [0.2, 0.8, 0.2, 1] } };

    // L'API renvoie la plus récente en premier ; le numéro d'édition se déduit du total.
    const total = editions?.length || 0;
    const [latest, ...past] = editions || [];

    return (
        <main className="jw">
            <div className="jw-wrap">
                <button type="button" className="jw-back" onClick={() => goTo('#/jokair')}>
                    <ArrowLeft size={16} strokeWidth={2.4} /> Retour au Jok-Air
                </button>

                <header className="jw-hero">
                    <motion.div className="jw-hero-text" {...rise(0)}>
                        <span className="jw-eyebrow">Les légendes du Jok-Air</span>
                        <h1 className="jw-title">
                            <span className="jw-outline">Panthéon</span> <span className="jw-red">Jok-Air</span>
                        </h1>
                        <p className="jw-lede">
                            Chaque édition couronne un seul champion : l'humoriste qui a fait le plus rire
                            le Québec, choisi par vos votes.
                        </p>
                    </motion.div>
                    <Mascot />
                </header>

                {error && (
                    <div className="jw-empty" role="alert">
                        <strong>Impossible de charger les champions</strong>
                        <p>{error}. Rafraîchis la page dans un instant.</p>
                    </div>
                )}

                {!error && editions === null && <div className="jw-skeleton" aria-label="Chargement" />}

                {!error && editions?.length === 0 && (
                    <div className="jw-empty">
                        <strong>Le premier champion arrive bientôt</strong>
                        <p>Aucune édition n'est encore terminée. Les résultats apparaîtront ici dès le couronnement.</p>
                    </div>
                )}

                {latest && (
                    <motion.section {...rise(0.12)}>
                        <FeaturedChampion edition={latest} number={total} />
                    </motion.section>
                )}

                {past.length > 0 && (
                    <section className="jw-archive" aria-labelledby="jw-archive-title">
                        <div className="jw-archive-head">
                            <h2 className="jw-h2" id="jw-archive-title">Éditions précédentes</h2>
                            <span className="jw-count">{past.length} champion{past.length > 1 ? 's' : ''}</span>
                        </div>
                        <div className="jw-grid">
                            {past.map((ed, i) => (
                                <ArchiveCard key={ed.contest_id} edition={ed} number={total - 1 - i} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}
