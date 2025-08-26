// /js/logout.js
// Firebase v12.1.0 logout helper
// - Re-uses an already-initialized Firebase app if present
// - If window.__FIREBASE_CONFIG__ is set but no app exists, this module will initialize Firebase
// - Auto signs out on load (can be disabled via <body data-auto="false">)
// - Optionally redirect via <body data-redirect="/?signedout=1"> or ?next=... query param
//
// Exports: forceSignOut() -> Promise<void>

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyCOHC_OvQ4onPkhLvHzZEPazmY6PRcxjnw",
    authDomain: "goodplates-7ae36.firebaseapp.com",
    projectId: "goodplates-7ae36",
    storageBucket: "goodplates-7ae36.firebasestorage.app",
    messagingSenderId: "541149626283",
    appId: "1:541149626283:web:928888f0b42cda49b7dcee",
    measurementId: "G-HKMSHM726J"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>

const cfg = window.__FIREBASE_CONFIG__ || null;

if (!getApps().length) {
  if (!cfg) {
    console.warn('[logout.js] No Firebase app found and window.__FIREBASE_CONFIG__ is not set. ' +
                 'If Firebase is initialized elsewhere this is fine; otherwise set window.__FIREBASE_CONFIG__ before importing this module.');
  } else {
    try {
      initializeApp(cfg);
      // don't import analytics here; optional and not necessary for sign-out
    } catch (err) {
      console.error('[logout.js] initializeApp error:', err);
    }
  }
}

// Acquire auth safely (getAuth will pick the default app)
let auth = null;
try { auth = getAuth(); } catch (e) {
  // if getAuth fails, we'll handle it later when attempting sign-out
  console.warn('[logout.js] getAuth() not available yet:', e);
}

/* --------------------------
   DOM helpers / UI
   -------------------------- */
const qs = (s, ctx = document) => ctx.querySelector(s);
const qsa = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

function setTimestampNode(date = new Date()) {
  const timeEl = qs('.hint time');
  if (!timeEl) return;
  timeEl.textContent = date.toLocaleString();
  timeEl.dateTime = date.toISOString();
}

function setStatusText(title, leadText) {
  const titleEl = qs('#signedOutTitle');
  const leadEl  = qs('.lead');
  if (titleEl && title) titleEl.textContent = title;
  if (leadEl && leadText) leadEl.textContent = leadText;
}

function disableActionButtons() {
  qsa('.actions .btn').forEach(btn => {
    btn.setAttribute('aria-disabled', 'true');
    btn.classList.add('disabled');
    // prevent anchor navigation if disabled
    btn.addEventListener('click', (e) => {
      if (btn.getAttribute('aria-disabled') === 'true') e.preventDefault();
    }, { capture: true });
  });
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

/* --------------------------
   Core: sign-out
   -------------------------- */

/**
 * Force sign out the current user.
 * @param {{ redirectTo?: string|null, redirectDelay?: number }} opts
 * @returns {Promise<void>}
 */
export async function forceSignOut({ redirectTo = null, redirectDelay = 600 } = {}) {
  setTimestampNode(new Date());

  // ensure auth is available
  if (!auth) {
    try { auth = getAuth(); } catch (e) {
      const msg = 'Unable to access Firebase Auth. Make sure Firebase is initialized or window.__FIREBASE_CONFIG__ is set.';
      console.error('[logout.js] getAuth error:', e);
      showInlineError(msg);
      return Promise.reject(new Error(msg));
    }
  }

  try {
    await signOut(auth);

    // wait for onAuthStateChanged to report user==null (safety)
    await new Promise((resolve) => {
      const off = onAuthStateChanged(auth, (user) => {
        if (!user) { off(); resolve(); }
      });
      // fallback timeout in case the event doesn't fire quickly
      setTimeout(() => { try { off(); } catch (e) {} ; resolve(); }, 2000);
    });

    // UI changes
    setStatusText("You've been signed out", "For your security, your session has ended. You can return to the homepage or sign in again.");
    disableActionButtons();

    if (redirectTo) {
      setTimeout(() => { location.href = redirectTo; }, Math.max(0, redirectDelay));
    }
  } catch (err) {
    console.error('[logout.js] signOut error:', err);
    showInlineError('There was a problem signing you out. Please try again.');
    return Promise.reject(err);
  }
}

/* --------------------------
   Auto-init behavior
   -------------------------- */
function getRedirectFromDOMOrQuery() {
  const body = document.body;
  const dataRedirect = body?.getAttribute('data-redirect');
  if (dataRedirect) return dataRedirect;
  const params = new URLSearchParams(location.search);
  return params.get('next') || params.get('redirect') || null;
}

function init() {
  // not in browser
  if (typeof window === 'undefined') return;

  setTimestampNode(new Date());

  // keyboard support for anchors (space)
  qsa('.actions .btn').forEach(el => {
    el.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); el.click(); }
    });
  });

  // retry support
  const retryBtn = qs('#retrySignOut');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      const prev = qs('#logoutError'); if (prev) prev.textContent = '';
      forceSignOut({ redirectTo: getRedirectFromDOMOrQuery() }).catch(() => {});
    });
  }

  const auto = document.body?.getAttribute('data-auto');
  const shouldAuto = (auto === null || auto === undefined) ? true : (auto !== 'false');

  if (shouldAuto) {
    const redirectTo = getRedirectFromDOMOrQuery();
    forceSignOut({ redirectTo }).catch(() => {});
  }

  // Watch: if a user appears (still signed in), retry signOut quietly
  try {
    if (!auth) auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        console.warn('[logout.js] auth state changed: user present; retrying sign-out.');
        forceSignOut({ redirectTo: getRedirectFromDOMOrQuery() }).catch(() => {});
      }
    });
  } catch (e) {
    // ignore - we already warn earlier if auth unavailable
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
