import TMDB from './tmdb.js';
import { getContinueWatching, getRecentlyViewed } from './storage.js';
import { escapeHtml } from '../utils/helpers.js';
import { HOME_GENRES, PAGE_TITLES, SKELETON_COUNT } from '../utils/constants.js';
import { attachHero } from '../components/hero.js';
import { attachCard } from '../components/card.js';
import { attachGrid } from '../components/grid.js';
import { attachWatchlist } from '../components/watchlist.js';
import SearchManager from '../components/search.js';
import { t } from '../i18n/index.js';
import { initDetailPage, mountDetailPage } from '../pages/detail.js';

export default class AppUI {
    constructor() {
        this.state = {
            page: 1,
            totalPages: 0,
            currentType: 'movie',
            currentGenre: null,
            currentView: 'home',
            loading: false,
            hasMore: true,
            watchlist: JSON.parse(localStorage.getItem('filmix_watchlist') || '[]'),
            favorites: JSON.parse(localStorage.getItem('filmix_favorites') || '[]')
        };
        this.heroPool = [];
        this.heroIndex = 0;
        this.heroBgActive = 0;
        this.heroInterval = null;
        this._grid = document.getElementById('movie-grid');
        this._heroWrapper = document.getElementById('hero-wrapper');
        this._sectionHeader = document.querySelector('.section-header');
        this._gridTitle = document.getElementById('grid-title');
        this._sortSelect = document.getElementById('sortSelect');
        this._yearSelect = document.getElementById('yearSelect');
        this._ratingSelect = document.getElementById('ratingSelect');
        this._pageContent = document.getElementById('page-content');
        this._mobileGenres = document.getElementById('mobile-genre-list');
        this._pagination = document.getElementById('pagination');
        this._loadMoreTrigger = document.getElementById('load-more-trigger');

        attachHero(this);
        attachCard(this);
        attachGrid(this);
        attachWatchlist(this);
        initDetailPage(this);

        this.init();
    }

    async init() {
        this.populateYearOptions();
        this.setupEventListeners();
        this.loadGenres();
        this.loadContent();
        this.setupInfiniteScroll();
        this._togglePaginationMode();
        this.setupHashRouting();

        window.addEventListener('languagechange', () => {
            this.refreshCurrentView();
        });
    }

    setupHashRouting() {
        window.addEventListener('hashchange', () => this.handleHash());
        if (window.location.hash && window.location.hash.length > 1) {
            this.handleHash();
        }
    }

    handleHash() {
        const hash = window.location.hash.slice(1);
        if (!hash || hash === '/home') {
            if (this.state.currentView === 'detail') {
                const prev = this._prevView || 'home';
                this.switchPage(prev);
            }
            return;
        }
        const match = hash.match(/^\/(movie|tv)\/(\d+)/);
        if (match) {
            const type = match[1];
            const id = match[2];
            this.showMovieDetail(id, type, '', 1, 1);
        }
    }

    showMovieDetail(id, type, title, season = 1, episode = 1) {
        if (this.state.currentView === 'detail' && this._detailId === id) return;

        this._prevView = this.state.currentView;

        const section = document.querySelector('.section');
        const homeSections = document.getElementById('home-sections');
        const detailPage = document.getElementById('movie-detail-page');

        this.stopHeroRotation();
        if (this._heroWrapper) this._heroWrapper.innerHTML = '';
        if (this._sectionHeader) this._sectionHeader.style.display = 'none';
        if (this._gridTitle) this._gridTitle.textContent = '';
        document.querySelectorAll('.genre-list').forEach(el => el.style.display = 'none');

        if (section) section.style.display = 'none';
        if (homeSections) homeSections.style.display = 'none';

        if (detailPage) {
            mountDetailPage(id, type, title, season, episode);
        }

        this._detailId = id;
        this.state.currentView = 'detail';
        this.updateNavUI(null);

        const targetHash = `#/${type}/${id}`;
        if (window.location.hash !== targetHash) {
            window.location.hash = targetHash;
        }
    }

    refreshCurrentView() {
        if (this.state.currentView === 'detail') return;
        if (this.state.currentView === 'watchlist') {
            this.renderWatchlist();
            return;
        }
        if (this.state.currentView === 'favorites') {
            this.renderFavorites();
            return;
        }
        this.state.page = 1;
        this.loadContent(true);
        if (this.state.currentView === 'home') {
            this.loadGenres();
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) this.switchPage(page);
            });
        });

        this.searchManager = new SearchManager(this);

        if (this._sortSelect) {
            this._sortSelect.addEventListener('change', () => {
                this.state.page = 1;
                this.loadContent(true);
            });
        }

        [this._yearSelect, this._ratingSelect].forEach(sel => {
            if (sel) {
                sel.addEventListener('change', () => {
                    this.state.page = 1;
                    this.loadContent(true);
                });
            }
        });
    }

    populateYearOptions() {
        if (!this._yearSelect) return;
        const currentYear = new Date().getFullYear();
        for (let y = currentYear; y >= 1970; y--) {
            const opt = document.createElement('option');
            opt.value = String(y);
            opt.textContent = String(y);
            this._yearSelect.appendChild(opt);
        }
    }

    _togglePaginationMode() {
        const isPaginated = this.state.currentView === 'movies' || this.state.currentView === 'series';
        if (this._pagination) {
            this._pagination.classList.toggle('visible', isPaginated && this.state.totalPages > 1);
        }
        if (this._loadMoreTrigger) {
            this._loadMoreTrigger.style.display = isPaginated ? 'none' : '';
        }
    }

    goToPage(page) {
        if (page < 1 || page > this.state.totalPages || this.state.loading) return;
        this.state.page = page;
        if (this._grid) this._grid.innerHTML = '';
        const frag = document.createDocumentFragment();
        for (let i = 0; i < SKELETON_COUNT; i++) {
            const s = document.createElement('div');
            s.className = 'skeleton-card';
            frag.appendChild(s);
        }
        if (this._grid) this._grid.appendChild(frag);
        if (this._pageContent) this._pageContent.scrollTo(0, 0);
        this.loadContent(true);
    }

    renderPagination() {
        if (!this._pagination) return;
        const { page, totalPages } = this.state;

        if (totalPages <= 1) {
            this._pagination.classList.remove('visible');
            return;
        }

        this._pagination.classList.add('visible');

        let html = '';
        const prevDisabled = page <= 1;
        html += `<button class="page-btn" data-page="${page - 1}" ${prevDisabled ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>`;

        const range = 2;
        let start = Math.max(1, page - range);
        let end = Math.min(totalPages, page + range);

        if (start > 1) {
            html += `<button class="page-btn" data-page="1">1</button>`;
            if (start > 2) html += `<span class="page-dots">...</span>`;
        }

        for (let i = start; i <= end; i++) {
            html += `<button class="page-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }

        if (end < totalPages) {
            if (end < totalPages - 1) html += `<span class="page-dots">...</span>`;
            html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
        }

        const nextDisabled = page >= totalPages;
        html += `<button class="page-btn" data-page="${page + 1}" ${nextDisabled ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>`;

        this._pagination.innerHTML = html;

        this._pagination.querySelectorAll('.page-btn:not(:disabled)').forEach(btn => {
            btn.addEventListener('click', () => {
                const p = parseInt(btn.dataset.page, 10);
                if (!isNaN(p)) this.goToPage(p);
            });
        });
    }

    _renderGenreGrid(genres, container) {
        if (!genres?.length || !container) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'genre-grid-section';
        wrapper.innerHTML = `
            <h3 class="row-title"><i class="fa-solid fa-tags"></i> ${t('home.genres')}</h3>
            <div class="genre-grid">
                ${genres.map(g => `<div class="genre-grid-item" data-id="${g.id}">${escapeHtml(g.name)}</div>`).join('')}
            </div>
        `;
        wrapper.querySelectorAll('.genre-grid-item').forEach(el => {
            el.addEventListener('click', () => {
                const genreId = el.dataset.id;
                const genreName = el.textContent;
                this.state.currentGenre = genreId;
                this.state.page = 1;
                this.state.currentView = this.state.currentType === 'movie' ? 'movies' : 'series';
                this.updateNavUI(this.state.currentView);
                if (this._gridTitle) this._gridTitle.textContent = `${genreName} — ${t(this.state.currentType === 'movie' ? 'common.movie' : 'common.series')}`;
                this.loadContent(true);
                document.querySelectorAll('.genre-item').forEach(g => g.classList.toggle('active', g.dataset.id === genreId));
            });
        });
        container.appendChild(wrapper);
    }

    _renderFooter(container) {
        if (!container) return;
        const footer = document.createElement('footer');
        footer.className = 'site-footer';
        footer.innerHTML = `
            <div class="footer-content">
                <div class="footer-brand">
                    <div class="footer-logo">DRAMA MIX</div>
                    <p class="footer-desc" data-i18n="footer.desc">Free streaming of movies & TV series from around the world.</p>
                </div>
                <div class="footer-links">
                    <a href="#" data-page="home">${t('nav.home')}</a>
                    <a href="#" data-page="movies">${t('nav.movies')}</a>
                    <a href="#" data-page="series">${t('nav.series')}</a>
                    <a href="#" data-page="watchlist">${t('nav.watchlist')}</a>
                    <a href="#" data-page="favorites">${t('nav.favorites')}</a>
                </div>
                <div class="footer-copy">&copy; ${new Date().getFullYear()} DRAMA MIX. ${t('footer.rights')}</div>
            </div>
        `;
        footer.querySelectorAll('a[data-page]').forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                const page = a.dataset.page;
                if (page) this.switchPage(page);
            });
        });
        container.appendChild(footer);
    }

    async loadGenres() {
        try {
            this.genreAbortController?.abort();
            this.genreAbortController = new AbortController();
            const data = await TMDB.getGenres(this.state.currentType, this.genreAbortController.signal);
            if (!data) return;

            const genreContainer = document.getElementById('genre-list');
            if (!genreContainer) return;

            const html = (data.genres || []).map(genre => `
                <div class="genre-item" data-id="${genre.id}">${genre.name}</div>
            `).join('');

            genreContainer.innerHTML = html;
            genreContainer.querySelectorAll('.genre-item').forEach(item => {
                item.addEventListener('click', () => {
                    const genreId = item.dataset.id;
                    const genreName = item.textContent;

                    this.state.currentGenre = genreId;
                    this.state.page = 1;

                    if (this.state.currentView !== 'movies' && this.state.currentView !== 'series') {
                        this.state.currentView = this.state.currentType === 'movie' ? 'movies' : 'series';
                    }

                    this.updateNavUI(this.state.currentView);
                    const typeLabel = t(this.state.currentType === 'movie' ? 'common.movie' : 'common.series');
                    if (this._gridTitle) this._gridTitle.textContent = `${genreName} — ${typeLabel}`;

                    this.loadContent(true);

                    document.querySelectorAll('.genre-item').forEach(g => {
                        g.classList.toggle('active', g.dataset.id === genreId);
                    });
                });
            });
        } catch (e) {
            console.error('loadGenres error:', e);
        }
    }

    async loadContent(clear = false) {
        if (this.state.loading) return;
        if (this.state.currentView === 'watchlist' || this.state.currentView === 'favorites' || this.state.currentView === 'detail') return;
        this.state.loading = true;

        this.abortController?.abort();
        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        try {
            if (clear) {
                if (this._grid) this._grid.innerHTML = '';
                const frag = document.createDocumentFragment();
                for (let i = 0; i < SKELETON_COUNT; i++) {
                    const s = document.createElement('div');
                    s.className = 'skeleton-card';
                    frag.appendChild(s);
                }
                if (this._grid) this._grid.appendChild(frag);
                if (this._pageContent) this._pageContent.scrollTo(0, 0);
            }

            if (this.state.currentView === 'home' && this.state.page === 1 && !this.state.currentGenre) {
            if (this._grid) this._grid.style.display = 'none';
            if (this._sectionHeader) this._sectionHeader.style.display = 'none';
            if (this._pagination) this._pagination.classList.remove('visible');
            if (this._loadMoreTrigger) this._loadMoreTrigger.style.display = 'none';

            let sectionsContainer = document.getElementById('home-sections');
            if (!sectionsContainer) {
                sectionsContainer = document.createElement('div');
                sectionsContainer.id = 'home-sections';
                if (this._grid && this._grid.parentNode) {
                    this._grid.parentNode.insertBefore(sectionsContainer, this._grid);
                }
            }
            sectionsContainer.innerHTML = Array(6).fill(`
                <div class="row-skeleton">
                    <div class="row-skeleton-header skeleton"></div>
                    <div class="row-skeleton-track">
                        <div class="row-skeleton-card skeleton"></div>
                        <div class="row-skeleton-card skeleton"></div>
                        <div class="row-skeleton-card skeleton"></div>
                        <div class="row-skeleton-card skeleton"></div>
                        <div class="row-skeleton-card skeleton"></div>
                    </div>
                </div>
            `).join('');

            const fetches = [
                TMDB.getTrending('movie', 1, signal),
                TMDB.discover('movie', { sort_by: 'primary_release_date.desc', page: 1 }, signal),
                TMDB.getPopular('movie', 1, signal),
                TMDB.getPopular('tv', 1, signal),
                TMDB.discover('movie', { sort_by: 'vote_average.desc', 'vote_count.gte': 300, page: 1 }, signal),
                TMDB.getNowPlaying(1, signal)
            ];

            const [trending, latest, popularMovies, popularTv, recommendations, news] = await Promise.allSettled(fetches);
            if (signal.aborted) { this.state.loading = false; return; }
            sectionsContainer.innerHTML = '';

            if (!this._heroWrapper?.querySelector('.hero')) {
                this.initHero((trending.value?.results || []).slice(0, 12));
            }

            const continueWatching = getContinueWatching();
            if (continueWatching.length > 0) {
                this.renderContinueWatchingRow(continueWatching, sectionsContainer);
            }

            const recentlyViewed = getRecentlyViewed();
            if (recentlyViewed.length > 0) {
                this.renderRecentlyViewedRow(recentlyViewed, sectionsContainer);
            }

            const rows = [
                { title: `<i class="fa-solid fa-fire"></i> ${t('home.trendingNow')}`, data: trending },
                { title: `<i class="fa-solid fa-clock"></i> ${t('home.latestReleases')}`, data: latest },
                { title: `<i class="fa-solid fa-film"></i> ${t('home.popularMovies')}`, data: popularMovies },
                { title: `<i class="fa-solid fa-tv"></i> ${t('home.popularTv')}`, data: popularTv },
                { title: `<i class="fa-solid fa-star"></i> ${t('home.recommendations')}`, data: recommendations },
                { title: `<i class="fa-solid fa-newspaper"></i> ${t('home.news')}`, data: news }
            ];

            rows.forEach(r => {
                try {
                    const items = r.data?.value?.results;
                    if (items && items.length > 0) {
                        this.renderRow(r.title, items, sectionsContainer);
                    }
                } catch (e) {
                    console.error('renderRow error:', e);
                }
            });

            if (!signal.aborted) {
                try {
                    const genreData = await TMDB.getGenres(this.state.currentType, signal).catch(() => null);
                    if (genreData?.genres?.length) {
                        this._renderGenreGrid(genreData.genres, sectionsContainer);
                    }
                } catch (e) {
                    console.error('renderGenreGrid error:', e);
                }
            }

            if (!signal.aborted) {
                try {
                    this._renderFooter(sectionsContainer);
                } catch (e) {
                    console.error('renderFooter error:', e);
                }
            }
            } else {
            this.stopHeroRotation();
            if (this._heroWrapper) this._heroWrapper.innerHTML = '';
            if (this._grid) this._grid.style.display = 'grid';
            if (this._sectionHeader) this._sectionHeader.style.display = 'flex';
            const sectionsContainer = document.getElementById('home-sections');
            if (sectionsContainer) sectionsContainer.innerHTML = '';

            const yearVal = this._yearSelect ? this._yearSelect.value : '';
            const ratingVal = this._ratingSelect ? this._ratingSelect.value : '';
            const params = {
                page: this.state.page,
                sort_by: this._sortSelect ? this._sortSelect.value : 'popularity.desc',
                with_genres: this.state.currentGenre || '',
                'vote_average.gte': ratingVal || undefined
            };
            if (yearVal) {
                params[this.state.currentType === 'tv' ? 'first_air_date_year' : 'primary_release_year'] = yearVal;
            }
            const data = await TMDB.discover(this.state.currentType, params, signal);

            if (signal.aborted) { this.state.loading = false; return; }

            if (data && data.results) {
                this.renderGrid(data.results);
                this.state.hasMore = this.state.page < data.total_pages;
                this.state.totalPages = data.total_pages || 0;
                this._togglePaginationMode();
                this.renderPagination();
            }
        }
        } catch (e) {
            console.error('loadContent error:', e);
        }
        this.state.loading = false;
    }

    setupInfiniteScroll() {
        const trigger = document.getElementById('load-more-trigger');
        if (!trigger) return;
        this.intersectionObserver = new IntersectionObserver((entries) => {
            const isPaginated = this.state.currentView === 'movies' || this.state.currentView === 'series';
            if (!isPaginated && entries[0].isIntersecting && !this.state.loading && this.state.hasMore) {
                this.state.page++;
                this.abortController?.abort();
                this.abortController = new AbortController();
                if (this.state.currentView === 'search') {
                    const searchInput = document.getElementById('searchInput');
                    const query = searchInput ? searchInput.value : '';
                    this.performSearch(query, this.state.page);
                } else {
                    this.loadContent();
                }
            }
        }, { rootMargin: '500px' });
        this.intersectionObserver.observe(trigger);
    }

    switchPage(page) {
        if (page !== 'home') this.stopHeroRotation();

        const detailPage = document.getElementById('movie-detail-page');
        if (detailPage) detailPage.style.display = 'none';
        const grid = document.getElementById('movie-grid');
        const gridParent = grid?.closest('.section');
        if (gridParent) gridParent.style.display = '';
        const homeSections = document.getElementById('home-sections');
        if (homeSections) homeSections.style.display = '';

        this.state.currentView = page;
        this.state.page = 1;
        this.state.currentGenre = null;
        if (page === 'movies') this.state.currentType = 'movie';
        if (page === 'series') this.state.currentType = 'tv';

        this.updateNavUI(page);

        if (this._gridTitle) {
            const info = PAGE_TITLES[page];
            if (info) {
                this._gridTitle.innerHTML = `<i class="fa-solid ${info.icon}"></i> ${t(info.key)}`;
            } else {
                this._gridTitle.textContent = t('common.results');
            }
        }

        const genreBar = document.getElementById('genre-list');
        if (genreBar) {
            genreBar.style.display = (page === 'movies' || page === 'series') ? 'flex' : 'none';
        }

        if (page === 'watchlist') {
            this.state.totalPages = 0;
            this._togglePaginationMode();
            this.renderPagination();
            this.renderWatchlist();
        } else if (page === 'favorites') {
            this.state.totalPages = 0;
            this._togglePaginationMode();
            this.renderPagination();
            this.renderFavorites();
        } else {
            this.loadGenres();
            this.loadContent(true);
        }
    }

    updateNavUI(page) {
        document.querySelectorAll('.nav-item').forEach(n => {
            n.classList.toggle('active', n.dataset.page === page);
        });
    }

    async performSearch(query, page = 1) {
        const detailPage = document.getElementById('movie-detail-page');
        if (detailPage) detailPage.style.display = 'none';
        const section = document.querySelector('.section');
        if (section) section.style.display = '';

        this.state.currentView = 'search';
        this.state.page = page;
        this.updateNavUI('search');

        this.searchAbortController?.abort();
        this.searchAbortController = new AbortController();
        const signal = this.searchAbortController.signal;

        try {
            if (page === 1) {
                if (this._grid) this._grid.style.display = 'grid';

                if (this._sectionHeader) this._sectionHeader.style.display = 'flex';

                const sectionsContainer = document.getElementById('home-sections');
                if (sectionsContainer) sectionsContainer.innerHTML = '';

                if (this._gridTitle) this._gridTitle.textContent = t('common.searchResults', { query });
                if (this._grid) this._grid.innerHTML = '';
                const frag = document.createDocumentFragment();
                for (let i = 0; i < SKELETON_COUNT; i++) {
                    const s = document.createElement('div');
                    s.className = 'skeleton-card';
                    frag.appendChild(s);
                }
                if (this._grid) this._grid.appendChild(frag);
                if (this._heroWrapper) this._heroWrapper.innerHTML = '';
                this.stopHeroRotation();
                if (this._mobileGenres) this._mobileGenres.style.display = 'none';
            }

            const data = await TMDB.search(query, page, signal);
            if (signal.aborted) return;
            if (data && data.results) {
                const filtered = data.results.filter(i => i.media_type !== 'person');
                this.renderGrid(filtered);
                this.state.hasMore = page < data.total_pages;
                this.state.totalPages = data.total_pages || 0;
                this._togglePaginationMode();
                this.renderPagination();
            }
        } catch (e) {
            console.error('performSearch error:', e);
        }
    }
}
