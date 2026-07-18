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
    { id: null, titleKey: 'genres.trending', icon: 'fa-fire', type: 'movie' },
    { id: 28, titleKey: 'genres.action', icon: 'fa-burst', type: 'movie' },
    { id: 10749, titleKey: 'genres.romance', icon: 'fa-heart', type: 'tv' },
    { id: 53, titleKey: 'genres.thriller', icon: 'fa-masks-theater', type: 'movie' },
    { id: 35, titleKey: 'genres.comedy', icon: 'fa-face-laugh-beam', type: 'movie' },
    { id: 878, titleKey: 'genres.sciFi', icon: 'fa-rocket', type: 'movie' },
    { id: 16, titleKey: 'genres.animation', icon: 'fa-palette', type: 'movie' },
    { id: 80, titleKey: 'genres.crime', icon: 'fa-gun', type: 'tv' }
];

export const PAGE_TITLES = {
    home: { icon: 'fa-fire', key: 'pages.home' },
    movies: { icon: 'fa-film', key: 'pages.movies' },
    series: { icon: 'fa-tv', key: 'pages.series' },
    watchlist: { icon: 'fa-bookmark', key: 'pages.watchlist' },
    favorites: { icon: 'fa-heart', key: 'pages.favorites' }
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
