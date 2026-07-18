import CONFIG from '../config.js';
import TMDB from './tmdb.js';
import { addRecentlyViewed, getContinueWatching, getLastSource, setLastSource } from './storage.js';
import { escapeHtml } from '../utils/helpers.js';
import { PLAYER_LOADING_TIMEOUT, WATCH_INTERVAL, MAX_CONTINUE_WATCHING } from '../utils/constants.js';
import { renderCastSkeleton, renderCastHTML, renderRelatedSkeleton, renderRelatedHTML, renderSourceSkeleton, renderSourceBar, renderEpisodesPicker } from '../components/modal.js';
import { t } from '../i18n/index.js';

let _app;
let _playerSourceNames = [];
let _playerSourceIndex = 0;
let _playerLoadingTimeout = null;
let _watchInterval = null;
let _episodeList = [];
let _playerId = '';
let _playerType = '';
let _playerTitle = '';
let _playerSeason = 1;
let _playerEpisode = 1;
let _playerImdbId = '';
let _currentShareData = null;
let _currentWatchSession = null;

export async function openPlayer(id, type, title, season = 1, episode = 1) {
    try {
    console.log(`FILMIX: Opening ${type} with TMDB ID ${id} | S${season}E${episode}`);
    const suggestionsBox = document.getElementById('searchSuggestions');
    if (suggestionsBox) suggestionsBox.style.display = 'none';
    const modal = document.getElementById('playerModal');
    if (!modal) return;
    const isInitialOpen = !modal.classList.contains('open');
    modal.classList.add('open');

    _playerId = id;
    _playerType = type;
    _playerTitle = title;
    _playerSeason = season;
    _playerEpisode = episode;
    _playerImdbId = '';

    let activeSeason = season;
    let activeEpisode = episode;
    const continueWatching = getContinueWatching();
    const savedSession = continueWatching.find(item => item.id.toString() === id.toString());

    if (isInitialOpen && savedSession) {
        activeSeason = savedSession.season || 1;
        activeEpisode = savedSession.episode || 1;
        _playerSeason = activeSeason;
        _playerEpisode = activeEpisode;
    }

    const detailTitleEl = document.getElementById('detailTitle');
    if (detailTitleEl) detailTitleEl.textContent = title + (type === 'tv' ? ` - ${t('player.season')} ${activeSeason} ${t('player.ep')} ${activeEpisode}` : '');

    const detailYear = document.getElementById('detailYear');
    const detailRating = document.getElementById('detailRating');
    const detailRuntime = document.getElementById('detailRuntime');
    const detailOverview = document.getElementById('detailOverview');
    const detailCast = document.getElementById('detailCast');
    const relatedGrid = document.getElementById('relatedGrid');
    const sourceBar = document.getElementById('sourceBar');

    if (detailYear) detailYear.innerHTML = '<span class="modal-skeleton-meta-item skeleton"></span>';
    if (detailRating) detailRating.innerHTML = '<span class="modal-skeleton-meta-item skeleton"></span>';
    if (detailRuntime) detailRuntime.innerHTML = '<span class="modal-skeleton-meta-item skeleton"></span>';
    if (detailOverview) detailOverview.innerHTML = `
        <div class="modal-skeleton-desc">
            <div class="modal-skeleton-line skeleton"></div>
            <div class="modal-skeleton-line skeleton"></div>
            <div class="modal-skeleton-line skeleton"></div>
        </div>
    `;
    if (detailCast) detailCast.innerHTML = renderCastSkeleton();
    if (relatedGrid) relatedGrid.innerHTML = renderRelatedSkeleton();
    if (sourceBar) sourceBar.innerHTML = renderSourceSkeleton();

    let details = await TMDB.getDetails(id, type).catch(() => null);
    if (!details && type === 'movie') {
        console.log(`FILMIX: ${id} not found as movie, retrying as TV`);
        _playerType = 'tv';
        type = 'tv';
        details = await TMDB.getDetails(id, 'tv').catch(() => null);
    }
    const imdbId = details?.external_ids?.imdb_id || '';
    _playerImdbId = imdbId;

    const lastSource = getLastSource();
    const sourceNames = Object.keys(CONFIG.SOURCES);
    const defaultSource = lastSource && sourceNames.includes(lastSource) ? lastSource : sourceNames[0];
    const defaultSourceIndex = sourceNames.indexOf(defaultSource);

    if (sourceBar) sourceBar.innerHTML = renderSourceBar(sourceNames, defaultSourceIndex, id, imdbId, type, activeSeason, activeEpisode);

    const sourceFn = CONFIG.SOURCES[defaultSource];
    const defaultUrl = sourceFn ? sourceFn(id, imdbId, type, activeSeason, activeEpisode) : '';
    setPlayerSource(defaultUrl, defaultSource);

    document.title = t('doc.player', { title });
    _currentShareData = { title, url: window.location.href, id };

    if (details) {
        const recentlyViewedItem = {
            id: details.id.toString(),
            type: type,
            title: details.title || details.name,
            name: details.name,
            poster_path: details.poster_path,
            vote_average: details.vote_average,
            release_date: details.release_date,
            first_air_date: details.first_air_date
        };

        addRecentlyViewed(recentlyViewedItem);

        const detailOverviewEl = document.getElementById('detailOverview');
        if (detailOverviewEl) detailOverviewEl.textContent = details.overview || t('player.noDescription');
        const detailYearEl = document.getElementById('detailYear');
        if (detailYearEl) detailYearEl.textContent = (details.release_date || details.first_air_date || '').split('-')[0];
        const detailRatingEl = document.getElementById('detailRating');
        if (detailRatingEl) detailRatingEl.innerHTML = '<i class="fa-solid fa-star"></i> ' + (details.vote_average != null ? details.vote_average.toFixed(1) : t('player.na'));
        const detailRuntimeEl = document.getElementById('detailRuntime');
        if (detailRuntimeEl) detailRuntimeEl.textContent = (details.runtime || details.episode_run_time?.[0] || '?') + ` ${t('player.minutes')}`;

        const watchlistBtn = document.getElementById('watchlistBtn');
        if (watchlistBtn) {
            const inWatchlist = _app.isInWatchlist(id);
            if (inWatchlist) {
                watchlistBtn.classList.add('in-watchlist');
                watchlistBtn.innerHTML = `<i class="fa-solid fa-bookmark"></i> ${t('player.removeWatchlist')}`;
            } else {
                watchlistBtn.classList.remove('in-watchlist');
                watchlistBtn.innerHTML = `<i class="fa-regular fa-bookmark"></i> ${t('player.addWatchlist')}`;
            }

            watchlistBtn.onclick = () => {
                const item = {
                    id: details.id.toString(),
                    title: details.title,
                    name: details.name,
                    poster_path: details.poster_path,
                    vote_average: details.vote_average,
                    release_date: details.release_date,
                    first_air_date: details.first_air_date
                };
                const wasAdded = _app.toggleWatchlist(item);
                if (wasAdded) {
                    watchlistBtn.classList.add('in-watchlist');
                    watchlistBtn.innerHTML = `<i class="fa-solid fa-bookmark"></i> ${t('player.removeWatchlist')}`;
                } else {
                    watchlistBtn.classList.remove('in-watchlist');
                    watchlistBtn.innerHTML = `<i class="fa-regular fa-bookmark"></i> ${t('player.addWatchlist')}`;
                }
            };
        }

        const episodesContainer = document.getElementById('detailCast');
        if (type === 'tv') {
            if (episodesContainer) episodesContainer.innerHTML = renderEpisodesPicker(id, details.seasons, activeSeason, title);
            loadEpisodes(id, activeSeason, title);
        } else {
            if (episodesContainer) episodesContainer.innerHTML = renderCastHTML(details.credits?.cast);
        }

        const relatedGridEl = document.getElementById('relatedGrid');
        if (relatedGridEl) relatedGridEl.innerHTML = renderRelatedHTML(details.similar?.results, type);

        if (_watchInterval) {
            clearInterval(_watchInterval);
        }

        let initialTime = 0;
        if (savedSession && (type === 'movie' || (savedSession.season === activeSeason && savedSession.episode === activeEpisode))) {
            initialTime = savedSession.playbackTime || 0;
        }

        const duration = (type === 'movie' ? details.runtime : (details.episode_run_time?.[0] || 45)) * 60 || 120 * 60;

        _currentWatchSession = {
            id: details.id.toString(),
            type: type,
            title: details.title || details.name,
            poster_path: details.poster_path,
            season: type === 'tv' ? activeSeason : null,
            episode: type === 'tv' ? activeEpisode : null,
            playbackTime: initialTime,
            duration: duration
        };

        _watchInterval = setInterval(() => {
            const modalCheck = document.getElementById('playerModal');
            if (!modalCheck || !modalCheck.classList.contains('open')) {
                clearInterval(_watchInterval);
                _watchInterval = null;
                return;
            }

            _currentWatchSession.playbackTime += 3;
            if (_currentWatchSession.playbackTime > _currentWatchSession.duration) {
                _currentWatchSession.playbackTime = _currentWatchSession.duration;
            }

            const list = getContinueWatching();
            const index = list.findIndex(item => item.id.toString() === _currentWatchSession.id.toString());
            if (index > -1) {
                list.splice(index, 1);
            }

            list.unshift({
                id: _currentWatchSession.id,
                type: _currentWatchSession.type,
                title: _currentWatchSession.title,
                poster_path: _currentWatchSession.poster_path,
                season: _currentWatchSession.season,
                episode: _currentWatchSession.episode,
                playbackTime: _currentWatchSession.playbackTime,
                duration: _currentWatchSession.duration,
                lastWatchedDate: Date.now()
            });

            if (list.length > MAX_CONTINUE_WATCHING) {
                list.pop();
            }

            localStorage.setItem('filmix_continue_watching', JSON.stringify(list));
        }, WATCH_INTERVAL);
    }
    } catch (e) {
        console.error('openPlayer error:', e);
    }
}

export function closePlayer() {
    const playerModal = document.getElementById('playerModal');
    if (playerModal) playerModal.classList.remove('open');
    const playerFrame = document.getElementById('playerFrame');
    if (playerFrame) playerFrame.src = '';
    document.title = t('doc.closed');

    if (_watchInterval) {
        clearInterval(_watchInterval);
        _watchInterval = null;
    }

    if (_app && _app.state.currentView === 'home' && _app.state.page === 1 && !_app.state.currentGenre) {
        _app.updateContinueWatchingRow();
        _app.updateRecentlyViewedRow();
    }
}

function setPlayerSource(url, sourceName) {
    const frame = document.getElementById('playerFrame');
    const loading = document.getElementById('playerLoading');

    setLastSource(sourceName);

    if (loading) loading.classList.add('active');
    clearTimeout(_playerLoadingTimeout);
    _playerLoadingTimeout = setTimeout(() => {
        document.getElementById('playerLoading')?.classList.remove('active');
    }, PLAYER_LOADING_TIMEOUT);

    if (frame) frame.src = url;

    document.querySelectorAll('.source-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent === sourceName);
    });

    _playerSourceIndex = _playerSourceNames.indexOf(sourceName);
}

function navigateEpisode(dir) {
    if (!_episodeList || _episodeList.length === 0) return;
    const cur = _playerEpisode;
    const idx = _episodeList.findIndex(ep => ep.episode_number === cur);
    if (idx === -1) return;
    const next = idx + dir;
    if (next < 0 || next >= _episodeList.length) return;
    const ep = _episodeList[next];
    openPlayer(_playerId, 'tv', _playerTitle, _playerSeason, ep.episode_number);
}

function shareMovie(platform) {
    const data = _currentShareData || { title: 'DRAMA MIX', url: window.location.href };
    const text = encodeURIComponent(t('share.text', { title: data.title }) + '\n\n');
    const url = encodeURIComponent(data.url);

    const links = {
        whatsapp: `https://api.whatsapp.com/send?text=${text}${url}`,
        telegram: `https://t.me/share/url?url=${url}&text=${text}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`
    };

    if (links[platform]) window.open(links[platform], '_blank');
}

async function loadEpisodes(id, seasonNumber, title) {
    const list = document.getElementById('episodeList');
    if (!list) return;
    list.innerHTML = `
        <div class="episode-skeleton">
            <div class="episode-skeleton-item skeleton"></div>
            <div class="episode-skeleton-item skeleton"></div>
            <div class="episode-skeleton-item skeleton"></div>
            <div class="episode-skeleton-item skeleton"></div>
            <div class="episode-skeleton-item skeleton"></div>
            <div class="episode-skeleton-item skeleton"></div>
        </div>
    `;

    const data = await TMDB.getSeason(id, seasonNumber).catch(() => null);
    if (data && data.episodes) {
        _episodeList = data.episodes;
        _playerSeason = seasonNumber;

        list.innerHTML = data.episodes.map(ep => {
            const epName = escapeHtml(ep.name || '');
            return `
                <div class="episode-item" data-id="${id}" data-type="tv" data-title="${escapeHtml(title)}" data-season="${seasonNumber}" data-episode="${ep.episode_number}">
                    <span class="ep-num">${t('player.ep')} ${ep.episode_number}</span>
                    <span class="nav-text">${epName}</span>
                </div>
            `;
        }).join('');

        const navLabel = document.getElementById('episodeNavLabel');
        const prevBtn = document.getElementById('prevEpBtn');
        const nextBtn = document.getElementById('nextEpBtn');
        const curEp = _playerEpisode;
        const curIdx = data.episodes.findIndex(ep => ep.episode_number === curEp);
        if (navLabel) navLabel.textContent = `${t('player.ep')} ${curEp} / ${data.episodes.length}`;
        if (prevBtn) prevBtn.disabled = curIdx <= 0;
        if (nextBtn) nextBtn.disabled = curIdx >= data.episodes.length - 1;
    }
}

function setupDelegatedListeners() {
    document.addEventListener('click', (e) => {
        const sourceBtn = e.target.closest('.source-btn[data-source-url]');
        if (sourceBtn) {
            e.preventDefault();
            setPlayerSource(sourceBtn.dataset.sourceUrl, sourceBtn.dataset.sourceName);
            return;
        }

        const newTabBtn = e.target.closest('.source-btn-newtab');
        if (newTabBtn) {
            e.preventDefault();
            window.open(newTabBtn.dataset.newtabUrl, '_blank');
            return;
        }

        const epNavBtn = e.target.closest('[data-episode-dir]');
        if (epNavBtn) {
            e.preventDefault();
            navigateEpisode(parseInt(epNavBtn.dataset.episodeDir));
            return;
        }

        const episodeItem = e.target.closest('.episode-item[data-id]');
        if (episodeItem) {
            e.preventDefault();
            const { id, type, title, season, episode } = episodeItem.dataset;
            openPlayer(id, type, title, parseInt(season), parseInt(episode));
            return;
        }

        const relatedCard = e.target.closest('.related-card[data-id]');
        if (relatedCard) {
            e.preventDefault();
            const { id, type, title } = relatedCard.dataset;
            openPlayer(id, type, title);
            return;
        }

        const rowCard = e.target.closest('.row-card[data-id]:not(.continue-card)');
        if (rowCard) {
            e.preventDefault();
            const { id, type, title } = rowCard.dataset;
            openPlayer(id, type, title);
            return;
        }

        const continueCard = e.target.closest('.continue-card[data-id]');
        if (continueCard) {
            e.preventDefault();
            const { id, type, title, season, episode } = continueCard.dataset;
            openPlayer(id, type, title, parseInt(season) || 1, parseInt(episode) || 1);
            return;
        }

        const favBtn = e.target.closest('.btn-fav[data-fav-id]');
        if (favBtn) {
            e.stopPropagation();
            const item = {
                id: favBtn.dataset.favId,
                type: favBtn.dataset.favType,
                title: favBtn.dataset.favTitle,
                name: favBtn.dataset.favName || '',
                poster_path: favBtn.dataset.favPoster || '',
                vote_average: parseFloat(favBtn.dataset.favRating) || 0,
                release_date: favBtn.dataset.favRelease || '',
                first_air_date: favBtn.dataset.favAir || ''
            };
            _app.toggleFavorite(item, favBtn);
            return;
        }

        const closeBtn = e.target.closest('.modal-close');
        if (closeBtn) {
            e.preventDefault();
            closePlayer();
            return;
        }

        const shareBtn = e.target.closest('.share-btn[data-platform]');
        if (shareBtn) {
            e.preventDefault();
            shareMovie(shareBtn.dataset.platform);
            return;
        }
    });

    document.addEventListener('change', (e) => {
        const seasonSelect = e.target.closest('#seasonSelect[data-season-id]');
        if (seasonSelect) {
            const id = seasonSelect.dataset.seasonId;
            const title = seasonSelect.dataset.seasonTitle;
            loadEpisodes(id, parseInt(seasonSelect.value), title);
        }
    });

    document.getElementById('playerFrame')?.addEventListener('load', () => {
        document.getElementById('playerLoading')?.classList.remove('active');
        clearTimeout(_playerLoadingTimeout);
    });

    document.getElementById('fullscreenBtn')?.addEventListener('click', toggleFullscreen);

    document.addEventListener('fullscreenchange', () => {
        const icon = document.getElementById('fullscreenBtn')?.querySelector('i');
        if (!icon) return;
        icon.className = document.fullscreenElement ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
    });

    document.addEventListener('keydown', (e) => {
        if (!document.getElementById('playerModal')?.classList.contains('open')) return;
        if (e.key === 'Escape') { e.preventDefault(); closePlayer(); }
        else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleFullscreen(); }
        else if (e.key === 'ArrowLeft' && _playerType === 'tv') { e.preventDefault(); navigateEpisode(-1); }
        else if (e.key === 'ArrowRight' && _playerType === 'tv') { e.preventDefault(); navigateEpisode(1); }
    });
}

function toggleFullscreen() {
    const modal = document.getElementById('playerModal');
    const btn = document.getElementById('fullscreenBtn');
    const icon = btn?.querySelector('i');
    if (!document.fullscreenElement) {
        modal?.requestFullscreen?.().catch(() => {});
        if (icon) icon.className = 'fa-solid fa-compress';
    } else {
        document.exitFullscreen?.().catch(() => {});
        if (icon) icon.className = 'fa-solid fa-expand';
    }
}

export function initPlayer(app) {
    _app = app;
    _playerSourceNames = Object.keys(CONFIG.SOURCES);
    _playerSourceIndex = 0;

    setupDelegatedListeners();
}
