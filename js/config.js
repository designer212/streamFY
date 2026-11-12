// ===== streamFY configuration =====
window.STREAMFY_CONFIG = {
  TMDB_API_KEY: 'b5d40ef9d5e450005bed20ffb050f743',
  TMDB_BASE: 'https://api.themoviedb.org/3',
  IMG: 'https://image.tmdb.org/t/p/',

  // Supabase (Dashboard -> Project Settings -> API): project URL and public anon/publishable key
  SUPABASE_URL: 'https://dphvuutqffhjdorkpijv.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_0ZEpX3W2-boV51OMehZw6w_bMTswfpC',

  SERVERS: [
    { 
      id: 'vidsrc', 
      name: 'Server 1 (Fast)', 
      getUrl: (m, s, e) => m.type === 'tv' ? `https://vidsrc.me/embed/tv?tmdb=${m.id}&season=${s}&episode=${e}` : `https://vidsrc.me/embed/movie?tmdb=${m.id}` 
    },
    { 
      id: 'vidsrcsh', 
      name: 'Server 2 (VidSrc.sh)', 
      getUrl: (m, s, e) => {
        // vidsrc.sh works best with IMDb ID (tt...) if available, otherwise falls back to tmdb
        const id = m.imdb_id || m.id;
        return m.type === 'tv' 
          ? `https://vidsrc.sh/embed/tv/${id}/${s}/${e}` 
          : `https://vidsrc.sh/embed/movie/${id}`;
      } 
    },
    { 
      id: 'vidlink', 
      name: 'Server 3 (VidLink)', 
      getUrl: (m, s, e) => m.type === 'tv' ? `https://vidlink.pro/tv/${m.id}/${s}/${e}` : `https://vidlink.pro/movie/${m.id}` 
    },
    { 
      id: 'embedsu', 
      name: 'Emergency Backup', 
      isBackup: true,
      getUrl: (m, s, e) => m.type === 'tv' ? `https://embed.su/embed/tv/${m.id}/${s}/${e}` : `https://embed.su/embed/movie/${m.id}` 
    }
  ]
};
