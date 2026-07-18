export const CACHE_TTL = {
    DEFAULT: 5 * 60 * 1000,
    LONG: 30 * 60 * 1000,
    EPHEMERAL: 60 * 1000,
    SEASON: 10 * 60 * 1000,
};

export const STORAGE_KEYS = {
    CONTINUE_WATCHING: 'filmix_continue_watching',
    RECENTLY_VIEWED: 'filmix_recently_viewed',
    WATCHLIST: 'filmix_watchlist',
    FAVORITES: 'filmix_favorites',
    SEARCH_HISTORY: 'filmix_search_history',
    LAST_SOURCE: 'filmix_last_source',
    SEARCH_CACHE_TTL: 5 * 60 * 1000,
    SEARCH_HISTORY_MAX: 10,
};

export const HOME_GENRES = [
    { id: null, title: '<i class="fa-solid fa-fire"></i> Tendances du Moment', type: 'movie' },
    { id: 28, title: '<i class="fa-solid fa-burst"></i> Action & Aventure', type: 'movie' },
    { id: 10749, title: '<i class="fa-solid fa-heart"></i> Romances & Dramas', type: 'tv' },
    { id: 53, title: '<i class="fa-solid fa-masks-theater"></i> Thrillers Intenses', type: 'movie' },
    { id: 35, title: '<i class="fa-solid fa-face-laugh-beam"></i> Comédies Mondiales', type: 'movie' },
    { id: 878, title: '<i class="fa-solid fa-rocket"></i> Science-Fiction', type: 'movie' },
    { id: 16, title: '<i class="fa-solid fa-palette"></i> Animation', type: 'movie' },
    { id: 80, title: '<i class="fa-solid fa-gun"></i> Crimes & Séries Noires', type: 'tv' }
];

export const PAGE_TITLES = {
    home: '<i class="fa-solid fa-fire"></i> Tendances Mondiales',
    movies: '<i class="fa-solid fa-film"></i> Films du Monde Entier',
    series: '<i class="fa-solid fa-tv"></i> Séries & Dramas Mondiaux',
    watchlist: '<i class="fa-solid fa-bookmark"></i> Ma Watchlist',
    favorites: '<i class="fa-solid fa-heart"></i> Mes Favoris'
};

export const MAX_CONTINUE_WATCHING = 10;
export const MAX_RECENTLY_VIEWED = 20;
export const PLAYER_LOADING_TIMEOUT = 8000;
export const HERO_ROTATION_INTERVAL = 8000;
export const WATCH_INTERVAL = 3000;
export const SKELETON_COUNT = 12;
export const SEARCH_SUGGESTION_COUNT = 7;
export const RELATED_COUNT = 4;
export const CAST_COUNT = 5;
