// streamFY appearance: light / dark / system mode + accent colour (saved on this device)
(() => {
  'use strict';
  const MODE_KEY = 'streamfy_mode', ACCENT_KEY = 'streamfy_accent';
  const ACCENTS = {
    aurora: { name: 'Aurora', a: '#22d3ee', v: '#8b5cf6' },
    sunset: { name: 'Sunset', a: '#fb923c', v: '#ec4899' },
    ocean:  { name: 'Ocean',  a: '#38bdf8', v: '#6366f1' },
    forest: { name: 'Forest', a: '#4ade80', v: '#14b8a6' },
    rose:   { name: 'Rose',   a: '#fb7185', v: '#a855f7' },
    gold:   { name: 'Gold',   a: '#fbbf24', v: '#f97316' }
  };
  const read = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;

  let mode = ['light', 'dark', 'system'].includes(read(MODE_KEY)) ? read(MODE_KEY) : 'dark';
  let accent = ACCENTS[read(ACCENT_KEY)] ? read(ACCENT_KEY) : 'aurora';

  const effective = () => (mode === 'system' ? (mq && mq.matches ? 'light' : 'dark') : mode);

  function apply() {
    const root = document.documentElement, eff = effective(), c = ACCENTS[accent];
    root.dataset.mode = eff;
    root.dataset.accent = accent;
    if (accent === 'aurora') {
      ['--a', '--v', '--grad'].forEach(p => root.style.removeProperty(p));
    } else {
      root.style.setProperty('--a', c.a);
      root.style.setProperty('--v', c.v);
      root.style.setProperty('--grad', 'linear-gradient(135deg,' + c.a + ',' + c.v + ')');
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', eff === 'light' ? '#f3f5fa' : '#0a0e17');
    window.dispatchEvent(new CustomEvent('streamfy:theme'));
  }

  window.StreamfyTheme = {
    ACCENTS,
    get mode() { return mode; },
    get accent() { return accent; },
    effective,
    setMode(m) { if (!['light', 'dark', 'system'].includes(m)) return; mode = m; write(MODE_KEY, m); apply(); },
    setAccent(id) { if (!ACCENTS[id]) return; accent = id; write(ACCENT_KEY, id); apply(); }
  };

  if (mq) {
    const onChange = () => { if (mode === 'system') apply(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
  }
  apply();
})();
