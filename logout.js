// /logout.js
// Refined logout helper tuned for your logout/index.html
// - Auto signs out on load (body data-auto="false" to opt out)
// - Uses existing Firebase app if present, or falls back to window.__FIREBASE_CONFIG__
// - Updates page text, timestamp and handles errors cleanly

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const $ = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

function debug(...args){ console.debug('[logout.js]', ...args); }
function warn(...args){ console.warn('[logout.js]', ...args); }
function error(...args){ console.error('[logout.js]', ...args); }

function setTimestampNode(date = new Date()){
  const timeEl = $('.hint time');
  if (!timeEl) return;
  timeEl.textContent = date.toLocaleString();
  timeEl.dateTime = date.toISOString();
}

/* Inline error below the card */
function showInlineError(msg){
  let el = $('#logoutError');
  if (!el){
    el = document.createElement('div');
    el.id = 'logoutError';
    el.setAttribute('role','alert');
    el.style.marginTop = '12px';
    el.style.fontSize = '13px';
    el.style.color = 'var(--muted)';
    const container = $('.card') || document.body;
    container.appendChild(el);
  }
  el.textContent = msg;
}

/* Disable action buttons (Return to Homepage / Sign in) */
/* Disable action buttons BUT keep anchors with href clickable */
function disableActionButtons(){
  $$('.actions .btn').forEach(btn => {
    const tag = btn.tagName && btn.tagName.toLowerCase();
    const isAnchorWithHref = (tag === 'a' && btn.getAttribute('href'));

    // Keep normal links clickable so users can navigate after sign-out
    if (isAnchorWithHref) {
      btn.removeAttribute('aria-disabled');
      btn.classList.remove('disabled');
      btn.style.pointerEvents = '';
      btn.style.opacity = '';
      return;
    }

    // For native <button> or non-anchor controls, disable interaction
    btn.setAttribute('aria-disabled','true');
    btn.classList.add('disabled');
    btn.style.pointerEvents = 'auto';
    btn.style.opacity = '0.6';
  });
}

/* Redirect logic: prefer data-redirect on body, then next/redirect query params */
function getRedirectFromDOMOrQuery(){
  const body = document.body;
  const dataRedirect = body && body.getAttribute('data-redirect');
  if (dataRedirect) return dataRedirect;
  const params = new URLSearchParams(location.search);
  return params.get('next') || params.get('redirect') || null;
}

/* Ensure a Firebase app exists. If not, attempt to initialize from window.__FIREBASE_CONFIG__ */
function ensureAppInitialized(){
  if (getApps().length) {
    debug('Using existing Firebase app.');
    return;
  }
  const cfg = window.__FIREBASE_CONFIG__ || null;
  if (!cfg) {
    warn('No Firebase app found and no window.__FIREBASE_CONFIG__ present. getAuth() may fail unless Firebase is initialized elsewhere.');
    return;
  }
  try {
    initializeApp(cfg);
    debug('Firebase initialized from window.__FIREBASE_CONFIG__.');
  } catch (e) {
    error('Failed to initialize Firebase from window.__FIREBASE_CONFIG__', e);
    throw e;
  }
}

/**
 * Force sign out current user.
 * Options:
 *  - redirectTo: string|null -> location to navigate to after sign-out (default: null -> no redirect)
 *  - redirectDelay: ms to wait before redirect (default: 600)
 */
export async function forceSignOut({ redirectTo = null, redirectDelay = 600 } = {}){
  try {
    ensureAppInitialized();
  } catch (e) {
    showInlineError('Could not initialize Firebase. See console for details.');
    return Promise.reject(e);
  }

  let auth;
  try {
    auth = getAuth();
  } catch (e) {
    showInlineError('Firebase Auth not available. Ensure Firebase is initialized before loading this script.');
    error('getAuth() failed:', e);
    return Promise.reject(e);
  }

  setTimestampNode(new Date());

  // Update UI to signal we are signing out
  const title = $('#signedOutTitle');
  if (title){
    title.textContent = "Signing you out…";
    title.setAttribute('aria-live','polite');
  }
  debug('Calling signOut()');

  try {
    await signOut(auth);

    // Wait briefly until onAuthStateChanged reports no user (with a small timeout)
    await new Promise((resolve) => {
      let resolved = false;
      try {
        const off = onAuthStateChanged(auth, (user) => {
          if (!user && !resolved) { resolved = true; off(); resolve(); }
        });
        // fallback timeout in 2s
        setTimeout(() => {
          if (!resolved) { resolved = true; try { off(); } catch(e){}; resolve(); }
        }, 2000);
      } catch (e) {
        // if onAuthStateChanged fails for some reason, just resolve
        resolve();
      }
    });

    debug('Sign-out completed successfully.');
    if (title) title.textContent = "You've been signed out";
    disableActionButtons();

    // If redirect requested, navigate after a short delay
    if (redirectTo) {
      setTimeout(() => { location.href = redirectTo; }, Math.max(0, redirectDelay));
    }

    return;
  } catch (e) {
    error('signOut error:', e);
    showInlineError('There was a problem signing you out. Please try again.');
    if (title) title.textContent = "Sign out failed";
    return Promise.reject(e);
  }
}

/* Wire UI interactions */
function wireUI(){
  // keep keyboard enter/space behaviour for action links
  $$('.actions .btn').forEach(el => {
    el.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
        ev.preventDefault();
        el.click();
      }
    });
  });

  // If you later add explicit signout/retry buttons, keep hooks for them
  const signoutBtn = $('#signoutBtn');
  if (signoutBtn) signoutBtn.addEventListener('click', () => forceSignOut({ redirectTo: getRedirectFromDOMOrQuery() }).catch(()=>{}));

  const retryBtn = $('#retrySignOut');
  if (retryBtn) retryBtn.addEventListener('click', () => {
    const prev = $('#logoutError'); if (prev) prev.textContent = '';
    forceSignOut({ redirectTo: getRedirectFromDOMOrQuery() }).catch(()=>{});
  });
}

/* Initialization */
async function init(){
  try { ensureAppInitialized(); } catch(e){ /* handled in forceSignOut */ }

  setTimestampNode(new Date());
  wireUI();

  const body = document.body;
  const autoAttr = body && body.getAttribute('data-auto');
  // default: auto sign out unless data-auto="false"
  const shouldAuto = (autoAttr === null || autoAttr === undefined) ? true : (autoAttr !== 'false');

  if (shouldAuto) {
    const redirectTo = getRedirectFromDOMOrQuery();
    // Do not force redirect by default; redirect only if next/redirect param or body data-redirect provided.
    await forceSignOut({ redirectTo }).catch(()=>{ /* UI already shows errors */ });
  }
}

/* Run when DOM is ready */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

export default { forceSignOut };
