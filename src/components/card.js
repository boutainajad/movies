import CONFIG from '../config.js';
import { escapeHtml, getPosterUrl, getYear } from '../utils/helpers.js';
import { getContinueWatching, getRecentlyViewed } from '../services/storage.js';
import { t } from '../i18n/index.js';

export function attachCard(app) {
    app.renderRow = function (title, items, container) {
        if (!items || !Array.isArray(items) || !container) return;
        const row = document.createElement('div');
        row.className = 'movie-row-container';
        row.innerHTML = `
            <h3 class="row-title">${title}</h3>
            <div class="movie-row">
                ${items.map(item => {
                    const t = item.title || item.name;
                    const escapedT = escapeHtml(t);
                    const poster = getPosterUrl(item.poster_path, CONFIG.IMG_URL);
                    const type = item.type || (item.name || item.first_air_date ? 'tv' : 'movie');
                    const isFav = this.isFavorite(item.id, type);
                    const year = getYear(item);
                    const escapedYear = escapeHtml(year);
                    return `
                        <div class="row-card" data-id="${item.id}" data-type="${type}" data-title="${escapedT}">
                            <img src="${poster}" alt="${escapedT}" loading="lazy">
                            <div class="row-card-overlay">
                                <div class="row-card-rating"><i class="fa-solid fa-star"></i> ${item.vote_average.toFixed(1)}</div>
                                <div class="row-card-quick">
                                    <span>${escapedYear}</span>
                                    <span>${t(type === 'movie' ? 'common.movie' : 'common.series')}</span>
                                </div>
                                <div class="row-card-play"><i class="fa-solid fa-play"></i></div>
                            </div>
                            <button class="btn-fav ${isFav ? 'active' : ''}" title="${isFav ? t('player.removeFav') : t('player.addFav')}" data-fav-id="${escapeHtml(String(item.id))}" data-fav-type="${type}" data-fav-title="${escapedT}" data-fav-name="${escapeHtml(item.name || '')}" data-fav-poster="${escapeHtml(item.poster_path || '')}" data-fav-rating="${item.vote_average || ''}" data-fav-release="${escapeHtml(item.release_date || '')}" data-fav-air="${escapeHtml(item.first_air_date || '')}">
                                <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i>
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        container.appendChild(row);
    };

    app.renderContinueWatchingRow = function (items, container) {
        if (!items || !Array.isArray(items) || !container) return;
        let row = document.getElementById('continue-watching-row');
        if (!row) {
            row = document.createElement('div');
            row.id = 'continue-watching-row';
            row.className = 'movie-row-container continue-watching-row';
            container.insertBefore(row, container.firstChild);
        }

        if (items.length === 0) {
            row.remove();
            return;
        }

        row.innerHTML = `
            <h3 class="row-title"><i class="fa-solid fa-clock-rotate-left"></i> ${t('home.continueWatching')}</h3>
            <div class="movie-row">
                ${items.map(item => {
                    const title = item.title || '';
                    const escapedTitle = escapeHtml(title);
                    const poster = getPosterUrl(item.poster_path, CONFIG.IMG_URL);
                    const type = item.type;
                    const epInfo = type === 'tv' ? `${t('player.season')} ${item.season} ${t('player.ep')} ${item.episode}` : t('common.movie');
                    const progressPercent = item.duration ? Math.min(100, Math.round((item.playbackTime / item.duration) * 100)) : 0;
                    const year = getYear(item);
                    const escapedYear = escapeHtml(year);

                    return `
                        <div class="row-card continue-card" data-id="${item.id}" data-type="${type}" data-title="${escapedTitle}" data-season="${item.season || 1}" data-episode="${item.episode || 1}">
                            <img src="${poster}" alt="${escapedTitle}" loading="lazy">
                            <div class="row-card-overlay">
                                <div class="row-card-rating">${epInfo}</div>
                                <div class="row-card-quick">
                                    <span>${escapedYear}</span>
                                    <span>${t(type === 'movie' ? 'common.movie' : 'common.series')}</span>
                                </div>
                                <div class="row-card-play"><i class="fa-solid fa-play"></i></div>
                            </div>
                            <div class="progress-container">
                                <div class="progress-bar" style="width: ${progressPercent}%"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    };

    app.updateContinueWatchingRow = function () {
        const sectionsContainer = document.getElementById('home-sections');
        if (!sectionsContainer) return;
        const continueWatching = getContinueWatching();
        this.renderContinueWatchingRow(continueWatching, sectionsContainer);
    };

    app.renderRecentlyViewedRow = function (items, container) {
        if (!items || !Array.isArray(items) || !container) return;
        let row = document.getElementById('recently-viewed-row');
        if (!row) {
            row = document.createElement('div');
            row.id = 'recently-viewed-row';
            row.className = 'movie-row-container';

            const continueRow = document.getElementById('continue-watching-row');
            if (continueRow && continueRow.parentNode) {
                continueRow.parentNode.insertBefore(row, continueRow.nextSibling);
            } else {
                container.insertBefore(row, container.firstChild);
            }
        }

        if (items.length === 0) {
            row.remove();
            return;
        }

        row.innerHTML = `
            <h3 class="row-title"><i class="fa-solid fa-clock"></i> ${t('home.recentlyViewed')}</h3>
            <div class="movie-row">
                ${items.map(item => {
                    const title = item.title || item.name;
                    const escapedTitle = escapeHtml(title);
                    const poster = getPosterUrl(item.poster_path, CONFIG.IMG_URL);
                    let type = item.type || (item.name || item.first_air_date ? 'tv' : 'movie');
                    const rating = item.vote_average ? item.vote_average.toFixed(1) : t('common.na');
                    const year = getYear(item);
                    const escapedYear = escapeHtml(year);
                    return `
                        <div class="row-card" data-id="${item.id}" data-type="${type}" data-title="${escapedTitle}">
                            <img src="${poster}" alt="${escapedTitle}" loading="lazy">
                            <div class="row-card-overlay">
                                <div class="row-card-rating"><i class="fa-solid fa-star"></i> ${rating}</div>
                                <div class="row-card-quick">
                                    <span>${escapedYear}</span>
                                    <span>${t(type === 'movie' ? 'common.movie' : 'common.series')}</span>
                                </div>
                                <div class="row-card-play"><i class="fa-solid fa-play"></i></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    };

    app.updateRecentlyViewedRow = function () {
        const sectionsContainer = document.getElementById('home-sections');
        if (!sectionsContainer) return;
        const recentlyViewed = getRecentlyViewed();
        this.renderRecentlyViewedRow(recentlyViewed, sectionsContainer);
    };
}
