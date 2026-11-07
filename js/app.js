(() => {
  const C = window.STREAMFY_CONFIG || {};
  const TMDB_BASE = C.TMDB_BASE || 'https://api.themoviedb.org/3';
  const TMDB_API_KEY = C.TMDB_API_KEY || '';
  const IMG_BASE = C.IMG || 'https://image.tmdb.org/t/p/';
  const SERVERS = C.SERVERS || [
    { id: 'vidlink', name: 'Server 1', getUrl: (m, s, e) => m.type === 'tv' ? `https://vidlink.pro/tv/${m.id}/${s}/${e}` : `https://vidlink.pro/movie/${m.id}` }
  ];

  const $ = (s, r = document) => r.querySelector(s);
  const img = (p, s = 'w500') => (p ? IMG_BASE + s + p : '');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const ROWS = [
    { t: 'Trending this week', p: '/trending/all/week', v: ['home'] },
    { t: 'Popular movies', p: '/movie/popular', type: 'movie', v: ['home', 'movie'] },
    { t: 'Top rated movies', p: '/movie/top_rated', type: 'movie', v: ['home', 'movie'] },
    { t: 'Action', p: '/discover/movie', q: { with_genres: 28 }, type: 'movie', v: ['home', 'movie'] },
    { t: 'Sci-fi', p: '/discover/movie', q: { with_genres: 878 }, type: 'movie', v: ['home', 'movie'] },
    { t: 'Comedy', p: '/discover/movie', q: { with_genres: 35 }, type: 'movie', v: ['home', 'movie'] },
    { t: 'Drama', p: '/discover/movie', q: { with_genres: 18 }, type: 'movie', v: ['home', 'movie'] },
    { t: 'Horror', p: '/discover/movie', q: { with_genres: 27 }, type: 'movie', v: ['movie'] },
    { t: 'Animation', p: '/discover/movie', q: { with_genres: 16 }, type: 'movie', v: ['home', 'movie'] },
    { t: 'Coming soon', p: '/movie/upcoming', type: 'movie', v: ['movie'] },
    { t: 'Popular TV shows', p: '/tv/popular', type: 'tv', v: ['home', 'tv'] },
    { t: 'Top rated TV', p: '/tv/top_rated', type: 'tv', v: ['home', 'tv'] },
    { t: 'Sci-fi & fantasy series', p: '/discover/tv', q: { with_genres: 10765 }, type: 'tv', v: ['tv'] },
    { t: 'Crime series', p: '/discover/tv', q: { with_genres: 80 }, type: 'tv', v: ['tv'] }
  ];

  let view = 'home', hero = [], hi = 0, ht, cur = null, yt = { playing: true, muted: false };
  let currentSeason = 1, currentEpisode = 1;
  
  // Infinite Scroll State for Categories
  let currentCategory = null, catPage = 1, isLoadingMore = false, hasMorePages = true;

  async function api(path, params = {}) {
    const u = new URL(TMDB_BASE + path);
    if (TMDB_API_KEY) u.searchParams.set('api_key', TMDB_API_KEY);
    u.searchParams.set('language', 'en-US');
    Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
    const r = await fetch(u);
    if (!r.ok) throw new Error('API ' + r.status);
    return r.json();
  }

  async function loadHero() {
    try {
      const d = await api(view === 'tv' ? '/trending/tv/week' : '/trending/movie/week');
      hero = (d.results || []).filter(x => x.backdrop_path).slice(0, 6);
      hero.forEach(x => (x.media_type = view === 'tv' ? 'tv' : 'movie'));
      if (hero.length > 0) {
        showHero(0);
        clearInterval(ht);
        ht = setInterval(() => showHero((hi + 1) % hero.length), 8000);
      }
    } catch (e) { console.error('Hero load error:', e); }
  }

  function showHero(i) {
    hi = i;
    const x = hero[i], el = $('#hero');
    if (!x || !el) return;
    el.innerHTML = `<div class="hero-bg" style="background-image:url('${img(x.backdrop_path, 'original')}')"></div>
      <div class="wrap hero-body">
        <div class="meta"><span class="star" style="color:#fbbf24;"><i class="fa-solid fa-star"></i> ${(x.vote_average || 0).toFixed(1)}</span>
          <span>${(x.release_date || x.first_air_date || '').slice(0, 4)}</span><span>${x.media_type === 'tv' ? 'Series' : 'Film'}</span></div>
        <h1>${esc(x.title || x.name)}</h1>
        <p>${esc(x.overview)}</p>
        <div class="btns" style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn pri" data-open="${i}" style="background:#22c55e; color:#000; font-weight:bold; border:none; padding:10px 18px; border-radius:8px; cursor:pointer;"><i class="fa-solid fa-play"></i> Watch Server 1</button>
          <button class="btn pri" data-open="${i}" data-server="1" style="background:#fbbf24; color:#000; font-weight:bold; border:none; padding:10px 18px; border-radius:8px; cursor:pointer;"><i class="fa-solid fa-play"></i> Watch Server 2</button>
          <button class="btn sec" data-open="${i}" data-trailer="1" style="background:rgba(255,255,255,0.15); color:#fff; border:none; padding:10px 18px; border-radius:8px; cursor:pointer;"><i class="fa-solid fa-film"></i> Trailer</button>
        </div></div>
      <div class="wrap dots" style="left:0">${hero.map((_, n) => `<button class="${n === i ? 'on' : ''}" data-dot="${n}" aria-label="Slide ${n + 1}"></button>`).join('')}</div>`;
  }

  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const r = e.target._row, t = $('.track', e.target);
    api(r.p, r.q).then(d => { t.innerHTML = ''; fill(t, d.results, r.type); })
      .catch(() => { if (t) t.innerHTML = '<p class="empty">Could not load this category.</p>'; });
  }), { rootMargin: '300px' });

  // Infinite Scroll Observer for Category Grid
  const catObserver = new IntersectionObserver(async (entries) => {
    if (entries[0].isIntersecting && !isLoadingMore && hasMorePages && currentCategory) {
      isLoadingMore = true;
      catPage++;
      try {
        const d = await api(currentCategory.p, { ...currentCategory.q, page: catPage });
        fill($('#catGrid'), d.results, currentCategory.type);
        if (catPage >= (d.total_pages || 1)) {
          hasMorePages = false;
        }
      } catch (e) {
        console.error('Load more error:', e);
      }
      isLoadingMore = false;
    }
  }, { rootMargin: '400px' });

  function buildRows() {
    const box = $('#rows');
    if (!box) return;
    box.innerHTML = '';
    ROWS.filter(r => r.v.includes(view)).forEach(r => {
      const s = document.createElement('section');
      s.className = 'row';
      s.innerHTML = `<div class="row-head">
          <h2>${r.t}</h2>
          <button class="more-btn" style="background:none; border:none; color:#00f2fe; cursor:pointer; font-weight:600; font-size:13px; display:flex; align-items:center; gap:4px;">More <i class="fa-solid fa-chevron-right" style="font-size:10px;"></i></button>
        </div>
        <div class="row-wrap">
          <button class="arr l" aria-label="Scroll left"><i class="fa-solid fa-chevron-left"></i></button>
          <div class="track">${'<div class="card sk"><div class="ph"></div></div>'.repeat(8)}</div>
          <button class="arr r" aria-label="Scroll right"><i class="fa-solid fa-chevron-right"></i></button>
        </div>`;
      
      const t = $('.track', s);
      $('.arr.l', s).onclick = () => t.scrollBy({ left: -t.clientWidth * .85, behavior: 'smooth' });
      $('.arr.r', s).onclick = () => t.scrollBy({ left: t.clientWidth * .85, behavior: 'smooth' });
      $('.more-btn', s).onclick = () => openCategory(r);

      s._row = r;
      box.appendChild(s);
      io.observe(s);
    });
  }

  async function openCategory(r) {
    $('#hero').hidden = true;
    $('#rows').hidden = true;
    const cat = $('#category');
    cat.hidden = false;
    $('#catTitle').textContent = r.t;
    const grid = $('#catGrid');
    grid.innerHTML = '<p class="empty">Loading...</p>';
    
    currentCategory = r;
    catPage = 1;
    hasMorePages = true;

    try {
      const d = await api(r.p, { ...r.q, page: catPage });
      grid.innerHTML = '';
      fill(grid, d.results, r.type);
      hasMorePages = catPage < (d.total_pages || 1);
      
      const sentinel = $('#catEnd');
      if (sentinel) catObserver.observe(sentinel);
    } catch {
      grid.innerHTML = '<p class="empty">Could not load category items.</p>';
    }
  }

  function fill(el, items, type) {
    if (!el || !items) return;
    items.filter(x => x.poster_path && x.media_type !== 'person').forEach(x => {
      const ty = x.media_type || type;
      const b = document.createElement('button');
      b.className = 'card';
      b.style.cssText = "background:none; border:none; padding:0; cursor:pointer; text-align:left; display:block; width:100%;";
      
      const posterUrl = img(x.poster_path, 'w500');
      const title = esc(x.title || x.name);
      const year = (x.release_date || x.first_air_date || '').slice(0, 4);
      const rating = x.vote_average ? x.vote_average.toFixed(1) : 'NR';

      b.innerHTML = `
        <div class="ph" style="position:relative; width:100%; aspect-ratio:2/3; background:#101622; border-radius:12px; overflow:hidden; margin-bottom:8px;">
          <img loading="lazy" src="${posterUrl}" alt="${title}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://via.placeholder.com/500x750?text=No+Image'">
          <span class="rt" style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.7); backdrop-filter:blur(4px); padding:2px 6px; border-radius:6px; font-size:10px; color:#fbbf24; font-weight:bold;"><i class="fa-solid fa-star"></i> ${rating}</span>
        </div>
        <h3 style="font-size:13px; font-weight:bold; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin:0 0 2px 0;">${title}</h3>
        <small style="font-size:11px; color:#94a3b8;">${year} · ${ty === 'tv' ? 'Series' : 'Film'}</small>`;
      
      b.onclick = () => openDetail(x.id, ty);
      el.appendChild(b);
    });
  }

  let st;
  function search(q) {
    clearTimeout(st);
    st = setTimeout(async () => {
      const box = $('#results');
      if (!box) return;
      if (!q) { box.hidden = true; $('#hero').hidden = $('#rows').hidden = false; return; }
      $('#hero').hidden = $('#rows').hidden = true;
      box.hidden = false;
      box.innerHTML = `<h2>Results for “${esc(q)}”</h2><div class="grid"></div>`;
      try {
        const d = await api('/search/multi', { query: q });
        const g = $('.grid', box);
        fill(g, d.results, 'movie');
        if (!g.children.length) g.outerHTML = '<p class="empty">No matches. Try a different title.</p>';
      } catch { box.innerHTML += '<p class="empty">Search failed. Check your connection and API key.</p>'; }
    }, 400);
  }

  async function openDetail(id, type, autoTrailer, serverIdx = 0) {
    const m = $('#modal');
    if (!m) return;
    m.hidden = false;
    document.body.style.overflow = 'hidden';
    $('#info').innerHTML = '<p class="empty">Loading…</p>';
    $('#stage').innerHTML = '';
    
    try {
      const d = await api(`/${type}/${id}`, { append_to_response: 'videos' });
      const title = d.title || d.name;
      cur = { id, type, title, year: (d.release_date || d.first_air_date || '').slice(0, 4), videos: (d.videos && d.videos.results) || [], seasons: d.seasons || [] };
      currentSeason = 1; currentEpisode = 1;

      $('#stage').style.backgroundImage = `url('${img(d.backdrop_path, 'w1280')}')`;
      const run = d.runtime ? d.runtime + ' min' : d.number_of_seasons ? d.number_of_seasons + ' seasons' : '';
      
      const isFav = (JSON.parse(localStorage.getItem('streamfy_watchlist') || '[]')).some(x => x.id === id);

      $('#info').innerHTML = `<h2>${esc(title)}</h2>
        <div class="meta" style="margin-top:6px"><span class="star" style="color:#fbbf24;"><i class="fa-solid fa-star"></i> ${(d.vote_average || 0).toFixed(1)}</span><span>${cur.year}</span><span>${run}</span></div>
        <div class="tags">${(d.genres || []).map(g => `<span>${esc(g.name)}</span>`).join('')}</div>
        <p>${esc(d.overview || 'No description available.')}</p>
        
        ${type === 'tv' ? `
          <div style="display:flex; gap:10px; margin: 12px 0;">
            <select id="seasonSelect" style="background:#101622; color:#fff; padding:6px; border-radius:8px; border:1px solid rgba(255,255,255,0.1)">
              ${(cur.seasons || []).filter(s => s.season_number > 0).map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`).join('')}
            </select>
            <select id="episodeSelect" style="background:#101622; color:#fff; padding:6px; border-radius:8px; border:1px solid rgba(255,255,255,0.1)">
              <option value="1">Episode 1</option>
            </select>
          </div>
        ` : ''}

        <div class="btns" style="display:flex; flex-wrap:wrap; gap:8px;">
          <button class="btn pri" onclick="playServer(0)" style="background:#22c55e; color:#000; font-weight:bold; border:none; padding:10px 16px; border-radius:8px; cursor:pointer;"><i class="fa-solid fa-play"></i> Watch Server 1</button>
          <button class="btn pri" onclick="playServer(1)" style="background:#fbbf24; color:#000; font-weight:bold; border:none; padding:10px 16px; border-radius:8px; cursor:pointer;"><i class="fa-solid fa-play"></i> Watch Server 2</button>
          <button class="btn sec" id="bTrailer" style="background:rgba(255,255,255,0.1); color:#fff; border:none; padding:10px 16px; border-radius:8px; cursor:pointer;"><i class="fa-solid fa-film"></i> Trailer</button>
          <button class="btn sec" id="bFav" style="background:rgba(255,255,255,0.1); color:#fff; border:none; padding:10px 16px; border-radius:8px; cursor:pointer;"><i class="fa-solid fa-heart" style="color:${isFav ? '#00f2fe' : 'inherit'}"></i> ${isFav ? 'Saved' : 'Watchlist'}</button>
        </div>`;

      $('#bTrailer').onclick = playTrailer;
      $('#bFav').onclick = () => toggleWatchlist(d, $('#bFav'));

      if (type === 'tv') {
        $('#seasonSelect').onchange = async (e) => {
          currentSeason = +e.target.value;
          await loadEpisodes(id, currentSeason);
          playServer(0);
        };
        $('#episodeSelect').onchange = (e) => {
          currentEpisode = +e.target.value;
          playServer(0);
        };
        await loadEpisodes(id, 1);
      }

      if (autoTrailer) playTrailer();
      else playServer(serverIdx);
    } catch (e) { console.error('Detail load error:', e); $('#info').innerHTML = '<p class="empty">Could not load details.</p>'; }
  }

  async function loadEpisodes(tvId, seasonNum) {
    try {
      const d = await api(`/tv/${tvId}/season/${seasonNum}`);
      const epSelect = $('#episodeSelect');
      if (epSelect) {
        epSelect.innerHTML = (d.episodes || []).map(ep => `<option value="${ep.episode_number}">Ep ${ep.episode_number}: ${esc(ep.name)}</option>`).join('');
        currentEpisode = 1;
      }
    } catch { 
      const epSelect = $('#episodeSelect');
      if (epSelect) epSelect.innerHTML = '<option value="1">Episode 1</option>'; 
    }
  }

  function toggleWatchlist(d, btn) {
    let list = JSON.parse(localStorage.getItem('streamfy_watchlist') || '[]');
    const idx = list.findIndex(x => x.id === d.id);
    if (idx > -1) {
      list.splice(idx, 1);
      btn.innerHTML = `<i class="fa-solid fa-heart"></i> Watchlist`;
      btn.querySelector('i').style.color = 'inherit';
    } else {
      list.push({ id: d.id, title: d.title || d.name, poster_path: d.poster_path, vote_average: d.vote_average, release_date: d.release_date || d.first_air_date, media_type: cur.type });
      btn.innerHTML = `<i class="fa-solid fa-heart" style="color:#00f2fe"></i> Saved`;
    }
    localStorage.setItem('streamfy_watchlist', JSON.stringify(list));
  }

  const note = (html) => ($('#stage').innerHTML = `<div class="note">${html}</div>`);

  function playTrailer() {
    const v = (cur.videos || []).filter(x => x.site === 'YouTube');
    const t = v.find(x => x.type === 'Trailer') || v[0];
    if (!t) return note('No trailer is available for this title.');
    const p = new URLSearchParams({ autoplay: 1, controls: 0, modestbranding: 1, rel: 0, iv_load_policy: 3, disablekbd: 1, fs: 0, playsinline: 1, enablejsapi: 1 });
    if (location.protocol.startsWith('http')) p.set('origin', location.origin);
    yt = { playing: true, muted: false };
    $('#stage').innerHTML = `<div class="tr" id="tr" style="width:100%; height:100%;"><iframe id="yt" title="Trailer" allow="autoplay; encrypted-media"
      src="https://www.youtube-nocookie.com/embed/${t.key}?${p}" style="width:100%; height:100%; border:0;"></iframe>
      <div class="tc"><button data-a="pp" aria-label="Play or pause"><i class="fa-solid fa-pause"></i></button>
      <button data-a="mu" aria-label="Mute"><i class="fa-solid fa-volume-high"></i></button>
      <button data-a="fs" aria-label="Fullscreen"><i class="fa-solid fa-expand"></i></button></div></div>`;
  }

  const ytCmd = f => { const el = $('#yt'); if (el && el.contentWindow) el.contentWindow.postMessage(JSON.stringify({ event: 'command', func: f, args: '' }), '*'); };
  function ytAct(a) {
    if (a === 'pp') { yt.playing = !yt.playing; ytCmd(yt.playing ? 'playVideo' : 'pauseVideo'); const btn = $('[data-a=pp] i'); if (btn) btn.className = 'fa-solid fa-' + (yt.playing ? 'pause' : 'play'); }
    if (a === 'mu') { yt.muted = !yt.muted; ytCmd(yt.muted ? 'mute' : 'unMute'); const btn = $('[data-a=mu] i'); if (btn) btn.className = 'fa-solid fa-volume-' + (yt.muted ? 'xmark' : 'high'); }
    if (a === 'fs') { const tr = $('#tr'); if (tr && tr.requestFullscreen) tr.requestFullscreen(); }
  }

  let playerHideTimer = null;

window.playServer = function(idx) {
  const st = $('#stage');
  if (!st || !cur) return;
  const srv = SERVERS[idx] || SERVERS[0];
  const streamUrl = srv.getUrl(cur, currentSeason, currentEpisode);
  
  const primaryServers = SERVERS.map((s, i) => ({ ...s, originalIdx: i })).filter(s => !s.isBackup);
  const backupServers = SERVERS.map((s, i) => ({ ...s, originalIdx: i })).filter(s => s.isBackup);
  
  // Clear any existing timer when switching servers
  clearTimeout(playerHideTimer);
  
  st.innerHTML = `
    <style>
      @media (max-width: 768px) {
        /* keep the player a proper 16:9 box instead of stretching */
        #stage:not(:fullscreen) { aspect-ratio: 16 / 9 !important; height: auto !important; min-height: 0 !important; max-height: none !important; }
        #playerIframe { width: 100% !important; height: 100% !important; }

        /* compact control bar so it doesn't cover the video */
        #playerNav { top: 8px !important; left: 8px !important; right: 8px !important; padding: 6px 8px !important; border-radius: 10px !important; }
        #playerNav > div > button, #playerNav > div > a { padding: 6px 10px !important; font-size: 11px !important; }
        #fsText { display: none; }
        #playerMiniBtn { top: 8px !important; left: 8px !important; width: 32px !important; height: 32px !important; }

        /* match the shield to the smaller bar */
        #adShield { top: 48px !important; height: calc(100% - 48px) !important; }
      }
    </style>
    <!-- Mini Trigger Button (Three Dots) - Shown when nav is hidden -->
    <button id="playerMiniBtn" onclick="togglePlayerNav()" style="position:absolute; top:16px; left:16px; z-index:35; background:rgba(10, 14, 23, 0.75); color:#fff; border:1px solid rgba(255,255,255,0.15); width:38px; height:38px; border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); box-shadow: 0 4px 20px rgba(0,0,0,0.5); opacity:0; pointer-events:none; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);" title="Show Controls">
      <i class="fa-solid fa-ellipsis" style="font-size:16px; color:#00f2fe;"></i>
    </button>

    <!-- Upgraded Modern Player Control Bar with Smooth Transition -->
    <div id="playerNav" style="position:absolute; top:16px; left:16px; right:16px; z-index:30; display:flex; justify-content:space-between; align-items:center; background:rgba(10, 14, 23, 0.9); padding:10px 16px; border-radius:14px; backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border:1px solid rgba(255,255,255,0.1); box-shadow: 0 8px 32px rgba(0,0,0,0.7); font-family:'Plus Jakarta Sans', sans-serif; opacity:1; transform:translateY(0); transition:all 0.35s cubic-bezier(0.4, 0, 0.2, 1);">
      
      <!-- Left: Server Selector Dropdown Toggle & Hide Button -->
      <div style="display:flex; align-items:center; gap:8px; position:relative;">
        <!-- Minimize / Hide Control Bar Button -->
        <button onclick="togglePlayerNav()" style="background:rgba(255,255,255,0.08); color:#94a3b8; border:1px solid rgba(255,255,255,0.1); width:32px; height:32px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s;" title="Hide Controls">
          <i class="fa-solid fa-ellipsis" style="font-size:14px;"></i>
        </button>

        <button onclick="toggleServerMenu()" style="background:linear-gradient(135deg, rgba(34,197,94,0.15), rgba(0,242,254,0.15)); color:#fff; border:1px solid rgba(34,197,94,0.3); padding:7px 14px; font-size:12px; border-radius:10px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:8px; transition:all 0.2s;">
          <i class="fa-solid fa-server" style="color:#22c55e;"></i> 
          <span>${srv.name}</span> 
          <i class="fa-solid fa-chevron-down" style="font-size:10px; opacity:0.8; margin-left:2px;"></i>
        </button>

        <!-- Hidden/Expandable Server List Popup -->
        <div id="serverDropdown" style="display:none; position:absolute; top:45px; left:40px; flex-direction:column; gap:6px; background:rgba(15, 23, 42, 0.95); padding:10px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.8); z-index:40; min-width:180px; backdrop-filter:blur(12px);">
          <div style="font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px; padding:0 4px;">Select Stream Source</div>
          ${primaryServers.map(s => `
            <button onclick="playServer(${s.originalIdx})" style="text-align:left; padding:8px 12px; font-size:12px; border-radius:8px; border:none; cursor:pointer; background:${s.originalIdx === idx ? 'rgba(34,197,94,0.2)' : 'transparent'}; color:${s.originalIdx === idx ? '#22c55e' : '#fff'}; font-weight:${s.originalIdx === idx ? '700' : '500'}; display:flex; align-items:center; justify-content:space-between; transition:background 0.2s;">
              <span>${s.name}</span>
              ${s.originalIdx === idx ? '<i class="fa-solid fa-check" style="font-size:10px; color:#22c55e;"></i>' : ''}
            </button>
          `).join('')}

          ${backupServers.length ? `
            <div style="border-top:1px solid rgba(255,255,255,0.1); margin-top:4px; padding-top:6px;">
              <select onchange="playServer(this.value)" style="width:100%; background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3); padding:8px 10px; font-size:11px; border-radius:8px; font-weight:bold; cursor:pointer;">
                <option value="" disabled selected>🆘 Emergency Backup</option>
                ${backupServers.map(s => `<option value="${s.originalIdx}" ${s.originalIdx === idx ? 'selected' : ''}>${s.name}</option>`).join('')}
              </select>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Right: Fullscreen & Popout Actions -->
      <div style="display:flex; align-items:center; gap:8px;">
        <button id="fsBtn" onclick="toggleFullscreen()" style="background:rgba(255,255,255,0.08); color:#fff; border:1px solid rgba(255,255,255,0.12); padding:7px 14px; font-size:12px; border-radius:10px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.2s;" title="Toggle Fullscreen">
          <i id="fsIcon" class="fa-solid fa-expand"></i> <span id="fsText">Fullscreen</span>
        </button>

        <a href="${esc(streamUrl)}" target="_blank" style="background:linear-gradient(135deg, #00f2fe, #4facfe); color:#000; text-decoration:none; padding:7px 14px; font-size:12px; border-radius:10px; font-weight:700; display:flex; align-items:center; gap:6px; box-shadow: 0 2px 10px rgba(0,242,254,0.3);">
          <i class="fa-solid fa-external-link-alt"></i> Popout
        </a>
      </div>
    </div>

    <!-- Anti-Ad Shield -->
    <div id="adShield" onclick="this.remove(); startPlayerHideTimer();" style="position:absolute; top:65px; left:0; width:100%; height:calc(100% - 65px); z-index:25; background:transparent; cursor:pointer;" title="Click once to interact"></div>

    <!-- Video iFrame -->
    <iframe id="playerIframe" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture; fullscreen" src="${esc(streamUrl)}" style="width:100%;height:100%;border:0;" onload="startPlayerHideTimer()"></iframe>
  `;
};

// Start the 5-second auto-hide timer
window.startPlayerHideTimer = function() {
  clearTimeout(playerHideTimer);
  playerHideTimer = setTimeout(() => {
    const nav = document.getElementById('playerNav');
    const mini = document.getElementById('playerMiniBtn');
    const dropdown = document.getElementById('serverDropdown');
    
    // Don't hide if the server dropdown menu is currently open
    if (dropdown && dropdown.style.display === 'flex') return;
    
    if (nav) {
      nav.style.opacity = '0';
      nav.style.transform = 'translateY(-15px)';
      nav.style.pointerEvents = 'none';
    }
    if (mini) {
      mini.style.opacity = '1';
      mini.style.pointerEvents = 'auto';
    }
  }, 5000);
};

// Toggle manually between full control bar and mini 3-dots trigger
window.togglePlayerNav = function() {
  const nav = document.getElementById('playerNav');
  const mini = document.getElementById('playerMiniBtn');
  if (!nav || !mini) return;
  
  const isHidden = nav.style.opacity === '0';
  if (isHidden) {
    // Show Nav, Hide Mini Button
    nav.style.opacity = '1';
    nav.style.transform = 'translateY(0)';
    nav.style.pointerEvents = 'auto';
    
    mini.style.opacity = '0';
    mini.style.pointerEvents = 'none';
    
    // Restart timer when manually opened
    startPlayerHideTimer();
  } else {
    // Hide Nav, Show Mini Button
    nav.style.opacity = '0';
    nav.style.transform = 'translateY(-15px)';
    nav.style.pointerEvents = 'none';
    
    mini.style.opacity = '1';
    mini.style.pointerEvents = 'auto';
    
    clearTimeout(playerHideTimer);
  }
};

// Toggle Server Menu Dropdown
window.toggleServerMenu = function() {
  const dropdown = document.getElementById('serverDropdown');
  if (dropdown) {
    const isVisible = dropdown.style.display === 'flex';
    dropdown.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) {
      clearTimeout(playerHideTimer); // Keep menu open while interacting
    }
  }
};

// Toggle Server Menu Dropdown
window.toggleServerMenu = function() {
  const dropdown = document.getElementById('serverDropdown');
  if (dropdown) {
    dropdown.style.display = dropdown.style.display === 'flex' ? 'none' : 'flex';
  }
};

// Close server dropdown if clicking anywhere outside
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('serverDropdown');
  if (dropdown && dropdown.style.display === 'flex') {
    if (!e.target.closest('button[onclick="toggleServerMenu()"]') && !e.target.closest('#serverDropdown')) {
      dropdown.style.display = 'none';
    }
  }
});

  window.toggleServerMenu = function() {
    const dropdown = document.getElementById('serverDropdown');
    if (dropdown) {
      dropdown.style.display = dropdown.style.display === 'flex' ? 'none' : 'flex';
    }
  };

  window.toggleFullscreen = function() {
    const stage = document.getElementById('stage');
    const fsIcon = document.getElementById('fsIcon');
    const fsText = document.getElementById('fsText');
    if (!stage) return;

    if (!document.fullscreenElement) {
      stage.requestFullscreen().then(() => {
        if (fsIcon) fsIcon.className = 'fa-solid fa-compress';
        if (fsText) fsText.textContent = 'Minimize';
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        if (fsIcon) fsIcon.className = 'fa-solid fa-expand';
        if (fsText) fsText.textContent = 'Fullscreen';
      }).catch(() => {});
    }
  };

  function closeModal() {
    const m = $('#modal');
    if (m) {
      m.hidden = true;
    }
    const st = $('#stage');
    if (st) st.innerHTML = '';
    document.body.style.overflow = '';
  }

  function setView(v) {
    view = v;
    document.querySelectorAll('.links button').forEach(b => b.classList.toggle('on', b.dataset.view === v));
    const q = $('#q');
    if (q) q.value = ''; 
    search('');
    loadHero(); 
    buildRows();
    scrollTo({ top: 0 });
  }

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-view],[data-open],[data-dot],[data-a],[data-back],#close,#tr');
    if (!t) { if (e.target.id === 'modal') closeModal(); return; }
    if (t.dataset.view) { e.preventDefault(); setView(t.dataset.view); }
    else if (t.dataset.dot) { showHero(+t.dataset.dot); }
    else if (t.dataset.open) { 
      const x = hero[+t.dataset.open]; 
      if (x) {
        const sIdx = t.dataset.server ? parseInt(t.dataset.server) : 0;
        openDetail(x.id, x.media_type, !!t.dataset.trailer, sIdx); 
      }
    }
    else if (t.dataset.back !== undefined) {
      $('#category').hidden = true;
      $('#hero').hidden = false;
      $('#rows').hidden = false;
      scrollTo({ top: 0 });
    }
    else if (t.dataset.a) { e.stopPropagation(); ytAct(t.dataset.a); }
    else if (t.id === 'tr') ytAct('pp');
    else if (t.id === 'close') closeModal();
  });

  document.addEventListener('keydown', e => e.key === 'Escape' && closeModal());
  addEventListener('scroll', () => { const nav = $('#nav'); if (nav) nav.classList.toggle('solid', scrollY > 30); }, { passive: true });
  
  const qInput = $('#q');
  if (qInput) qInput.addEventListener('input', e => search(e.target.value.trim()));

  if (!TMDB_API_KEY && TMDB_BASE.includes('themoviedb.org')) { 
    const setup = $('#setup'); if (setup) setup.hidden = false; 
    const heroEl = $('#hero'); if (heroEl) heroEl.hidden = true; 
  } else { 
    loadHero(); 
    buildRows(); 
  }
})();
