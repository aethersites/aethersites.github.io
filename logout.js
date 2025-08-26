// logout.js
// Firebase v12.1.0 logout helper for "signed out" pages
//
// Usage:
// 1) Add your firebaseConfig somewhere before loading this module:
//    <script>window.__FIREBASE_CONFIG__ = { apiKey: "...", authDomain: "...", ... };</script>
//    <script type="module" src="/path/to/logout.js"></script>
//
// 2) Or initialize Firebase elsewhere (this module will reuse that app).
//
// 3) Optional: add data-auto="true" to <body> to auto-sign-out on load (default behavior).
//    You can provide a redirect using: <body data-redirect="/?signedout=1"> or ?next= in URL.
//
// Exports: forceSignOut() - returns a Promise that resolves when sign-out completes (or rejects on error).

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

/* --------------------------
   Configuration: pick up config from window.__FIREBASE_CONFIG__ if provided
   -------------------------- */
const cfg = window.__FIREBASE_CONFIG__ || null;

if (!getApps().length) {
  if (!cfg) {
    console.warn('[logout.js] No Firebase config found on window.__FIREBASE_CONFIG__. ' +
                 'If Firebase is initialized elsewhere this is fine; otherwise set window.__FIREBASE_CONFIG__ before importing this module.');
  } else {
    try {
      initializeApp(cfg);
    } catch (err) {
      console.error('[logout.js] initializeApp error:', err);
    }
  }
}

// Get auth (will use already-initialized app if present)
const auth = getAuth();

/* --------------------------
   Helpers: DOM helpers + UI updates
   -------------------------- */
const qs = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

function setTimestampNode(date = new Date()) {
  const timeEl = qs('.hint time');
  if (!timeEl) return;
  timeEl.textContent = date.toLocaleString();
  timeEl.dateTime = date.toISOString();
}

function setStatusText(title, leadText) {
  const titleEl = qs('#signedOutTitle');
  const leadEl  = qs('.lead');
  if (titleEl) titleEl.textContent = title;
  if (leadEl && leadText) leadEl.textContent = leadText;
}

function disableActionButtons() {
  qsa('.actions .btn').forEach(btn => {
    btn.setAttribute('aria-disabled', 'true');
    btn.classList.add('disabled');
    // If it's an <a>, prevent navigation
    btn.addEventListener('click', (e) => {
      if (btn.getAttribute('aria-disabled') === 'true') e.preventDefault();
    }, { once: false });
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
    // put it after small-muted
    const container = qs('.card');
    container?.appendChild(err);
  }
  err.textContent = msg;
}

/* --------------------------
   Sign-out logic
   -------------------------- */

/**
 * Signs out the currently authenticated user.
 * @param {{ redirectTo?: string|null, redirectDelay?: number }} opts
 * @returns {Promise<void>}
 */
export async function forceSignOut({ redirectTo = null, redirectDelay = 600 } = {}) {
  // set timestamp immediately for UX
  setTimestampNode(new Date());

  // Try to sign out
  try {
    await signOut(auth);
    // Confirm using onAuthStateChanged (fires with user=null when signed out)
    await new Promise((resolve) => {
      const off = onAuthStateChanged(auth, (user) => {
        if (!user) {
          off(); // unsubscribe
          resolve();
        }
      });
      // Safety: if onAuthStateChanged doesn't fire in 2s, resolve anyway
      setTimeout(() => { try { off(); } catch(e){}; resolve(); }, 2000);
    });

    // Update UI
    setStatusText("You've been signed out", "For your security, your session has ended. You can return to the homepage or sign in again.");
    // optionally dim/disable action buttons so user doesn't accidentally re-use old session links
    disableActionButtons();

    // Optionally redirect
    if (redirectTo) {
      setTimeout(() => { location.href = redirectTo; }, redirectDelay);
    }
  } catch (err) {
    console.error('[logout.js] signOut error:', err);
    showInlineError('There was a problem signing you out. Please try again.');
    throw err;
  }
}

/* --------------------------
   Auto-run on DOMContentLoaded (default behavior)
   - Will auto sign out unless body has data-auto="false"
   - Redirect preference order:
       1) body[data-redirect]
       2) URL ?next=...
   -------------------------- */
function getRedirectFromDOMOrQuery() {
  const body = document.body;
  const dataRedirect = body?.getAttribute('data-redirect');
  if (dataRedirect) return dataRedirect;

  const params = new URLSearchParams(location.search);
  const next = params.get('next') || params.get('redirect');
  return next;
}

function init() {
  // safety: only run in a browser
  if (typeof window === 'undefined') return;

  // Preserve any existing inline timestamp behavior (update immediately)
  setTimestampNode(new Date());

  // Add keyboard support for anchors (space key)
  qsa('.actions .btn').forEach(el => {
    el.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); el.click(); }
    });
  });

  // Wire up a retry button if exists (you can put an element with id="retrySignOut")
  const retryBtn = qs('#retrySignOut');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      // hide previous error
      const prev = qs('#logoutError'); if (prev) prev.textContent = '';
      forceSignOut({ redirectTo: getRedirectFromDOMOrQuery() }).catch(() => {
        // errors already handled in forceSignOut
      });
    });
  }

  const auto = document.body?.getAttribute('data-auto');
  const shouldAuto = (auto === null || auto === undefined) ? true : (auto !== 'false');

  if (shouldAuto) {
    const redirectTo = getRedirectFromDOMOrQuery() || null;
    // call and ignore rejection here (UI shows error)
    forceSignOut({ redirectTo }).catch(() => {});
  }

  // keep a watchful eye and ensure we remain signed out
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // If a user is still present despite our signOut attempt, try again quietly
      console.warn('[logout.js] auth state changed: user still present; retrying sign-out.');
      forceSignOut({ redirectTo: getRedirectFromDOMOrQuery() }).catch(() => {});
    }
  });
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
