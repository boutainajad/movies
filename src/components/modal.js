import CONFIG from '../config.js';
import { escapeHtml, getPosterUrl } from '../utils/helpers.js';
import { RELATED_COUNT } from '../utils/constants.js';

export function renderCastSkeleton() {
    return `
        <div class="modal-skeleton-cast">
            <div class="modal-skeleton-actor skeleton"></div>
            <div class="modal-skeleton-actor skeleton"></div>
            <div class="modal-skeleton-actor skeleton"></div>
            <div class="modal-skeleton-actor skeleton"></div>
            <div class="modal-skeleton-actor skeleton"></div>
        </div>
    `;
}

export function renderCastHTML(cast) {
    return (cast || []).slice(0, 5).map(c => {
        const name = escapeHtml(c.name);
        const imgSrc = c.profile_path
            ? CONFIG.IMG_URL + c.profile_path
            : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}`;
        return `
            <div class="cast-item">
                <img src="${imgSrc}" alt="${name}" loading="lazy" decoding="async">
                <span>${name}</span>
            </div>
        `;
    }).join('');
}

export function renderRelatedSkeleton() {
    return `
        <div class="related-skeleton">
            <div class="related-skeleton-card skeleton"></div>
            <div class="related-skeleton-card skeleton"></div>
            <div class="related-skeleton-card skeleton"></div>
            <div class="related-skeleton-card skeleton"></div>
        </div>
    `;
}

export function renderRelatedHTML(results, type) {
    return (results || []).slice(0, RELATED_COUNT).map(r => {
        const title = r.title || r.name;
        const escapedTitle = escapeHtml(title);
        return `
            <div class="related-card" data-id="${r.id}" data-type="${type}" data-title="${escapedTitle}">
                <img src="${getPosterUrl(r.poster_path, CONFIG.IMG_URL)}" alt="${escapedTitle}" loading="lazy" decoding="async">
            </div>
        `;
    }).join('');
}

export function renderSourceSkeleton() {
    return `
        <div class="source-skeleton">
            <div class="source-skeleton-btn skeleton"></div>
            <div class="source-skeleton-btn skeleton"></div>
            <div class="source-skeleton-btn skeleton"></div>
            <div class="source-skeleton-btn skeleton"></div>
            <div class="source-skeleton-btn skeleton"></div>
        </div>
    `;
}

export function renderSourceBar(sourceNames, defaultSourceIndex, id, imdbId, type, season, episode) {
    const newTabUrl = CONFIG.SOURCES['S2 (Vidsrc.to)'](id, imdbId, type, season, episode);
    return sourceNames.map((name, index) => {
        const url = CONFIG.SOURCES[name](id, imdbId, type, season, episode);
        const escapedUrl = escapeHtml(url);
        const escapedName = escapeHtml(name);
        return `<button class="source-btn ${index === defaultSourceIndex ? 'active' : ''}" data-source-url="${escapedUrl}" data-source-name="${escapedName}">${escapedName}</button>`;
    }).join('') + `<button class="source-btn source-btn-newtab" style="background:#222" data-newtab-url="${escapeHtml(newTabUrl)}"><i class="fa-solid fa-globe"></i> New Tab</button>`;
}

export function renderEpisodesSkeleton() {
    return `
        <div class="episode-skeleton">
            <div class="episode-skeleton-item skeleton"></div>
            <div class="episode-skeleton-item skeleton"></div>
            <div class="episode-skeleton-item skeleton"></div>
            <div class="episode-skeleton-item skeleton"></div>
            <div class="episode-skeleton-item skeleton"></div>
            <div class="episode-skeleton-item skeleton"></div>
        </div>
    `;
}

export function renderEpisodesPicker(id, seasons, activeSeason, title) {
    const escapedTitle = escapeHtml(title);
    const seasonsHtml = (seasons || []).map(s => {
        const seasonNum = s.season_number;
        const seasonName = escapeHtml(s.name);
        return `<option value="${seasonNum}" ${seasonNum == activeSeason ? 'selected' : ''}>${seasonName}</option>`;
    }).join('');
    return `
        <div class="episodes-picker">
            <select id="seasonSelect" data-season-id="${escapeHtml(String(id))}" data-season-title="${escapedTitle}">${seasonsHtml}</select>
            <div id="episodeList" class="episode-list">
                ${renderEpisodesSkeleton()}
            </div>
            <div class="episode-nav" id="episodeNav">
                <button class="episode-nav-btn" id="prevEpBtn" data-episode-dir="-1"><i class="fa-solid fa-chevron-left"></i> Précédent</button>
                <span class="episode-nav-label" id="episodeNavLabel">EP ?</span>
                <button class="episode-nav-btn" id="nextEpBtn" data-episode-dir="1">Suivant <i class="fa-solid fa-chevron-right"></i></button>
            </div>
        </div>
    `;
}
