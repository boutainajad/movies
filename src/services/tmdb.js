import CONFIG from '../config.js';
import { CACHE_TTL } from '../utils/constants.js';
import { getTmdbLang } from '../i18n/index.js';

export default class TMDB {
    static #cache = new Map();

    static #cacheKey(endpoint, params = {}) {
        return `${endpoint}?${new URLSearchParams(params)}`;
    }

    static #cacheGet(key) {
        const entry = this.#cache.get(key);
        if (entry && Date.now() - entry.ts < entry.ttl) return entry.data;
        this.#cache.delete(key);
        return null;
    }

    static #cacheSet(key, data, ttl = CACHE_TTL.DEFAULT) {
        if (data && !data.errors) this.#cache.set(key, { data, ts: Date.now(), ttl });
    }

    static async fetch(endpoint, params = {}, signal = null, ttl = CACHE_TTL.DEFAULT) {
        if (CONFIG.TMDB_KEY === 'ENTER_YOUR_TMDB_API_KEY_HERE') return null;

        const key = this.#cacheKey(endpoint, params);
        const cached = this.#cacheGet(key);
        if (cached) return cached;

        const queryParams = new URLSearchParams({
            api_key: CONFIG.TMDB_KEY,
            language: getTmdbLang(),
            ...params
        });

        try {
            const response = await fetch(`${CONFIG.BASE_URL}${endpoint}?${queryParams}`, { signal });
            if (!response.ok) {
                console.warn(`TMDB API ${response.status} for ${endpoint}`);
                return null;
            }
            const data = await response.json();
            this.#cacheSet(key, data, ttl);
            return data;
        } catch (error) {
            if (error.name === 'AbortError') return null;
            console.error('API Error:', error);
            return null;
        }
    }

    static async getTrending(type = 'movie', page = 1, signal = null) {
        return this.fetch(`/trending/${type}/day`, { page }, signal);
    }

    static async getGenres(type = 'movie', signal = null) {
        return this.fetch(`/genre/${type}/list`, {}, signal, CACHE_TTL.LONG);
    }

    static async discover(type = 'movie', params = {}, signal = null) {
        return this.fetch(`/discover/${type}`, params, signal);
    }

    static async search(query, page = 1, signal = null) {
        return this.fetch('/search/multi', { query, page }, signal);
    }

    static async getDetails(id, type = 'movie', signal = null) {
        return this.fetch(`/${type}/${id}`, { append_to_response: 'credits,similar,external_ids' }, signal, CACHE_TTL.LONG);
    }

    static async getSeason(id, seasonNumber, signal = null) {
        return this.fetch(`/tv/${id}/season/${seasonNumber}`, {}, signal, CACHE_TTL.SEASON);
    }
}
