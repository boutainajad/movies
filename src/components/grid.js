import CONFIG from '../config.js';
import { escapeHtml, safeTitle, getPosterUrl, getYear } from '../utils/helpers.js';
import { t } from '../i18n/index.js';

export function attachGrid(app) {
    app.renderGrid = function (items) {
        if (!this._grid) return;
        this._grid.innerHTML = '';
        const fragment = document.createDocumentFragment();

        (items || []).forEach(item => {
            const title = item.title || item.name;
            const escapedTitle = escapeHtml(title);
            const poster = getPosterUrl(item.poster_path, CONFIG.IMG_URL);
            const year = getYear(item);
            const escapedYear = escapeHtml(year);
            const rating = item.vote_average ? item.vote_average.toFixed(1) : t('common.na');

            const type = item.type || (item.name || item.media_type === 'tv' || item.first_air_date ? 'tv' : 'movie');
            const typeLabel = t(type === 'movie' ? 'common.movie' : 'common.series');

            const isFav = this.isFavorite(item.id, type);
            const favItem = {
                id: item.id.toString(),
                type,
                title,
                name: item.name,
                poster_path: item.poster_path,
                vote_average: item.vote_average,
                release_date: item.release_date,
                first_air_date: item.first_air_date
            };

            const card = document.createElement('div');
            card.className = 'movie-card';
            card.onclick = () => window.app.showMovieDetail(item.id, type, safeTitle(title));
            card.innerHTML = `
                <div class="card-poster">
                    <img src="${poster}" alt="${escapedTitle}" loading="lazy" decoding="async">
                    <div class="card-rating"><i class="fa-solid fa-star"></i> ${rating}</div>
                    <div class="card-overlay">
                        <div class="card-quick-info">
                            <span><i class="fa-solid fa-star"></i> ${rating}</span>
                            <span>${escapedYear}</span>
                            <span>${typeLabel}</span>
                        </div>
                    </div>
                    <div class="card-play"><div class="play-icon"><i class="fa-solid fa-play"></i></div></div>
                    <button class="btn-fav ${isFav ? 'active' : ''}" title="${isFav ? t('player.removeFav') : t('player.addFav')}">
                        <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i>
                    </button>
                </div>
                <div class="card-info">
                    <div class="card-title">${escapedTitle}</div>
                    <div class="card-year">${escapedYear} • ${typeLabel}</div>
                </div>
            `;

            const favBtn = card.querySelector('.btn-fav');
            if (favBtn) favBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.app.toggleFavorite(favItem, e.currentTarget);
            });

            fragment.appendChild(card);
        });

        this._grid.appendChild(fragment);
    };
}
