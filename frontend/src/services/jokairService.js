import apiService from './apiService.js';

class JokairService {
    constructor() {
        this.cache = new Map();
        this.cacheDuration = 2 * 60 * 1000;
    }

    async getActiveContest() {
        try {
            const cached = this._getFromCache('active_contest');
            if (cached) return cached;

            const response = await apiService.requestV2('/jokair/active');
            this._setInCache('active_contest', response);
            return response;
        } catch (error) {
            console.error('JokairService.getActiveContest:', error);
            return null;
        }
    }

    async getHallOfFame() {
        try {
            const cached = this._getFromCache('hall_of_fame');
            if (cached) return cached;

            const response = await apiService.requestV2('/jokair/hall-of-fame');
            this._setInCache('hall_of_fame', response);
            return Array.isArray(response) ? response : [];
        } catch (error) {
            console.error('JokairService.getHallOfFame:', error);
            return [];
        }
    }

    async getLeaderboard(contestId) {
        try {
            if (!contestId) throw new Error('Contest ID requis');

            const cacheKey = `leaderboard_${contestId}`;
            const cached = this._getFromCache(cacheKey);
            if (cached) return cached;

            const response = await apiService.requestV2(`/jokair/${contestId}/leaderboard`);
            const result = Array.isArray(response) ? response : [];
            this._setInCache(cacheKey, result);
            return result;
        } catch (error) {
            console.error('JokairService.getLeaderboard:', error);
            return [];
        }
    }

    async submitEntry(contestId, videoId) {
        try {
            if (!contestId || !videoId) throw new Error('Contest ID et Video ID requis');

            const response = await apiService.requestV2(`/jokair/${contestId}/submit`, {
                method: 'POST',
                body: JSON.stringify({ video_id: videoId }),
            });

            this._invalidateCache(`leaderboard_${contestId}`);
            return { success: true, entry: response };
        } catch (error) {
            console.error('JokairService.submitEntry:', error);
            throw error;
        }
    }

    async vote(entryId, contestId) {
        try {
            if (!entryId) throw new Error('Entry ID requis');

            const response = await apiService.requestV2(`/jokair/entries/${entryId}/vote`, {
                method: 'POST',
            });

            this._invalidateCache(`leaderboard_${contestId}`);
            return { success: true, ...response };
        } catch (error) {
            console.error('JokairService.vote:', error);
            throw error;
        }
    }

    async recordWatch(entryId, secondsWatched, videoDuration) {
        try {
            if (!entryId) throw new Error('Entry ID requis');

            await apiService.requestV2(`/jokair/entries/${entryId}/watch`, {
                method: 'POST',
                body: JSON.stringify({
                    seconds_watched: secondsWatched,
                    video_duration:  videoDuration,
                }),
            });

            return { success: true };
        } catch (error) {
            console.error('JokairService.recordWatch:', error);
            return { success: false };
        }
    }

    _getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        if (Date.now() - cached.timestamp > this.cacheDuration) {
            this.cache.delete(key);
            return null;
        }
        return cached.data;
    }

    _setInCache(key, data) {
        this.cache.set(key, { data, timestamp: Date.now() });
    }

    _invalidateCache(key) {
        this.cache.delete(key);
    }

    invalidateAll() {
        this.cache.clear();
    }
}

export default new JokairService();