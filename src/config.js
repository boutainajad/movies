export default {
    TMDB_KEY: 'b474a37b86267d907de95a3b10b13883',
    BASE_URL: 'https://api.themoviedb.org/3',
    IMG_URL: 'https://image.tmdb.org/t/p/w342',
    BACKDROP_URL: 'https://image.tmdb.org/t/p/original',
    FEATURED_IDS: [
        '118413', '111151', '201115', '136283', '117376',
        '94796', '103290', '96648', '212005', '134015',
        '155452', '124976'
    ],
    ADS: {
        ENABLED: true,
        // MUST BE A REAL DIRECT LINK URL FROM ADSTERRA (e.g. https://www.highcpmrevenuegate.com/...), NOT A .JS SCRIPT
        DIRECT_LINK: 'https://www.highcpmrevenuegate.com/YOUR_ADSTERRA_DIRECT_LINK_HERE',
        POPUNDER_ENABLED: true,
        SHOW_OVERLAY: true,
        RESET_OVERLAY_ON_SOURCE_CHANGE: false
    },
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
