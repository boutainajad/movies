import { STORAGE_KEYS, MAX_CONTINUE_WATCHING, MAX_RECENTLY_VIEWED } from '../utils/constants.js';

export function getContinueWatching() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CONTINUE_WATCHING) || '[]');
}

export function saveContinueWatching(list) {
    if (!list || !Array.isArray(list)) return;
    if (list.length > MAX_CONTINUE_WATCHING) list.pop();
    localStorage.setItem(STORAGE_KEYS.CONTINUE_WATCHING, JSON.stringify(list));
}

export function getRecentlyViewed() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.RECENTLY_VIEWED) || '[]');
}

export function saveRecentlyViewed(list) {
    if (!list || !Array.isArray(list)) return;
    if (list.length > MAX_RECENTLY_VIEWED) list.pop();
    localStorage.setItem(STORAGE_KEYS.RECENTLY_VIEWED, JSON.stringify(list));
}

export function addRecentlyViewed(item) {
    if (!item || !item.id) return getRecentlyViewed();
    let list = getRecentlyViewed();
    list = list.filter(i => i.id.toString() !== item.id.toString());
    list.unshift(item);
    saveRecentlyViewed(list);
    return list;
}

export function getWatchlist() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.WATCHLIST) || '[]');
}

export function saveWatchlist(list) {
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(list || []));
}

export function getFavorites() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '[]');
}

export function saveFavorites(list) {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(list || []));
}

export function getSearchHistory() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY) || '[]');
}

export function saveSearchHistory(list) {
    localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(list || []));
}

export function getLastSource() {
    return localStorage.getItem(STORAGE_KEYS.LAST_SOURCE);
}

export function setLastSource(name) {
    localStorage.setItem(STORAGE_KEYS.LAST_SOURCE, name);
}
