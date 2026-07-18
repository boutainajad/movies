/**
 * FILMIX - Core Application Logic
 */

import './style.css';

const CONFIG = {
    TMDB_KEY: 'b474a37b86267d907de95a3b10b13883', 
    BASE_URL: 'https://api.themoviedb.org/3',
    IMG_URL: 'https://image.tmdb.org/t/p/w342',
    BACKDROP_URL: 'https://image.tmdb.org/t/p/original',
    FEATURED_IDS: [
        '118413', '111151', '201115', '136283', '117376', 
        '94796', '103290', '96648', '212005', '134015',
        '155452', '124976'
    ],
    SOURCES: {
        'S1 (VidLink)': (tmdb, imdb, type, s, e) => type === 'movie' ? `https://vidlink.pro/movie/${tmdb}?primaryColor=e50914` : `https://vidlink.pro/tv/${tmdb}/${s}/${e}?primaryColor=e50914`,
        'S2 (Vidsrc.to)': (tmdb, imdb, type, s, e) => {
            const id = imdb || tmdb;
            return type === 'movie' ? `https://vidsrc.to/embed/movie/${id}` : `https://vidsrc.to/embed/tv/${id}/${s}/${e}`;
        },
        'S3 (Vidsrc.me)': (tmdb, imdb, type, s, e) => {
            const id = imdb || tmdb;
            const param = id.startsWith('tt') ? `imdb=${id}` : `tmdb=${id}`;
            return type === 'movie' ? `https://vidsrc.me/embed/movie?${param}` : `https://vidsrc.me/embed/tv?${param}&season=${s}&episode=${e}`;
        },
        'S4 (SuperEmbed)': (tmdb, imdb, type, s, e) => {
            const id = imdb || tmdb;
            const base = `https://multiembed.mov/directstream.php?video_id=${id}${id.startsWith('tt') ? '' : '&tmdb=1'}`;
            return type === 'movie' ? base : `${base}&s=${s}&e=${e}`;
        },
        'S5 (Embed.su)': (tmdb, imdb, type, s, e) => {
            const id = imdb || tmdb;
            return type === 'movie' ? `https://embed.su/embed/movie/${id}` : `https://embed.su/embed/tv/${id}/${s}/${e}`;
        },
        'S6 (Vidsrc.cc)': (tmdb, imdb, type, s, e) => {
            const id = imdb || tmdb;
            return type === 'movie' ? `https://vidsrc.cc/v2/embed/movie/${id}` : `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`;
        },
        'S7 (2Embed)': (tmdb, imdb, type, s, e) => {
            const id = imdb || tmdb;
            return type === 'movie' ? `https://www.2embed.cc/embed/${id}` : `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`;
        }
    }
};

// --- API Module ---
class TMDB {
    static async fetch(endpoint, params = {}) {
        if (CONFIG.TMDB_KEY === 'ENTER_YOUR_TMDB_API_KEY_HERE') return null;
        
        const queryParams = new URLSearchParams({
            api_key: CONFIG.TMDB_KEY,
            language: 'fr-FR',
            ...params
        });
        
        try {
            const response = await fetch(`${CONFIG.BASE_URL}${endpoint}?${queryParams}`);
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            return null;
        }
    }

    static async getTrending(type = 'movie', page = 1) {
        return this.fetch(`/trending/${type}/day`, { page });
    }

    static async getGenres(type = 'movie') {
        return this.fetch(`/genre/${type}/list`);
    }

    static async discover(type = 'movie', params = {}) {
        return this.fetch(`/discover/${type}`, params);
    }

    static async search(query, page = 1) {
        return this.fetch('/search/multi', { query, page });
    }

    static async getDetails(id, type = 'movie') {
        return this.fetch(`/${type}/${id}`, { append_to_response: 'credits,similar,external_ids' });
    }

    static async getSeason(id, seasonNumber) {
        return this.fetch(`/tv/${id}/season/${seasonNumber}`);
    }
}

// --- Player Logic ---
window.setPlayerSource = (url, sourceName) => {
    document.getElementById('playerFrame').src = url;
    document.querySelectorAll('.source-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent === sourceName);
    });
};

window.loadEpisodes = async (id, seasonNumber, title) => {
    const list = document.getElementById('episodeList');
    list.innerHTML = 'Chargement...';
    
    const data = await TMDB.getSeason(id, seasonNumber);
    if (data && data.episodes) {
        list.innerHTML = data.episodes.map(ep => `
            <div class="episode-item" onclick="openPlayer('${id}', 'tv', '${title.replace(/'/g, "\\'")}', ${seasonNumber}, ${ep.episode_number})">
                <span class="ep-num">EP ${ep.episode_number}</span>
                <span class="nav-text">${ep.name}</span>
            </div>
        `).join('');
    }
};

window.openPlayer = async (id, type, title, season = 1, episode = 1) => {
    console.log(`FILMIX: Opening ${type} with TMDB ID ${id} | S${season}E${episode}`);
    const suggestionsBox = document.getElementById('searchSuggestions');
    if (suggestionsBox) suggestionsBox.style.display = 'none';
    const modal = document.getElementById('playerModal');
    modal.classList.add('open');
    document.getElementById('detailTitle').textContent = title + (type === 'tv' ? ` - S${season} E${episode}` : '');
    
    const details = await TMDB.getDetails(id, type);
    const imdbId = details?.external_ids?.imdb_id || '';
    
    const sourceBar = document.getElementById('sourceBar');
    
    sourceBar.innerHTML = Object.keys(CONFIG.SOURCES).map((name, index) => {
        const url = CONFIG.SOURCES[name](id, imdbId, type, season, episode);
        return `<button class="source-btn ${index === 0 ? 'active' : ''}" onclick="setPlayerSource('${url}', '${name}')">${name}</button>`;
    }).join('') + `<button class="source-btn" style="background:#222" onclick="window.open('${CONFIG.SOURCES['S2 (Vidsrc.to)'](id, imdbId, type, season, episode)}', '_blank')"><i class="fa-solid fa-globe"></i> New Tab</button>`;

    const defaultUrl = CONFIG.SOURCES['S1 (VidLink)'](id, imdbId, type, season, episode);
    setPlayerSource(defaultUrl, 'S1 (VidLink)');

    // Update Title & Global State for Sharing
    document.title = `${title} — Regarder sur DRAMA MIX`;
    window.currentShareData = { title, url: window.location.href, id };

    if (details) {
        document.getElementById('detailOverview').textContent = details.overview || 'Pas de description disponible.';
        document.getElementById('detailYear').textContent = (details.release_date || details.first_air_date || '').split('-')[0];
        document.getElementById('detailRating').innerHTML = '<i class="fa-solid fa-star"></i> ' + details.vote_average.toFixed(1);
        document.getElementById('detailRuntime').textContent = (details.runtime || details.episode_run_time?.[0] || '?') + ' min';

        const episodesContainer = document.getElementById('detailCast'); 
        if (type === 'tv') {
            const seasonsHtml = (details.seasons || []).map(s => `<option value="${s.season_number}" ${s.season_number == season ? 'selected' : ''}>${s.name}</option>`).join('');
            episodesContainer.innerHTML = `
                <div class="episodes-picker">
                    <select id="seasonSelect" onchange="loadEpisodes('${id}', this.value, '${title.replace(/'/g, "\\'")}')">${seasonsHtml}</select>
                    <div id="episodeList" class="episode-list">Chargement des épisodes...</div>
                </div>
            `;
            loadEpisodes(id, season, title);
        } else {
            episodesContainer.innerHTML = details.credits.cast.slice(0, 5).map(c => `
                <div class="cast-item">
                    <img src="${c.profile_path ? CONFIG.IMG_URL + c.profile_path : 'https://api.dicebear.com/7.x/initials/svg?seed='+c.name}" alt="${c.name}">
                    <span>${c.name}</span>
                </div>
            `).join('');
        }

        const relatedGrid = document.getElementById('relatedGrid');
        relatedGrid.innerHTML = details.similar.results.slice(0, 4).map(r => `
            <div class="related-card" onclick="openPlayer('${r.id}', '${type}', '${(r.title || r.name).replace(/'/g, "\\'")}')">
                <img src="${CONFIG.IMG_URL + r.poster_path}" alt="${r.title || r.name}">
            </div>
        `).join('');
    }
};

window.closePlayer = () => {
    document.getElementById('playerModal').classList.remove('open');
    document.getElementById('playerFrame').src = '';
    document.title = 'DRAMA MIX — L\'expérience Streaming Ultime';
};

window.shareMovie = (platform) => {
    const data = window.currentShareData || { title: 'DRAMA MIX', url: window.location.href };
    const text = encodeURIComponent(`Regarde "${data.title}" gratuitement sur DRAMA MIX ! <i class='fa-solid fa-film'></i>\n\n`);
    const url = encodeURIComponent(data.url);

    const links = {
        whatsapp: `https://api.whatsapp.com/send?text=${text}${url}`,
        telegram: `https://t.me/share/url?url=${url}&text=${text}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`
    };

    if (links[platform]) window.open(links[platform], '_blank');
};

// --- UI Module ---
class AppUI {
    constructor() {
        this.state = {
            page: 1,
            currentType: 'movie',
            currentGenre: null,
            currentView: 'home',
            loading: false,
            hasMore: true,
            watchlist: JSON.parse(localStorage.getItem('filmix_watchlist') || '[]')
        };
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.loadGenres();
        this.loadContent();
        this.setupInfiniteScroll();
    }

    setupEventListeners() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) this.switchPage(page);
            });
        });

        const searchInput = document.getElementById('searchInput');
        let searchTimeout;
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length > 2) {
                this.loadSuggestions(query);
                searchTimeout = setTimeout(() => {
                    this.performSearch(query);
                }, 500);
            } else if (query.length === 0) {
                const suggestionsBox = document.getElementById('searchSuggestions');
                if (suggestionsBox) {
                    suggestionsBox.style.display = 'none';
                    suggestionsBox.innerHTML = '';
                }
                this.switchPage('home');
            } else {
                const suggestionsBox = document.getElementById('searchSuggestions');
                if (suggestionsBox) {
                    suggestionsBox.style.display = 'none';
                    suggestionsBox.innerHTML = '';
                }
            }
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(searchTimeout);
                const query = e.target.value.trim();
                if (query.length > 2) {
                    this.performSearch(query);
                    const suggestionsBox = document.getElementById('searchSuggestions');
                    if (suggestionsBox) suggestionsBox.style.display = 'none';
                }
            }
        });

        searchInput.addEventListener('focus', (e) => {
            const query = e.target.value.trim();
            if (query.length > 2) {
                this.loadSuggestions(query);
            }
        });

        document.addEventListener('click', (e) => {
            const searchContainer = document.querySelector('.search-container');
            if (searchContainer && !searchContainer.contains(e.target)) {
                const suggestionsBox = document.getElementById('searchSuggestions');
                if (suggestionsBox) suggestionsBox.style.display = 'none';
            }
        });

        document.getElementById('sortSelect').addEventListener('change', () => {
            this.state.page = 1;
            this.loadContent(true);
        });
    }

    async loadSuggestions(query) {
        const suggestionsBox = document.getElementById('searchSuggestions');
        if (!suggestionsBox) return;

        const data = await TMDB.search(query, 1);
        if (data && data.results && data.results.length > 0) {
            const filtered = data.results.filter(i => i.media_type !== 'person').slice(0, 6);
            if (filtered.length === 0) {
                suggestionsBox.style.display = 'none';
                return;
            }

            suggestionsBox.innerHTML = filtered.map(item => {
                const title = item.title || item.name;
                const poster = item.poster_path ? CONFIG.IMG_URL + item.poster_path : 'https://placehold.co/100x150/1a1f2e/white?text=No+Poster';
                const year = (item.release_date || item.first_air_date || '').split('-')[0] || 'N/A';
                const rating = item.vote_average ? `<i class="fa-solid fa-star"></i> ${item.vote_average.toFixed(1)}` : 'N/A';
                const type = (item.name || item.first_air_date) ? 'tv' : 'movie';
                const typeLabel = type === 'movie' ? 'Film' : 'Série';

                return `
                    <div class="suggestion-item" onclick="openPlayer('${item.id}', '${type}', '${title.replace(/'/g, "\\'")}')">
                        <img src="${poster}" alt="${title}">
                        <div class="suggestion-info">
                            <span class="suggestion-title">${title}</span>
                            <span class="suggestion-meta">${year} • ${typeLabel} • ${rating}</span>
                        </div>
                    </div>
                `;
            }).join('');
            suggestionsBox.style.display = 'block';
        } else {
            suggestionsBox.style.display = 'none';
        }
    }

    async loadGenres() {
        const data = await TMDB.getGenres(this.state.currentType);
        if (!data) return;
        
        const genreContainer = document.getElementById('genre-list');
        if (!genreContainer) return;

        const html = data.genres.map(genre => `
            <div class="genre-item" data-id="${genre.id}">${genre.name}</div>
        `).join('');

        genreContainer.innerHTML = html;
        genreContainer.querySelectorAll('.genre-item').forEach(item => {
            item.addEventListener('click', () => {
                    const genreId = item.dataset.id;
                    const genreName = item.textContent;
                    
                    this.state.currentGenre = genreId;
                    this.state.page = 1;
                    
                    // Switch view if not on content pages
                    if (this.state.currentView !== 'movies' && this.state.currentView !== 'series') {
                        this.state.currentView = this.state.currentType === 'movie' ? 'movies' : 'series';
                    }

                    // Update UI (Nav & Title)
                    this.updateNavUI(this.state.currentView);
                    const typeLabel = this.state.currentType === 'movie' ? 'Films' : 'Séries';
                    document.getElementById('grid-title').textContent = `${genreName} — ${typeLabel}`;
                    
                    this.loadContent(true);
                    
                    // Sync active state across all genre lists
                    document.querySelectorAll('.genre-item').forEach(g => {
                        g.classList.toggle('active', g.dataset.id === genreId);
                    });
                });
            });
    }

    async loadContent(clear = false) {
        if (this.state.loading) return;
        this.state.loading = true;
        
        const grid = document.getElementById('movie-grid');
        const heroWrapper = document.getElementById('hero-wrapper');
        const sectionHeader = document.querySelector('.section-header');
        
        if (clear) {
            grid.innerHTML = '';
            document.getElementById('page-content').scrollTo(0, 0);
        }

        if (this.state.currentView === 'home' && this.state.page === 1 && !this.state.currentGenre) {
            // Professional Netflix-style rows for Home
            grid.style.display = 'none';
            if (sectionHeader) sectionHeader.style.display = 'none';
            
            // Create or clear home sections container
            let sectionsContainer = document.getElementById('home-sections');
            if (!sectionsContainer) {
                sectionsContainer = document.createElement('div');
                sectionsContainer.id = 'home-sections';
                grid.parentNode.insertBefore(sectionsContainer, grid);
            }
            sectionsContainer.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>';

            try {
                const genres = [
                    { id: null, title: '<i class="fa-solid fa-fire"></i> Tendances du Moment', type: 'movie' },
                    { id: 28, title: '<i class="fa-solid fa-burst"></i> Action & Aventure', type: 'movie' },
                    { id: 10749, title: '<i class="fa-solid fa-heart"></i> Romances & Dramas', type: 'tv' },
                    { id: 53, title: '<i class="fa-solid fa-masks-theater"></i> Thrillers Intenses', type: 'movie' },
                    { id: 35, title: '<i class="fa-solid fa-face-laugh-beam"></i> Comédies Mondiales', type: 'movie' },
                    { id: 878, title: '<i class="fa-solid fa-rocket"></i> Science-Fiction', type: 'movie' },
                    { id: 16, title: '<i class="fa-solid fa-palette"></i> Animation', type: 'movie' },
                    { id: 80, title: '<i class="fa-solid fa-gun"></i> Crimes & Séries Noires', type: 'tv' }
                ];

                const promises = genres.map(g => {
                    if (g.id === null) return TMDB.getTrending(this.state.currentType, 1);
                    return TMDB.discover(g.type, { with_genres: g.id, sort_by: 'popularity.desc' });
                });

                const results = await Promise.all(promises);
                sectionsContainer.innerHTML = ''; // Clear spinner

                results.forEach((data, index) => {
                    if (data && data.results && data.results.length > 0) {
                        if (index === 0) this.renderHero(data.results[0]);
                        this.renderRow(genres[index].title, data.results, sectionsContainer);
                    }
                });
            } catch (err) {
                console.error("Home load error:", err);
            }
        } else {
            // Standard Grid Layout for Movies, Series, Search, or Genres
            grid.style.display = 'grid';
            if (sectionHeader) sectionHeader.style.display = 'flex';
            const sectionsContainer = document.getElementById('home-sections');
            if (sectionsContainer) sectionsContainer.innerHTML = '';

            let data;
            if (this.state.currentView === 'home') {
                data = await TMDB.getTrending(this.state.currentType, this.state.page);
            } else {
                const params = {
                    page: this.state.page,
                    sort_by: document.getElementById('sortSelect').value,
                    with_genres: this.state.currentGenre || ''
                };
                data = await TMDB.discover(this.state.currentType, params);
            }

            if (data && data.results) {
                this.renderGrid(data.results);
                if (this.state.page === 1 && this.state.currentView === 'home' && data.results.length > 0) {
                    this.renderHero(data.results[0]);
                }
                this.state.hasMore = this.state.page < data.total_pages;
            }
        }
        this.state.loading = false;
    }

    renderRow(title, items, container) {
        const row = document.createElement('div');
        row.className = 'movie-row-container';
        row.innerHTML = `
            <h3 class="row-title">${title}</h3>
            <div class="movie-row">
                ${items.map(item => {
                    const title = item.title || item.name;
                    const poster = item.poster_path ? CONFIG.IMG_URL + item.poster_path : 'https://placehold.co/300x450/1a1f2e/white?text=No+Poster';
                    let type = item.name || item.first_air_date ? 'tv' : 'movie';
                    return `
                        <div class="row-card" onclick="openPlayer('${item.id}', '${type}', '${title.replace(/'/g, "\\'")}')">
                            <img src="${poster}" alt="${title}" loading="lazy">
                            <div class="row-card-overlay">
                                <div class="row-card-rating"><i class="fa-solid fa-star"></i> ${item.vote_average.toFixed(1)}</div>
                                <div class="row-card-play"><i class="fa-solid fa-play"></i></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        container.appendChild(row);
    }

    renderGrid(items) {
        const grid = document.getElementById('movie-grid');
        const fragment = document.createDocumentFragment();
        
        items.forEach(item => {
            const title = item.title || item.name;
            const poster = item.poster_path ? CONFIG.IMG_URL + item.poster_path : 'https://placehold.co/300x450/1a1f2e/white?text=No+Poster';
            const year = (item.release_date || item.first_air_date || '').split('-')[0];
            const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
            
            // Better type detection
            let type = 'movie';
            if (item.name || item.media_type === 'tv' || item.first_air_date) type = 'tv';
            if (item.title || item.media_type === 'movie' || item.release_date) type = 'movie';
            
            const card = document.createElement('div');
            card.className = 'movie-card';
            card.onclick = () => openPlayer(item.id, type, title.replace(/'/g, "\\'"));
            card.innerHTML = `
                <div class="card-poster">
                    <img src="${poster}" alt="${title}" loading="lazy" decoding="async">
                    <div class="card-rating"><i class="fa-solid fa-star"></i> ${rating}</div>
                    <div class="card-play"><div class="play-icon"><i class="fa-solid fa-play"></i></div></div>
                </div>
                <div class="card-info">
                    <div class="card-title">${title}</div>
                    <div class="card-year">${year} • ${type === 'movie' ? 'Film' : 'Drama'}</div>
                </div>
            `;
            fragment.appendChild(card);
        });
        
        grid.appendChild(fragment);
    }

    renderHero(item) {
        const wrapper = document.getElementById('hero-wrapper');
        if (this.state.currentView !== 'home') {
            wrapper.innerHTML = '';
            return;
        }
        const title = item.title || item.name;
        const backdrop = CONFIG.BACKDROP_URL + item.backdrop_path;
        const type = item.title ? 'movie' : 'tv';
        wrapper.innerHTML = `
            <div class="hero" onclick="openPlayer('${item.id}', '${type}', '${title.replace(/'/g, "\\'")}')" style="cursor:pointer">
                <img src="${backdrop}" class="hero-img" alt="${title}">
                <div class="hero-overlay"></div>
                <div class="hero-play-central"><div class="play-icon-big"><i class="fa-solid fa-play"></i></div></div>
                <div class="hero-content">
                    <h1>${title}</h1>
                    <div class="hero-meta">
                        <span><i class="fa-solid fa-star"></i> ${item.vote_average.toFixed(1)}</span>
                        <span>${(item.release_date || item.first_air_date || '').split('-')[0]}</span>
                        <span>HD / 4K</span>
                    </div>
                    <button class="btn-play">
                        <span><i class="fa-solid fa-play"></i></span> REGARDER MAINTENANT
                    </button>
                </div>
            </div>
        `;
    }

    setupInfiniteScroll() {
        const trigger = document.getElementById('load-more-trigger');
        const contentArea = document.getElementById('page-content');
        contentArea.addEventListener('scroll', () => {
            if (contentArea.scrollTop + contentArea.clientHeight >= contentArea.scrollHeight - 500) {
                if (!this.state.loading && this.state.hasMore) {
                    this.state.page++;
                    if (this.state.currentView === 'search') {
                        const query = document.getElementById('searchInput').value;
                        this.performSearch(query, this.state.page);
                    } else {
                        this.loadContent();
                    }
                }
            }
        });
    }

    switchPage(page) {
        this.state.currentView = page;
        this.state.page = 1;
        this.state.currentGenre = null;
        if (page === 'movies') this.state.currentType = 'movie';
        if (page === 'series') this.state.currentType = 'tv';
        
        this.updateNavUI(page);
        
        const titles = {
            home: '<i class="fa-solid fa-fire"></i> Tendances Mondiales',
            movies: '<i class="fa-solid fa-film"></i> Films du Monde Entier',
            series: '<i class="fa-solid fa-tv"></i> Séries & Dramas Mondiaux',
            watchlist: '<i class="fa-solid fa-bookmark"></i> Ma Watchlist'
        };
        document.getElementById('grid-title').innerHTML = titles[page] || 'Résultats';
        
        // Handle Genre Bar visibility
        const genreBar = document.getElementById('genre-list');
        if (genreBar) {
            genreBar.style.display = (page === 'movies' || page === 'series') ? 'flex' : 'none';
        }

        if (page === 'watchlist') {
            this.renderWatchlist();
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
        this.state.currentView = 'search';
        this.state.page = page;
        this.updateNavUI('search');
        
        if (page === 1) {
            const grid = document.getElementById('movie-grid');
            grid.style.display = 'grid';
            
            const sectionHeader = document.querySelector('.section-header');
            if (sectionHeader) sectionHeader.style.display = 'flex';
            
            const sectionsContainer = document.getElementById('home-sections');
            if (sectionsContainer) sectionsContainer.innerHTML = '';

            document.getElementById('grid-title').textContent = `Résultats pour "${query}"`;
            grid.innerHTML = '';
            document.getElementById('hero-wrapper').innerHTML = '';
            const mobileGenres = document.getElementById('mobile-genre-list');
            if (mobileGenres) mobileGenres.style.display = 'none';
        }
        
        const data = await TMDB.search(query, page);
        if (data && data.results) {
            const filtered = data.results.filter(i => i.media_type !== 'person');
            this.renderGrid(filtered);
            this.state.hasMore = page < data.total_pages;
        }
    }

    renderWatchlist() {
        document.getElementById('hero-wrapper').innerHTML = '';
        document.getElementById('movie-grid').innerHTML = '';
        const mobileGenres = document.getElementById('mobile-genre-list');
        if (mobileGenres) mobileGenres.style.display = 'none';
        
        if (this.state.watchlist.length === 0) {
            document.getElementById('movie-grid').innerHTML = '<p class="empty-msg">Votre watchlist est vide.</p>';
        } else {
            this.renderGrid(this.state.watchlist);
        }
    }
}

// Start App
const app = new AppUI();
window.showPage = (name) => app.switchPage(name);
