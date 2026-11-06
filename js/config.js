// ===== streamFY configuration =====
window.STREAMFY_CONFIG = {
  TMDB_API_KEY: 'b5d40ef9d5e450005bed20ffb050f743',
  TMDB_BASE: 'https://api.themoviedb.org/3',
  IMG: 'https://image.tmdb.org/t/p/',

  SERVERS: [
    { 
      id: 'vidsrc', 
      name: 'Server 1 (Fast)', 
      getUrl: (m, s, e) => m.type === 'tv' ? `https://vidsrc.me/embed/tv?tmdb=${m.id}&season=${s}&episode=${e}` : `https://vidsrc.me/embed/movie?tmdb=${m.id}` 
    },
    { 
      id: 'vidlink', 
      name: 'Server 2 (VidLink)', 
      getUrl: (m, s, e) => m.type === 'tv' ? `https://vidlink.pro/tv/${m.id}/${s}/${e}` : `https://vidlink.pro/movie/${m.id}` 
    },
    { 
      id: '2embed', 
      name: 'Server 3 (2Embed)', 
      getUrl: (m, s, e) => m.type === 'tv' ? `https://www.2embed.cc/embedtv/${m.id}&s=${s}&e=${e}` : `https://www.2embed.cc/embed/${m.id}` 
    },
    { 
      id: 'embedsu', 
      name: 'Emergency Backup', 
      isBackup: true,
      getUrl: (m, s, e) => m.type === 'tv' ? `https://embed.su/embed/tv/${m.id}/${s}/${e}` : `https://embed.su/embed/movie/${m.id}` 
    }
  ]
};