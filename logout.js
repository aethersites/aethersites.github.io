// /js/logout.js
// Minimal sign-out helper (Firebase JS SDK v12.1.0).
// Ensure you initialize Firebase (initializeApp) on the page BEFORE importing this module.

import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const qs = (s, ctx = document) => ctx.querySelector(s);
const qsa = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

function setTimestampNode(date = new Date()) {
  const timeEl = qs('.hint time');
  if (!timeEl) return;
  timeEl.textContent = date.toLocaleString();
  timeEl.dateTime = date.toISOString();
}

function showInlineError(msg) {
  let err = qs('#logoutError');
  if (!err) {
    err = document.createElement('div');
    err.id = 'logoutError';
    err.setAttribute('role', 'alert');
    err.style.marginTop = '12px';
    err.style.fontSize = '13px';
    err.style.color = 'var(--muted)';
    const container = qs('.card') || document.body;
    container.appendChild(err);
  }
  err.textContent = msg;
}

function disableActionButtons() {
  qsa('.actions .btn').forEach(btn => {
    btn.setAttribute('aria-disabled', 'true');
    btn.classList.add('disabled');
    btn.addEventListener('click', (e) => {
      if (btn.getAttribute('aria-disabled') === 'true') e.preventDefault();
    }, { capture: true });
  });
}

async function doSignOut({ redirectTo = null, redirectDelay = 600 } = {}) {
  setTimestampNode(new Date());

  let auth;
  try {
    auth = getAuth(); // will throw if Firebase is not initialized
  } catch (err) {
    const msg = 'Firebase Auth not available. Initialize Firebase (initializeApp) on this page before loading logout.js';
    console.error('[logout.js] getAuth error:', err);
    showInlineError(msg);
    return Promise.reject(new Error(msg));
  }

  try {
    console.log('[logout.js] Attempting signOut()');
    await signOut(auth);
    // small safety: wait briefly for onAuthStateChanged -> user === null
    await new Promise((resolve) => {
      try {
        const off = onAuthStateChanged(auth, (user) => {
          if (!user) { off(); resolve(); }
        });
        setTimeout(() => { try { off(); } catch (e) {}; resolve(); }, 1500);
      } catch (e) { resolve(); }
    });

    console.log('[logout.js] signOut successful');
    const title = qs('#signedOutTitle'); if (title) title.textContent = "You've been signed out";
    disableActionButtons();

    if (redirectTo) setTimeout(() => { location.href = redirectTo; }, Math.max(0, redirectDelay));
    return;
  } catch (err) {
    console.error('[logout.js] signOut error:', err);
    showInlineError('There was a problem signing you out. Please try again.');
    return Promise.reject(err);
  }
}

// auto-run on load unless body data-auto="false"
function getRedirectFromDOMOrQuery() {
  const body = document.body;
  const dataRedirect = body?.getAttribute('data-redirect');
  if (dataRedirect) return dataRedirect;
  const params = new URLSearchParams(location.search);
  return params.get('next') || params.get('redirect') || null;
}

function init() {
  setTimestampNode(new Date());

  const signoutBtn = qs('#signoutBtn');
  if (signoutBtn) {
    signoutBtn.addEventListener('click', () => {
      doSignOut({ redirectTo: getRedirectFromDOMOrQuery() }).catch(()=>{});
    });
  }

  const auto = document.body?.getAttribute('data-auto');
  const shouldAuto = (auto === null || auto === undefined) ? true : (auto !== 'false');
  if (shouldAuto) {
    const redirectTo = getRedirectFromDOMOrQuery();
    doSignOut({ redirectTo }).catch(()=>{});
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

// optional export if someone wants to call it manually:
export { doSignOut as forceSignOut };
