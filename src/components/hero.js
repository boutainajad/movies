import CONFIG from '../config.js';
import TMDB from '../services/tmdb.js';
import { escapeHtml, waitForImage } from '../utils/helpers.js';
import { HERO_ROTATION_INTERVAL } from '../utils/constants.js';
import { openPlayer } from '../services/player.js';

export function attachHero(app) {
    app.stopHeroRotation = function () {
        if (this.heroInterval) {
            clearInterval(this.heroInterval);
            this.heroInterval = null;
        }
        if (this.heroTimeout) {
            clearTimeout(this.heroTimeout);
            this.heroTimeout = null;
        }
        if (this.heroAbortController) {
            this.heroAbortController.abort();
            this.heroAbortController = null;
        }
    };

    app.buildHeroPool = async function (trendingResults) {
        const pool = (trendingResults || []).filter(r => r.backdrop_path).slice(0, 12);

        const randomId = CONFIG.FEATURED_IDS[Math.floor(Math.random() * CONFIG.FEATURED_IDS.length)];
        let featured = await TMDB.getDetails(randomId, 'movie');
        if (!featured?.backdrop_path) {
            featured = await TMDB.getDetails(randomId, 'tv');
        }
        if (featured?.backdrop_path && !pool.some(r => r.id === featured.id)) {
            pool.unshift(featured);
        }

        return pool;
    };

    app.initHero = async function (trendingResults) {
        try {
            if (this.state.currentView !== 'home') {
                this.stopHeroRotation();
                if (this._heroWrapper) this._heroWrapper.innerHTML = '';
                return;
            }

            if (this._heroWrapper) {
                this._heroWrapper.innerHTML = `
                    <div class="hero-skeleton skeleton">
                        <div class="hero-skeleton-body">
                            <div class="hero-skeleton-title skeleton"></div>
                            <div class="hero-skeleton-meta skeleton"></div>
                            <div class="hero-skeleton-actions">
                                <div class="hero-skeleton-btn skeleton"></div>
                                <div class="hero-skeleton-btn skeleton"></div>
                            </div>
                        </div>
                    </div>
                `;
            }

            this.heroPool = await this.buildHeroPool(trendingResults);
            if (this.heroPool.length === 0) { if (this._heroWrapper) this._heroWrapper.innerHTML = ''; return; }

            this.heroIndex = Math.floor(Math.random() * this.heroPool.length);
            this.heroBgActive = 0;
            this.renderHeroShell();
            await this.showHeroAt(this.heroIndex, false);
            this.startHeroRotation();
        } catch (e) {
            console.error('initHero error:', e);
        }
    };

    app.renderHeroShell = function () {
        if (!this._heroWrapper) return;
        this._heroWrapper.innerHTML = `
            <div class="hero">
                <div class="hero-bg-layers">
                    <div class="hero-bg-layer active" data-layer="0">
                        <img class="hero-img" src="" alt="" loading="lazy">
                    </div>
                    <div class="hero-bg-layer" data-layer="1">
                        <img class="hero-img" src="" alt="" loading="lazy">
                    </div>
                </div>
                <div class="hero-overlay"></div>
                <div class="hero-play-central"><div class="play-icon-big"><i class="fa-solid fa-play"></i></div></div>
                <div class="hero-content">
                    <h1></h1>
                    <div class="hero-genres"></div>
                    <div class="hero-meta"></div>
                    <div class="hero-actions">
                        <button class="btn-play" id="heroPlayBtn">
                            <span><i class="fa-solid fa-play"></i></span> REGARDER
                        </button>
                        <button class="btn-info" id="heroInfoBtn">
                            <span><i class="fa-solid fa-circle-info"></i></span> PLUS D'INFOS
                        </button>
                    </div>
                </div>
            </div>
        `;

        const heroPlayBtn = document.getElementById('heroPlayBtn');
        if (heroPlayBtn) {
            heroPlayBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = this.heroPool[this.heroIndex];
                if (!item) return;
                const type = item.title ? 'movie' : 'tv';
                openPlayer(item.id, type, item.title || item.name);
            });
        }

        const heroInfoBtn = document.getElementById('heroInfoBtn');
        if (heroInfoBtn) {
            heroInfoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = this.heroPool[this.heroIndex];
                if (!item) return;
                const type = item.title ? 'movie' : 'tv';
                openPlayer(item.id, type, item.title || item.name);
            });
        }
    };

    app.startHeroRotation = function () {
        this.stopHeroRotation();
        if (this.heroPool.length <= 1) return;

        const rotate = async () => {
            if (this.state.currentView !== 'home') return;
            this.heroAbortController?.abort();
            this.heroAbortController = new AbortController();
            this.heroIndex = (this.heroIndex + 1) % this.heroPool.length;
            await this.showHeroAt(this.heroIndex, true);
            this.heroTimeout = setTimeout(rotate, HERO_ROTATION_INTERVAL);
        };
        this.heroTimeout = setTimeout(rotate, HERO_ROTATION_INTERVAL);
    };

    app.showHeroAt = async function (index, animate = true) {
        const hero = this._heroWrapper.querySelector('.hero');
        if (!hero) return;

        const item = this.heroPool[index];
        const type = item.title ? 'movie' : 'tv';
        const title = item.title || item.name;
        const details = await TMDB.getDetails(item.id, type, this.heroAbortController?.signal).catch(() => null);
        if (this.heroAbortController?.signal.aborted) return;

        const layers = hero.querySelectorAll('.hero-bg-layer');
        const nextLayer = 1 - this.heroBgActive;
        const nextImg = layers[nextLayer].querySelector('img');
        nextImg.src = CONFIG.BACKDROP_URL + item.backdrop_path;
        nextImg.alt = title;

        await waitForImage(nextImg);

        layers[this.heroBgActive].classList.remove('active');
        layers[nextLayer].classList.add('active');
        this.heroBgActive = nextLayer;

        const content = hero.querySelector('.hero-content');
        if (animate) content.classList.add('hero-content-fade');

        const updateContent = () => {
            hero.querySelector('h1').textContent = title;

            const genres = details?.genres?.slice(0, 3) || [];
            hero.querySelector('.hero-genres').innerHTML = genres.length
                ? genres.map(g => `<span class="hero-genre">${escapeHtml(g.name)}</span>`).join('')
                : '';

            const year = (item.release_date || item.first_air_date || '').split('-')[0];
            const heroMetaEl = hero.querySelector('.hero-meta');
            if (heroMetaEl) {
                heroMetaEl.innerHTML = `
                    <span class="hero-rating"><i class="fa-solid fa-star"></i> ${item.vote_average != null ? item.vote_average.toFixed(1) : 'N/A'}</span>
                    ${year ? `<span>${year}</span>` : ''}
                `;
            }

            if (animate) content.classList.remove('hero-content-fade');
        };

        if (animate) setTimeout(updateContent, 350);
        else updateContent();
    };
}
