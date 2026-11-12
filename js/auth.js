// streamFY accounts + guest mode (Supabase), privacy consent, profile
(() => {
  'use strict';
  const C = window.STREAMFY_CONFIG || {};
  const $ = id => document.getElementById(id);
  if (!$('authGate')) return; // markup missing: leave the app unrestricted

  const GUEST_KEY = 'streamfy_guest';              // sessionStorage: guest choice lasts until the tab closes
  const CONSENT_KEY = 'streamfy_privacy_agreed';   // localStorage: which policy version was accepted
  const RETURNING_KEY = 'streamfy_returning';      // localStorage: this device has signed in before
  const PRIVACY_VERSION = '2026-11-12';            // bump this to ask everyone to agree again
  const LOCKED = {                                  // views guests cannot open
    watchlist: 'view your watchlist',
    history: 'see your watch history',
    settings: 'change settings and switch servers'
  };
  const MIN_PW = 6;
  const MIGRATE = ['watchlist', 'history', 'default_server'];
  const EMOJIS = ['🎬', '🍿', '🚀', '👾', '🦊', '🐼', '🌙', '⚡'];
  const AVATAR_COLORS = [
    'linear-gradient(135deg,#22d3ee,#8b5cf6)', 'linear-gradient(135deg,#fb923c,#ec4899)',
    'linear-gradient(135deg,#4ade80,#0ea5e9)', 'linear-gradient(135deg,#f472b6,#a855f7)',
    'linear-gradient(135deg,#fbbf24,#f97316)', 'linear-gradient(135deg,#64748b,#1e293b)'
  ];

  const lsRead = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsWrite = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  let sb = null, user = null, guest = false, gateOpen = false, mode = 'signin', lastId = null, pending = false;
  let consented = lsRead(CONSENT_KEY) === PRIVACY_VERSION;
  let returning = lsRead(RETURNING_KEY) === '1';
  try { guest = sessionStorage.getItem(GUEST_KEY) === '1'; } catch (e) {}

  // ---- Supabase client (guarded so guest mode still works if it fails) ----
  const joined = (C.SUPABASE_URL || '') + (C.SUPABASE_ANON_KEY || '');
  const configured = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY) && !/your-/i.test(joined);
  if (configured) {
    try { sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY); }
    catch (err) { console.error('Supabase failed to initialise:', err); }
  }
  // A returning signed-in user (or someone coming back from Google) has a session to load: don't flash the gate
  if (sb && !guest) {
    try {
      pending = Object.keys(localStorage).some(k => /^sb-.+-auth-token$/.test(k)) ||
                /access_token=|[?&]code=/.test(location.hash + location.search);
    } catch (e) {}
  }

  // ---- Profile helpers ----
  function profile() {
    if (!user) return null;
    const m = user.user_metadata || {};
    const email = user.email || '';
    const name = String(m.display_name || m.full_name || m.name || email.split('@')[0] || 'Viewer').slice(0, 30);
    const rawPhoto = typeof m.avatar_url === 'string' ? m.avatar_url : (typeof m.picture === 'string' ? m.picture : '');
    const photo = /^https:\/\//i.test(rawPhoto) ? rawPhoto : '';
    return {
      name, email, photo,
      usePhoto: !!photo && m.avatar_photo !== false,
      emoji: EMOJIS.includes(m.avatar_emoji) ? m.avatar_emoji : '',
      color: Number.isInteger(m.avatar_color) && m.avatar_color >= 0 && m.avatar_color < AVATAR_COLORS.length ? m.avatar_color : 0,
      initial: (name.charAt(0) || '?').toUpperCase()
    };
  }

  function renderAvatar(el, p) {
    if (!el || !p) return;
    el.textContent = '';
    el.style.background = AVATAR_COLORS[p.color];
    if (p.usePhoto && p.photo) {
      const img = new Image();
      img.alt = '';
      img.referrerPolicy = 'no-referrer';
      img.onerror = () => { el.textContent = p.emoji || p.initial; };
      img.src = p.photo;
      el.appendChild(img);
    } else {
      el.textContent = p.emoji || p.initial;
    }
  }

  async function saveProfile(patch) {
    if (!sb || !user) throw new Error('You need to be signed in.');
    const { data, error } = await sb.auth.updateUser({ data: patch });
    if (error) throw error;
    setUser(data.user);
  }

  // ---- Public API used by app.js / settings.js ----
  const key = name => (user ? 'streamfy_' + name + '_' + user.id : null); // per-account storage key; null for guests
  const isGuest = () => !user;

  function promptSignIn(feature) {
    $('apText').textContent = 'Sign in or create a free account to ' + (feature || 'use this feature') + '.';
    $('authPrompt').hidden = false;
    $('apSignin').focus();
  }
  const closePrompt = () => { $('authPrompt').hidden = true; };

  async function logout() {
    try { if (sb) await sb.auth.signOut(); } catch (e) { console.error(e); }
    guest = false; gateOpen = false;
    try { sessionStorage.removeItem(GUEST_KEY); } catch (e) {}
    const modal = $('modal');
    if (modal && !modal.hidden && $('close')) $('close').click();   // stops any playing video
    const home = document.querySelector('.links [data-view="home"]');
    if (home) home.click();
    form.reset(); setMode('signin');
    setUser(null);
  }

  window.StreamfyAuth = {
    isGuest, isUser: () => !!user, key, promptSignIn, profile, renderAvatar, saveProfile, logout,
    EMOJIS, AVATAR_COLORS, get user() { return user; }
  };

  // Data saved before accounts existed moves to the first account that signs in on this device
  function migrateLegacy() {
    try {
      MIGRATE.forEach(n => {
        const old = localStorage.getItem('streamfy_' + n);
        if (old === null) return;
        if (localStorage.getItem(key(n)) === null) localStorage.setItem(key(n), old);
        localStorage.removeItem('streamfy_' + n);
      });
    } catch (e) {}
  }

  // ---- UI state ----
  let consentFocused = false;
  function render() {
    const open = consented && !pending && !user && (!guest || gateOpen);
    $('authGate').hidden = !open;
    document.body.classList.toggle('auth-locked', open || !consented);
    document.querySelectorAll('#nav, main, footer, #mobileMenuBtn').forEach(el => {
      if (open || !consented) el.setAttribute('inert', ''); else el.removeAttribute('inert');
    });

    // Privacy screen (first thing a new visitor sees)
    document.body.classList.toggle('consent-mode', !consented);
    $('ppConsent').hidden = consented;
    if (!consented) {
      $('privacyModal').hidden = false;
      if (!consentFocused) { consentFocused = true; $('ppAgree').focus(); }
    }

    // Header account area
    const box = $('authBox'), badge = $('authBadge'), chip = $('authChip'), act = $('authAction');
    box.hidden = open || pending || !consented || (!user && !guest);
    if (user) {
      const p = profile();
      badge.hidden = true;
      chip.hidden = false;
      $('chipName').textContent = p.name;
      chip.title = p.email;
      renderAvatar($('chipAvatar'), p);
      act.dataset.act = 'logout';
      act.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i><span class="lbl">Log out</span>';
    } else {
      chip.hidden = true;
      badge.hidden = false;
      badge.textContent = 'Guest';
      badge.title = 'Guest mode (limited)';
      act.dataset.act = 'signin';
      act.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i><span class="lbl">Sign in</span>';
    }
    document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('locked', !user && !!LOCKED[b.dataset.view]));
  }

  function setUser(u) {
    pending = false;
    user = u || null;
    if (user) {
      guest = false; gateOpen = false;
      returning = true; lsWrite(RETURNING_KEY, '1');
      try { sessionStorage.removeItem(GUEST_KEY); } catch (e) {}
      migrateLegacy();
    }
    render();
    const id = user ? user.id : null;
    if (id !== lastId) {
      lastId = id;
      window.dispatchEvent(new CustomEvent('streamfy:auth', { detail: { user } }));
    }
  }

  // ---- Sign In / Sign Up switching ----
  const tabs = $('authTabs'), tabIn = $('tabSignIn'), tabUp = $('tabSignUp');
  const form = $('authForm'), email = $('authEmail'), pass = $('authPass');
  const confirmGroup = $('authConfirmGroup'), confirmInput = $('authConfirm'), submit = $('authSubmit');

  function setStatus(text = '', type = '') {
    const s = $('authStatus');
    s.className = 'auth-status' + (type ? ' ' + type : '');
    s.textContent = text;
  }

  function setMode(m) {
    mode = m === 'signup' ? 'signup' : 'signin';
    const up = mode === 'signup';
    tabs.dataset.mode = mode;
    tabIn.classList.toggle('active', !up);
    tabUp.classList.toggle('active', up);
    tabIn.setAttribute('aria-selected', String(!up));
    tabUp.setAttribute('aria-selected', String(up));
    submit.textContent = up ? 'Create account' : 'Sign in';
    confirmGroup.hidden = !up;
    confirmInput.required = up;
    confirmInput.value = '';
    pass.autocomplete = up ? 'new-password' : 'current-password';
    $('authSwitchText').textContent = up ? 'Already have an account?' : "Don't have an account?";
    $('authSwitchLink').textContent = up ? 'Sign in' : 'Sign up';
    setStatus();
  }

  function openGate(m) {
    gateOpen = true;
    form.reset();
    setMode(m || 'signin');
    render();
    if (consented) email.focus();
  }

  tabIn.addEventListener('click', () => setMode('signin'));
  tabUp.addEventListener('click', () => setMode('signup'));
  $('authSwitchLink').addEventListener('click', () => setMode(mode === 'signin' ? 'signup' : 'signin'));

  const notReady = () => setStatus(configured
    ? 'Could not reach the sign-in service. Check your connection and reload.'
    : 'Sign-in is not set up yet. Add your Supabase keys in js/config.js.', 'error');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const em = email.value.trim(), pw = pass.value;
    if (!em || !pw) return setStatus('Please enter your email and password.', 'error');
    if (mode === 'signup') {
      if (pw.length < MIN_PW) return setStatus('Password must be at least ' + MIN_PW + ' characters.', 'error');
      if (pw !== confirmInput.value) return setStatus('Passwords do not match.', 'error');
    }
    if (!sb) return notReady();

    submit.disabled = true;
    setStatus(mode === 'signin' ? 'Signing in...' : 'Creating account...');
    try {
      if (mode === 'signin') {
        const { data, error } = await sb.auth.signInWithPassword({ email: em, password: pw });
        if (error) throw error;
        form.reset();
        setUser(data.user);
      } else {
        const { data, error } = await sb.auth.signUp({ email: em, password: pw });
        if (error) throw error;
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          setStatus('This email is already registered. Try signing in instead.', 'error');
          return;
        }
        returning = true; lsWrite(RETURNING_KEY, '1');
        if (data.session) {            // email confirmation off: signed in straight away
          form.reset();
          setUser(data.user);
        } else {                       // email confirmation on
          setStatus('Account created! Check your email to confirm, then sign in.', 'success');
          setTimeout(() => { setMode('signin'); setStatus('Confirm your email, then sign in.', 'success'); }, 2500);
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setStatus(err.message || 'An unexpected error occurred.', 'error');
    } finally {
      submit.disabled = false;
    }
  });

  // ---- Continue with Google ----
  $('googleBtn').addEventListener('click', async () => {
    if (!sb) return notReady();
    setStatus('Opening Google...');
    try {
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: location.origin + location.pathname }
      });
      if (error) throw error;
    } catch (err) {
      console.error('Google sign-in error:', err);
      setStatus(err.message || 'Google sign-in failed.', 'error');
    }
  });

  // ---- Privacy consent (first screen for new visitors) ----
  $('ppAgree').addEventListener('click', () => {
    consented = true;
    lsWrite(CONSENT_KEY, PRIVACY_VERSION);
    $('ppDeclineMsg').hidden = true;
    $('privacyModal').hidden = true;
    document.body.style.overflow = '';
    if (!user && !pending && !guest) openGate(returning ? 'signin' : 'signup'); else render();
  });
  $('ppDecline').addEventListener('click', () => { $('ppDeclineMsg').hidden = false; });

  // ---- Guest, log out, prompts ----
  $('guestBtn').addEventListener('click', () => {
    guest = true; gateOpen = false;
    try { sessionStorage.setItem(GUEST_KEY, '1'); } catch (e) {}
    render();
  });

  $('authAction').addEventListener('click', () => {
    if ($('authAction').dataset.act === 'logout') logout(); else openGate('signin');
  });
  $('authChip').addEventListener('click', () => {
    const b = document.querySelector('.links [data-view="settings"]');
    if (b) b.click();
  });
  $('apSignin').addEventListener('click', () => { closePrompt(); openGate('signin'); });
  $('apClose').addEventListener('click', closePrompt);
  $('authPrompt').addEventListener('click', e => { if (e.target === $('authPrompt')) closePrompt(); });

  // Guests tapping a locked nav item get the prompt instead (capture phase: runs before app.js)
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-view]');
    if (!b || user || !LOCKED[b.dataset.view]) return;
    e.preventDefault();
    e.stopPropagation();
    const sheet = $('mobileMenuOverlay');
    if (sheet && sheet.classList.contains('open')) $('closeMobileMenu').click();
    promptSignIn(LOCKED[b.dataset.view]);
  }, true);

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('authPrompt').hidden) closePrompt();
    else if (gateOpen && guest) { gateOpen = false; render(); }
  });

  // ---- Start ----
  setMode(returning ? 'signin' : 'signup');
  if (!sb) { setUser(null); return; }
  render();
  sb.auth.getSession()
    .then(({ data }) => setUser(data && data.session ? data.session.user : null))
    .catch(() => setUser(null));
  sb.auth.onAuthStateChange((_event, session) => setUser(session ? session.user : null));
})();
