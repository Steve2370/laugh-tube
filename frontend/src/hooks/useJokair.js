import { useState, useEffect, useCallback } from 'react';
import jokairService from '../services/jokairService';
import { useAuth } from './useAuth';

export const useJokair = () => {
    const { isAuthenticated, user } = useAuth();

    const [contest, setContest] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [hallOfFame, setHallOfFame] = useState([]);
    const [myEntry, setMyEntry] = useState(null);
    const [myVotes, setMyVotes] = useState({});
    const [loadingContest, setLoadingContest] = useState(true);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [votingId, setVotingId] = useState(null);

    useEffect(() => {
        const init = async () => {
            setLoadingContest(true);
            jokairService.invalidateAll();
            const [activeContest, fame] = await Promise.all([
                jokairService.getActiveContest(),
                jokairService.getHallOfFame(),
            ]);
            setContest(activeContest);
            setHallOfFame(fame);
            setLoadingContest(false);
        };
        init();
    }, []);

    useEffect(() => {
        if (!contest?.id) return;

        const fetchLeaderboard = async () => {
            setLoadingLeaderboard(true);
            const data = await jokairService.getLeaderboard(contest.id);
            setLeaderboard(data);
            setLoadingLeaderboard(false);

            if (user) {
                const storageKey = `jokair_votes_${contest.id}_${user.id}_${contest.updated_at}`;
                const stored = localStorage.getItem(storageKey);
                if (stored) {
                    setMyVotes(JSON.parse(stored));
                } else {
                    Object.keys(localStorage)
                        .filter(k => k.startsWith(`jokair_votes_${contest.id}_${user.id}`))
                        .forEach(k => localStorage.removeItem(k));
                    setMyVotes({});
                }
            }
        };
        fetchLeaderboard();
    }, [contest?.id, isAuthenticated]);

    useEffect(() => {
        if (!user || !leaderboard.length) return;
        const entry = leaderboard.find(e => e.user?.id === user.id);
        setMyEntry(entry || null);
    }, [leaderboard, user]);

    const submitEntry = useCallback(async (videoId) => {
        if (!contest?.id || !videoId) return;
        setSubmitting(true);
        try {
            await jokairService.submitEntry(contest.id, videoId);
            const data = await jokairService.getLeaderboard(contest.id);
            setLeaderboard(data);
            return { success: true };
        } catch (error) {
            throw error;
        } finally {
            setSubmitting(false);
        }
    }, [contest?.id]);

    const vote = useCallback(async (entry) => {
        if (!isAuthenticated || !contest?.id) return;
        if (myVotes[entry.id] || votingId) return;

        setVotingId(entry.id);
        try {
            await jokairService.vote(entry.id, contest.id);

            setMyVotes(prev => {
                const updated = { ...prev, [entry.id]: true };
                if (user) {
                    const storageKey = `jokair_votes_${contest.id}_${user.id}_${contest.updated_at}`;
                    localStorage.setItem(storageKey, JSON.stringify(updated));
                }
                return updated;
            });
            setLeaderboard(prev => prev.map(e =>
                e.id === entry.id
                    ? { ...e, vote_count: (e.vote_count || 0) + 1 }
                    : e
            ));
            return { success: true };
        } catch (error) {
            throw error;
        } finally {
            setVotingId(null);
        }
    }, [isAuthenticated, contest?.id, myVotes, votingId, contest?.updated_at]);

    const recordWatch = useCallback(async (entryId, secondsWatched, videoDuration) => {
        await jokairService.recordWatch(entryId, secondsWatched, videoDuration);
    }, []);

    const refreshLeaderboard = useCallback(async () => {
        if (!contest?.id) return;
        jokairService.invalidateAll();
        const data = await jokairService.getLeaderboard(contest.id);
        setLeaderboard(data);
    }, [contest?.id]);

    const canSubmit= contest?.status === 'submissions' && isAuthenticated && !myEntry;
    const canVote= contest?.status === 'voting' && isAuthenticated;
    const isEnded= contest?.status === 'ended';

    return {
        contest,
        leaderboard,
        hallOfFame,
        myEntry,
        myVotes,
        loadingContest,
        loadingLeaderboard,
        submitting,
        votingId,
        submitEntry,
        vote,
        recordWatch,
        refreshLeaderboard,
        canSubmit,
        canVote,
        isEnded,
    };
};