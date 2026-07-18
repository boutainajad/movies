import CONFIG from '../config.js';
import TMDB from '../services/tmdb.js';
import { escapeHtml, highlightText, getSmallPosterUrl, getYear } from '../utils/helpers.js';
import { STORAGE_KEYS, SEARCH_SUGGESTION_COUNT } from '../utils/constants.js';
import { getSearchHistory, saveSearchHistory } from '../services/storage.js';
import { openPlayer } from '../services/player.js';
import { t } from '../i18n/index.js';

export default class SearchManager {
    constructor(appInstance) {
        this.app = appInstance;
        this.input = document.getElementById('searchInput');
        this.box = document.getElementById('searchSuggestions');
        this.cache = new Map();
        this.trendingCache = null;
        this.CACHE_TTL = STORAGE_KEYS.SEARCH_CACHE_TTL;
        this.TREND_TTL = 30 * 60 * 1000;
        this.HISTORY_KEY = STORAGE_KEYS.SEARCH_HISTORY;
        this.MAX_HISTORY = STORAGE_KEYS.SEARCH_HISTORY_MAX;
        this.activeIndex = -1;
        this.searchTimeout = null;
        this.lastQuery = '';

        this._bindEvents();
        this._prefetchTrending();
    }

    _getHistory() {
        return getSearchHistory();
    }

    _saveQuery(query) {
        if (!query || query.length < 2) return;
        let h = this._getHistory().filter(q => q.toLowerCase() !== query.toLowerCase());
        h.unshift(query);
        if (h.length > this.MAX_HISTORY) h.pop();
        saveSearchHistory(h);
    }

    _removeHistoryItem(query) {
        const h = this._getHistory().filter(q => q !== query);
        saveSearchHistory(h);
    }

    async _prefetchTrending() {
        if (this.trendingCache && Date.now() - this.trendingCache.ts < this.TREND_TTL) return;
        this._abortController?.abort();
        this._abortController = new AbortController();
        const data = await TMDB.getTrending('movie', 1, this._abortController.signal);
        if (data && data.results) {
            this.trendingCache = { results: data.results.slice(0, 5), ts: Date.now() };
        }
    }

    _highlight(text, query) {
        return highlightText(text, query);
    }

    _esc(str) {
        return escapeHtml(str);
    }

    _getNavigableItems() {
        if (!this.box) return [];
        return Array.from(this.box.querySelectorAll('.suggestion-item'));
    }

    _setActive(idx) {
        const items = this._getNavigableItems();
        items.forEach((el, i) => el.classList.toggle('suggestion-item--active', i === idx));
        this.activeIndex = idx;
    }

    _handleKeydown(e) {
        if (!this.input) return;
        if (!this.box || this.box.style.display === 'none') {
            if (e.key === 'Enter') {
                const q = this.input.value.trim();
                if (q.length > 2) { this._commit(q); }
            }
            return;
        }

        const items = this._getNavigableItems();

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this._setActive(Math.min(this.activeIndex + 1, items.length - 1));
            items[this.activeIndex]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this._setActive(Math.max(this.activeIndex - 1, -1));
            if (this.activeIndex >= 0) items[this.activeIndex].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (this.activeIndex >= 0 && items[this.activeIndex]) {
                items[this.activeIndex].click();
            } else {
                const q = this.input.value.trim();
                if (q.length > 2) { this._commit(q); }
            }
        } else if (e.key === 'Escape') {
            this._hide();
            this.input.blur();
        }
    }

    _commit(query) {
        if (!this.app || !query) return;
        this._saveQuery(query);
        this.app.performSearch(query);
        this._hide();
    }

    _show() { if (this.box) this.box.style.display = 'block'; }
    _hide() {
        if (this.box) { this.box.style.display = 'none'; this.box.innerHTML = ''; }
        this.activeIndex = -1;
    }

    _renderHistory(query) {
        const h = this._getHistory();
        if (!h.length) return '';
        return `
            <div class="suggestion-section-header"><i class="fa-solid fa-clock-rotate-left"></i> ${t('search.recent')}</div>
            ${h.slice(0, 5).map(q => `
                <div class="suggestion-item suggestion-item--history" data-query="${this._esc(q)}">
                    <span class="sug-icon"><i class="fa-solid fa-magnifying-glass"></i></span>
                    <div class="suggestion-info">
                        <span class="suggestion-title">${this._highlight(q, query)}</span>
                    </div>
                    <button class="sug-remove" data-remove="${this._esc(q)}" title="${t('search.remove')}"><i class="fa-solid fa-xmark"></i></button>
                </div>
            `).join('')}
        `;
    }

    _renderTrending() {
        if (!this.trendingCache) return '';
        return `
            <div class="suggestion-section-header"><i class="fa-solid fa-fire"></i> ${t('search.trending')}</div>
            ${this.trendingCache.results.map(item => {
                const title = item.title || item.name;
                const poster = getSmallPosterUrl(item.poster_path, CONFIG.IMG_URL);
                const type = item.title ? 'movie' : 'tv';
                return `
                    <div class="suggestion-item" data-id="${item.id}" data-type="${type}" data-title="${this._esc(title)}">
                        <img src="${poster}" alt="${this._esc(title)}" loading="lazy" decoding="async">
                        <div class="suggestion-info">
                            <span class="suggestion-title">${this._esc(title)}</span>
                            <span class="suggestion-meta">${getYear(item) || ''} • ${t(type === 'movie' ? 'common.movie' : 'common.series')}</span>
                        </div>
                        <span class="sug-badge"><i class="fa-solid fa-arrow-trend-up"></i> ${t('search.trendingBadge')}</span>
                    </div>
                `;
            }).join('')}
        `;
    }

    _renderResults(items, query) {
        if (!items || !items.length) return `<div class="suggestion-empty">${t('search.noResults')}</div>`;
        return `
            <div class="suggestion-section-header"><i class="fa-solid fa-film"></i> ${t('search.results')}</div>
            ${items.map(item => {
                const title = item.title || item.name;
                const poster = getSmallPosterUrl(item.poster_path, CONFIG.IMG_URL);
                const year = getYear(item) || t('common.na');
                const rating = item.vote_average ? `<i class="fa-solid fa-star"></i> ${item.vote_average.toFixed(1)}` : '';
                const type = (item.name || item.first_air_date) ? 'tv' : 'movie';
                const typeLabel = t(type === 'movie' ? 'common.movie' : 'common.series');
                return `
                    <div class="suggestion-item" data-id="${item.id}" data-type="${type}" data-title="${this._esc(title)}">
                        <img src="${poster}" alt="${this._esc(title)}" loading="lazy" decoding="async">
                        <div class="suggestion-info">
                            <span class="suggestion-title">${this._highlight(title, query)}</span>
                            <span class="suggestion-meta">${year} • ${typeLabel} • ${rating}</span>
                        </div>
                    </div>
                `;
            }).join('')}
        `;
    }

    _attachClicks() {
        if (!this.box) return;
        this.box.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.sug-remove');
            if (removeBtn) {
                e.stopPropagation();
                const q = removeBtn.dataset.remove;
                this._removeHistoryItem(q);
                this._showIdle();
                return;
            }

            const historyItem = e.target.closest('.suggestion-item--history');
            if (historyItem) {
                const q = historyItem.dataset.query;
                this.input.value = q;
                this._commit(q);
                return;
            }

            const item = e.target.closest('.suggestion-item[data-id]');
            if (item) {
                const { id, type, title } = item.dataset;
                this._saveQuery(title);
                if (window.app && window.app.showMovieDetail) {
                    window.app.showMovieDetail(id, type, title.replace(/'/g, "\\'"));
                }
                this._hide();
            }
        }, { capture: false });
    }

    _showIdle() {
        if (!this.box) return;
        const historyHTML = this._renderHistory('');
        const trendingHTML = this._renderTrending();
        if (!historyHTML && !trendingHTML) { this._hide(); return; }
        this.box.innerHTML = historyHTML + trendingHTML;
        this._show();
        this.activeIndex = -1;
    }

    async showResults(query) {
        this.activeIndex = -1;
        if (!query || query.length < 2) {
            this._showIdle();
            return;
        }

        const cacheKey = query.toLowerCase();
        let results;
        if (this.cache.has(cacheKey)) {
            const entry = this.cache.get(cacheKey);
            if (Date.now() - entry.ts < this.CACHE_TTL) {
                results = entry.results;
            }
        }

        if (!results) {
            if (this.box) {
                this.box.innerHTML = `
                    <div class="suggestion-skeleton">
                        <div class="suggestion-skeleton-img skeleton"></div>
                        <div class="suggestion-skeleton-text skeleton"></div>
                    </div>
                    <div class="suggestion-skeleton">
                        <div class="suggestion-skeleton-img skeleton"></div>
                        <div class="suggestion-skeleton-text skeleton"></div>
                    </div>
                    <div class="suggestion-skeleton">
                        <div class="suggestion-skeleton-img skeleton"></div>
                        <div class="suggestion-skeleton-text skeleton"></div>
                    </div>
                `;
            }
            this._show();
            this._abortController?.abort();
            this._abortController = new AbortController();
            const data = await TMDB.search(query, 1, this._abortController.signal);
            if (this._abortController.signal.aborted) return;
            results = data?.results?.filter(i => i.media_type !== 'person').slice(0, SEARCH_SUGGESTION_COUNT) || [];
            this.cache.set(cacheKey, { results, ts: Date.now() });
        }

        const historyHTML = this._renderHistory(query);
        const resultsHTML = this._renderResults(results, query);
        if (this.box) this.box.innerHTML = historyHTML + resultsHTML;
        this._show();
    }

    _bindEvents() {
        let debounceTimer;

        if (!this.input) return;
        this.input.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            clearTimeout(this.searchTimeout);
            const q = e.target.value.trim();
            this.lastQuery = q;
            this.activeIndex = -1;

            if (q.length === 0) {
                this._showIdle();
                this.app.switchPage('home');
                return;
            }
            if (q.length < 2) { this._hide(); return; }

            debounceTimer = setTimeout(() => this.showResults(q), 200);
            this.searchTimeout = setTimeout(() => {
                this._saveQuery(q);
                this.app.performSearch(q);
            }, 600);
        });

        this.input.addEventListener('keydown', (e) => this._handleKeydown(e));

        this.input.addEventListener('focus', () => {
            const q = this.input.value.trim();
            if (q.length >= 2) { this.showResults(q); }
            else { this._showIdle(); }
        });

        document.addEventListener('click', (e) => {
            if (!document.querySelector('.search-container')?.contains(e.target)) {
                this._hide();
            }
        });

        this._attachClicks();
    }
}
