// streamFY Settings page: profile, appearance (light/dark + accent), account
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!$('settings') || !$('profName')) return;
  const T = window.StreamfyTheme;
  const A = () => window.StreamfyAuth;

  let draft = null;

  // ---------- Profile ----------
  function previewProfile() {
    const base = A() && A().profile();
    return base ? Object.assign({}, base, draft, { initial: ((draft.name || base.name).charAt(0) || '?').toUpperCase() }) : null;
  }

  function drawPicker() {
    const a = A(), base = a && a.profile();
    if (!base || !draft) return;
    const p = previewProfile();
    a.renderAvatar($('profAvatar'), p);

    const box = $('avatarPick');
    box.textContent = '';
    const add = (label, pressed, onClick, build) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'pick'; b.setAttribute('aria-label', label);
      b.setAttribute('aria-pressed', String(pressed));
      build(b);
      b.addEventListener('click', onClick);
      box.appendChild(b);
    };

    if (base.photo) {
      add('Use my account photo', draft.usePhoto, () => { draft.usePhoto = true; drawPicker(); }, b => {
        const i = new Image(); i.alt = ''; i.referrerPolicy = 'no-referrer'; i.src = base.photo; b.appendChild(i);
      });
    }
    add('Use my initial', !draft.usePhoto && draft.emoji === '', () => { draft.usePhoto = false; draft.emoji = ''; drawPicker(); },
      b => { b.textContent = base.initial; });
    a.EMOJIS.forEach(em => add('Avatar ' + em, !draft.usePhoto && draft.emoji === em,
      () => { draft.usePhoto = false; draft.emoji = em; drawPicker(); }, b => { b.textContent = em; }));

    const colors = $('colorPick');
    colors.textContent = '';
    a.AVATAR_COLORS.forEach((g, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'pick color'; b.style.background = g;
      b.setAttribute('aria-label', 'Colour ' + (i + 1));
      b.setAttribute('aria-pressed', String(draft.color === i));
      b.addEventListener('click', () => { draft.color = i; draft.usePhoto = false; drawPicker(); });
      colors.appendChild(b);
    });
  }

  function loadProfile() {
    const a = A(), p = a && a.profile();
    if (!p) return;
    draft = { name: p.name, emoji: p.emoji, color: p.color, usePhoto: p.usePhoto };
    $('profName').value = p.name;
    $('profEmail').textContent = p.email;
    $('accountEmail').textContent = p.email;
    $('profStatus').textContent = '';
    drawPicker();
  }

  $('profName').addEventListener('input', e => { if (draft) { draft.name = e.target.value.slice(0, 30); drawPicker(); } });

  $('profSave').addEventListener('click', async () => {
    const a = A(), st = $('profStatus'), btn = $('profSave');
    if (!a || !draft) return;
    btn.disabled = true; st.className = 'prof-status'; st.textContent = 'Saving...';
    try {
      await a.saveProfile({
        display_name: draft.name.trim(),
        avatar_emoji: draft.emoji,
        avatar_color: draft.color,
        avatar_photo: draft.usePhoto
      });
      st.className = 'prof-status ok'; st.textContent = 'Saved!';
      loadProfile();
      st.className = 'prof-status ok'; st.textContent = 'Saved!';
    } catch (err) {
      st.className = 'prof-status err'; st.textContent = err.message || 'Could not save. Try again.';
    } finally {
      btn.disabled = false;
    }
  });

  // ---------- Appearance ----------
  const dark = $('darkToggle'), follow = $('followSystem');
  function syncAppearance() {
    if (!T) return;
    follow.checked = T.mode === 'system';
    dark.checked = T.effective() === 'dark';
    dark.disabled = follow.checked;
    $('modeLabel').textContent = T.effective() === 'dark' ? 'Dark mode' : 'Light mode';
    document.querySelectorAll('#accentGrid .swatch').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.accent === T.accent)));
  }
  if (T) {
    dark.addEventListener('change', () => { T.setMode(dark.checked ? 'dark' : 'light'); syncAppearance(); });
    follow.addEventListener('change', () => { T.setMode(follow.checked ? 'system' : (dark.checked ? 'dark' : 'light')); syncAppearance(); });
    const grid = $('accentGrid');
    Object.keys(T.ACCENTS).forEach(id => {
      const c = T.ACCENTS[id];
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'swatch'; b.dataset.accent = id;
      b.setAttribute('aria-label', c.name + ' theme');
      b.style.setProperty('--s1', c.a); b.style.setProperty('--s2', c.v);
      b.innerHTML = '<span class="dot"></span><span class="nm"></span>';
      b.querySelector('.nm').textContent = c.name;
      b.addEventListener('click', () => { T.setAccent(id); syncAppearance(); });
      grid.appendChild(b);
    });
    window.addEventListener('streamfy:theme', syncAppearance);
    syncAppearance();
  }

  // ---------- Account ----------
  $('logoutBtn').addEventListener('click', () => { if (A()) A().logout(); });

  window.addEventListener('streamfy:settings', () => { loadProfile(); syncAppearance(); });
  window.addEventListener('streamfy:auth', loadProfile);
})();
