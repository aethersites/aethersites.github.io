// /logout.js
// Minimal, robust logout helper for Firebase JS SDK v12.x
// - Re-uses existing Firebase app if present
// - If window.__FIREBASE_CONFIG__ is present and no app exists, it will initialize one
// - Auto signs out on load (set <body data-auto="false"> to opt out)
// - Exports forceSignOut() for manual calls

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const qs  = (s, ctx = document) => ctx.querySelector(s);
const qsa = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

function log(...a){ console.debug('[logout.js]', ...a); }
function err(...a){ console.error('[logout.js]', ...a); }

function setTimestampNode(date = new Date()){
  const timeEl = qs('.hint time');
  if (!timeEl) return;
  timeEl.textContent = date.toLocaleString();
  timeEl.dateTime = date.toISOString();
}

function showInlineError(msg){
  let el = qs('#logoutError');
  if (!el){
    el = document.createElement('div');
    el.id = 'logoutError';
    el.setAttribute('role','alert');
    el.style.marginTop = '12px';
    el.style.fontSize = '13px';
    el.style.color = 'var(--muted)';
    const container = qs('.card') || document.body;
    container.appendChild(el);
  }
  el.textContent = msg;
}

function disableActionButtons(){
  qsa('.actions .btn').forEach(btn=>{
    btn.setAttribute('aria-disabled','true');
    btn.classList.add('disabled');
    btn.addEventListener('click', (e) => {
      if (btn.getAttribute('aria-disabled') === 'true') e.preventDefault();
    }, { capture: true });
  });
}

function getRedirectFromDOMOrQuery(){
  const body = document.body;
  const dataRedirect = body?.getAttribute('data-redirect');
  if (dataRedirect) return dataRedirect;
  const params = new URLSearchParams(location.search);
  return params.get('next') || params.get('redirect') || null;
}

/* Ensure Firebase app exists or initialize from window.__FIREBASE_CONFIG__ */
function ensureAppInitialized(){
  const cfg = window.__FIREBASE_CONFIG__ || null;
  if (!getApps().length){
    if (cfg){
      try {
        initializeApp(cfg);
        log('Firebase initialized by /logout.js using window.__FIREBASE_CONFIG__.');
      } catch (e){
        err('initializeApp failed:', e);
        throw e;
      }
    } else {
      log('No Firebase app detected and no config provided. Assuming app initialized elsewhere.');
    }
  } else {
    log('Re-using existing Firebase app.');
  }
}

function ensureAuth(){
  try {
    return getAuth();
  } catch (e){
    err('getAuth() failed (no app present):', e);
    throw e;
  }
}

/**
 * Signs out the current user. Resolves once signOut completes (or rejects on error).
 * @param {{ redirectTo?: string|null, redirectDelay?: number }} opts
 * @returns {Promise<void>}
 */
export async function forceSignOut({ redirectTo = null, redirectDelay = 600 } = {}){
  try { ensureAppInitialized(); } catch (e) {
    showInlineError('Could not initialize Firebase. See console.');
    return Promise.reject(e);
  }

  let auth;
  try { auth = ensureAuth(); } catch (e) {
    showInlineError('Firebase Auth not available. Initialize Firebase before loading /logout.js or set window.__FIREBASE_CONFIG__.');
    return Promise.reject(e);
  }

  setTimestampNode(new Date());
  log('Calling signOut()...');
  try {
    await signOut(auth);

    // Small safety: wait for onAuthStateChanged -> user === null (or timeout)
    await new Promise((resolve) => {
      try {
        const off = onAuthStateChanged(auth, (user) => {
          if (!user){ off(); resolve(); }
        });
        setTimeout(() => { try { off(); } catch(e){}; resolve(); }, 2000);
      } catch (e) { resolve(); }
    });

    log('signOut completed.');
    const title = qs('#signedOutTitle'); if (title) title.textContent = "You've been signed out";
    disableActionButtons();

    if (redirectTo) {
      setTimeout(() => { location.href = redirectTo; }, Math.max(0, redirectDelay));
    }
    return;
  } catch (e) {
    err('signOut error:', e);
    showInlineError('There was a problem signing you out. Please try again.');
    return Promise.reject(e);
  }
}

/* Auto-run wiring */
function wireUI(){
  qsa('.actions .btn').forEach(el=>{
    el.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); el.click(); }
    });
  });

  const signoutBtn = qs('#signoutBtn');
  if (signoutBtn){
    signoutBtn.addEventListener('click', () => {
      forceSignOut({ redirectTo: getRedirectFromDOMOrQuery() }).catch(()=>{});
    });
  }

  const retryBtn = qs('#retrySignOut');
  if (retryBtn){
    retryBtn.addEventListener('click', () => {
      const prev = qs('#logoutError'); if (prev) prev.textContent = '';
      forceSignOut({ redirectTo: getRedirectFromDOMOrQuery() }).catch(()=>{});
    });
  }
}

async function initAuto(){
  try { ensureAppInitialized(); } catch(e){ /* handled in forceSignOut */ }

  setTimestampNode(new Date());
  wireUI();

  const auto = document.body?.getAttribute('data-auto');
  const shouldAuto = (auto === null || auto === undefined) ? true : (auto !== 'false');
  if (shouldAuto) {
    const redirectTo = getRedirectFromDOMOrQuery();
    forceSignOut({ redirectTo }).catch(()=>{ /* errors shown by forceSignOut */ });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuto, { once: true });
} else {
  initAuto();
}

export default { forceSignOut };
