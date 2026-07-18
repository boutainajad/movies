export function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

export function highlightText(text, query) {
    if (!query) return escapeHtml(text);
    const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escapeHtml(text).replace(
        new RegExp(`(${safe})`, 'gi'),
        '<mark>$1</mark>'
    );
}

export function waitForImage(img) {
    return new Promise(resolve => {
        if (!img || (img.complete && img.naturalWidth > 0)) resolve();
        else {
            img.onload = resolve;
            img.onerror = resolve;
        }
    });
}

export function safeTitle(title) {
    return ((title) || '').replace(/'/g, "\\'");
}

export function getYear(item) {
    return ((item && (item.release_date || item.first_air_date)) || '').split('-')[0];
}

export function getPosterUrl(path, configImgUrl) {
    return path ? configImgUrl + path : 'https://placehold.co/300x450/1a1f2e/white?text=No+Poster';
}

export function getSmallPosterUrl(path, configImgUrl) {
    return path ? configImgUrl + path : 'https://placehold.co/100x150/1a1f2e/white?text=No+Poster';
}
