import CONFIG from '../config.js';
import TMDB from '../services/tmdb.js';
import { addRecentlyViewed, getLastSource, setLastSource } from '../services/storage.js';
import { escapeHtml, getPosterUrl } from '../utils/helpers.js';
import { renderCastSkeleton, renderCastHTML, renderRelatedSkeleton, renderRelatedHTML, renderSourceSkeleton, renderSourceBar, renderEpisodesPicker } from '../components/modal.js';
import { t } from '../i18n/index.js';

let _app;
let _detailId = '';
let _detailType = '';
let _detailTitle = '';
let _detailSeason = 1;
let _detailEpisode = 1;
let _detailImdbId = '';

export function initDetailPage(app) {
    _app = app;
}

export async function mountDetailPage(id, type, title, season = 1, episode = 1) {
    const container = document.getElementById('movie-detail-page');
    if (!container) return;

    container.style.display = 'block';
    container.scrollTop = 0;

    _detailId = id;
    _detailType = type;
    _detailTitle = title;
    _detailSeason = season;
    _detailEpisode = episode;
    _detailImdbId = '';

    container.innerHTML = renderDetailSkeleton();
    window.scrollTo(0, 0);

    const details = await TMDB.getDetails(id, type);
    if (!details) {
        container.innerHTML = `<div class="detail-error">${t('player.noDescription')}</div>`;
        return;
    }

    const tmdbTitle = details.title || details.name || title;
    _detailTitle = tmdbTitle;

    const imdbId = details?.external_ids?.imdb_id || '';
    _detailImdbId = imdbId;

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

    const lastSource = getLastSource();
    const sourceNames = Object.keys(CONFIG.SOURCES);
    const defaultSource = lastSource && sourceNames.includes(lastSource) ? lastSource : sourceNames[0];
    const defaultSourceIndex = sourceNames.indexOf(defaultSource);

    const posterUrl = getPosterUrl(details.poster_path, CONFIG.IMG_URL);
    const backdropUrl = details.backdrop_path
        ? `https://image.tmdb.org/t/p/original${details.backdrop_path}`
        : posterUrl;
    const year = (details.release_date || details.first_air_date || '').split('-')[0];
    const rating = details.vote_average != null ? details.vote_average.toFixed(1) : t('player.na');
    const runtime = (details.runtime || details.episode_run_time?.[0] || '?') + ` ${t('player.minutes')}`;
    const overview = details.overview || t('player.noDescription');
    const escapedTitle = escapeHtml(tmdbTitle);

    const inWatchlist = _app.isInWatchlist(id);
    const watchlistIcon = inWatchlist ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark';
    const watchlistText = inWatchlist ? t('player.removeWatchlist') : t('player.addWatchlist');

    const castHTML = type === 'tv'
        ? renderEpisodesPicker(id, details.seasons, season, title)
        : renderCastHTML(details.credits?.cast);
    const relatedHTML = renderRelatedHTML(details.similar?.results, type);
    const sourceBarHTML = renderSourceBar(sourceNames, defaultSourceIndex, id, imdbId, type, season, episode);

    const defaultUrl = CONFIG.SOURCES[defaultSource]?.(id, imdbId, type, season, episode) || '';

    container.innerHTML = `
        <div class="detail-backdrop" style="background-image:url('${backdropUrl}')">
            <div class="detail-backdrop-overlay"></div>
        </div>
        <div class="detail-inner">
            <div class="detail-main">
                <div class="detail-poster">
                    <img src="${posterUrl}" alt="${escapedTitle}" loading="lazy">
                </div>
                <div class="detail-info">
                    <h2 class="detail-title">${escapedTitle}</h2>
                    <div class="meta-tags">
                        <span class="detail-meta">${escapeHtml(year)}</span>
                        <span class="detail-meta rating-tag"><i class="fa-solid fa-star"></i> ${escapeHtml(rating)}</span>
                        <span class="detail-meta">${escapeHtml(runtime)}</span>
                        <button id="detailPageWatchlistBtn" class="btn-watchlist ${inWatchlist ? 'in-watchlist' : ''}"><i class="${watchlistIcon}"></i> ${watchlistText}</button>
                    </div>
                    <p class="detail-overview">${escapeHtml(overview)}</p>
                    <div class="share-section">
                        <span>${t('player.shareLabel')}</span>
                        <div class="share-buttons">
                            <button class="share-btn wa" data-platform="whatsapp" data-detail-share>WhatsApp</button>
                            <button class="share-btn tg" data-platform="telegram" data-detail-share>Telegram</button>
                            <button class="share-btn fb" data-platform="facebook" data-detail-share>Facebook</button>
                        </div>
                    </div>
                    <div class="cast-list" id="detailPageCast">${castHTML}</div>
                </div>
            </div>
            <div class="detail-player-section">
                <h3 class="detail-section-title"><i class="fa-solid fa-globe"></i> Where to Watch</h3>
                <div class="source-bar" id="detailPageSourceBar">${sourceBarHTML}</div>
                <div class="player-wrapper">
                    <div class="player-loading" id="detailPageLoading">
                        <div class="spinner"></div>
                        <span class="player-loading-text">${t('player.loading')}</span>
                    </div>
                    <iframe id="detailPageFrame" src="${escapeHtml(defaultUrl)}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen referrerpolicy="origin"></iframe>
                </div>
            </div>
            <div class="detail-related-section">
                <h3 class="detail-section-title"><i class="fa-solid fa-list"></i> ${t('player.related')}</h3>
                <div class="detail-related-grid" id="detailPageRelated">${relatedHTML}</div>
            </div>
        </div>
    `;

    const watchlistBtn = document.getElementById('detailPageWatchlistBtn');
    if (watchlistBtn) {
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

    if (type === 'tv') {
        loadEpisodes(id, season, tmdbTitle);
    }

    const detailFrame = document.getElementById('detailPageFrame');
    if (detailFrame) {
        detailFrame.addEventListener('load', () => {
            const loading = document.getElementById('detailPageLoading');
            if (loading) loading.classList.remove('active');
        });
    }

    attachDetailListeners();
}

function renderDetailSkeleton() {
    return `
        <div class="detail-backdrop">
            <div class="detail-backdrop-overlay"></div>
        </div>
        <div class="detail-inner">
            <div class="detail-main">
                <div class="detail-poster skeleton" style="aspect-ratio:2/3; border-radius:20px;"></div>
                <div class="detail-info">
                    <div class="modal-skeleton-title skeleton" style="display:inline-block"></div>
                    <div class="meta-tags" style="margin:15px 0 25px">
                        <span class="modal-skeleton-meta-item skeleton"></span>
                        <span class="modal-skeleton-meta-item skeleton"></span>
                        <span class="modal-skeleton-meta-item skeleton"></span>
                    </div>
                    <div class="modal-skeleton-desc">
                        <div class="modal-skeleton-line skeleton"></div>
                        <div class="modal-skeleton-line skeleton"></div>
                        <div class="modal-skeleton-line skeleton"></div>
                    </div>
                    ${renderCastSkeleton()}
                </div>
            </div>
            <div class="detail-player-section">
                <div class="source-skeleton"></div>
                <div class="player-wrapper" style="aspect-ratio:16/9; background:#000; border-radius:16px;">
                    <div class="skeleton" style="width:100%;height:100%;border-radius:16px;"></div>
                </div>
            </div>
            <div class="detail-related-section">
                <div class="related-skeleton"></div>
            </div>
        </div>
    `;
}

function attachDetailListeners() {
    const container = document.getElementById('movie-detail-page');
    if (!container) return;

    container.querySelectorAll('.source-btn[data-source-url]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const url = btn.dataset.sourceUrl;
            const name = btn.dataset.sourceName;
            setDetailSource(url, name);
        });
    });

    container.querySelectorAll('.source-btn-newtab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.open(btn.dataset.newtabUrl, '_blank');
        });
    });

    container.querySelectorAll('.related-card[data-id]').forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            const { id, type, title } = card.dataset;
            mountDetailPage(id, type, title);
        });
    });

    container.querySelectorAll('.episode-item[data-id]').forEach(ep => {
        ep.addEventListener('click', (e) => {
            e.preventDefault();
            const { id, type, title, season, episode } = ep.dataset;
            mountDetailPage(id, type, title, parseInt(season), parseInt(episode));
        });
    });

    container.querySelectorAll('#seasonSelect').forEach(sel => {
        sel.addEventListener('change', () => {
            const id = sel.dataset.seasonId;
            const title = sel.dataset.seasonTitle;
            loadEpisodes(id, parseInt(sel.value), title);
        });
    });

    container.querySelectorAll('[data-episode-dir]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const dir = parseInt(btn.dataset.episodeDir);
            navigateEpisode(dir);
        });
    });

    container.querySelectorAll('.share-btn[data-platform]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            shareMovie(btn.dataset.platform);
        });
    });
}

function setDetailSource(url, sourceName) {
    const container = document.getElementById('movie-detail-page');
    const frame = document.getElementById('detailPageFrame');
    const loading = document.getElementById('detailPageLoading');
    setLastSource(sourceName);
    if (loading) loading.classList.add('active');
    if (frame) frame.src = url;
    if (container) {
        container.querySelectorAll('.source-btn').forEach(btn => {
            btn.classList.toggle('active', btn.textContent === sourceName);
        });
    }
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
    const data = await TMDB.getSeason(id, seasonNumber);
    if (data && data.episodes) {
        _detailSeason = seasonNumber;
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
        const curEp = _detailEpisode;
        const curIdx = data.episodes.findIndex(ep => ep.episode_number === curEp);
        if (navLabel) navLabel.textContent = `${t('player.ep')} ${curEp} / ${data.episodes.length}`;
        if (prevBtn) prevBtn.disabled = curIdx <= 0;
        if (nextBtn) nextBtn.disabled = curIdx >= data.episodes.length - 1;
    }
}

function navigateEpisode(dir) {
    const list = document.querySelectorAll('.episode-item[data-id]');
    const curEp = _detailEpisode;
    let idx = -1;
    list.forEach((ep, i) => {
        if (parseInt(ep.dataset.episode) === curEp) idx = i;
    });
    if (idx === -1) return;
    const next = idx + dir;
    if (next < 0 || next >= list.length) return;
    const ep = list[next];
    mountDetailPage(_detailId, 'tv', _detailTitle, parseInt(ep.dataset.season), parseInt(ep.dataset.episode));
}

function shareMovie(platform) {
    const text = encodeURIComponent(t('share.text', { title: _detailTitle }) + '\n\n');
    const url = encodeURIComponent(window.location.href);
    const links = {
        whatsapp: `https://api.whatsapp.com/send?text=${text}${url}`,
        telegram: `https://t.me/share/url?url=${url}&text=${text}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`
    };
    if (links[platform]) window.open(links[platform], '_blank');
}

document.addEventListener('fullscreenchange', () => {
    const frame = document.getElementById('detailPageFrame');
    if (!frame) return;
});
