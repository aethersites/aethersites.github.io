// header-loader.js (simpler + debug logging)
// Include on each page: <div id="global-header"></div> + <script type="module" src="/header/header-loader.js"></script>

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const HEADER_BASE = "/header";
const VISITOR_HEADER = "header-1";
const LOGGED_IN_HEADER = "header-2";
const VISITOR_CACHE_KEY = "header-1-html-v1";
const FETCH_TIMEOUT_MS = 7000;

const firebaseConfig = {
  apiKey: "AIzaSyCOHC_OvQ4onPkhLvHzZEPazmY6PRcxjnw",
    authDomain: "goodplates-7ae36.firebaseapp.com",
    projectId: "goodplates-7ae36",
    storageBucket: "goodplates-7ae36.firebasestorage.app",
    messagingSenderId: "541149626283",
    appId: "1:541149626283:web:928888f0b42cda49b7dcee",
    measurementId: "G-HKMSHM726J"
  };


const app = (getApps().length > 0) ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);

const container = document.getElementById("global-header");
if (!container) {
  console.warn("header-loader: no #global-header on page — exiting.");
} else {
  function showSkeleton() {
    container.setAttribute("aria-busy", "true");
    container.innerHTML = `<div style="padding:.75rem 1rem;min-height:56px;display:flex;align-items:center;justify-content:space-between">
      <div style="width:140px;height:20px;background:#eee;border-radius:6px"></div>
      <div style="width:40%;height:18px;background:#eee;border-radius:6px"></div>
      <div style="width:84px;height:32px;background:#eee;border-radius:16px"></div>
    </div>`;
  }

  function renderFallbackNav() {
    container.setAttribute("aria-busy", "false");
    container.innerHTML = `<nav style="padding:.75rem 1rem"><a href="/" style="margin-right:1rem">Home</a><a href="/login">Log in</a></nav>`;
  }

  async function fetchWithTimeout(url, timeoutMs = FETCH_TIMEOUT_MS) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal, credentials: "same-origin" });
      clearTimeout(id);
      return res;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  async function fetchHeaderHtml(headerName, { cacheVisitor = false } = {}) {
    if (cacheVisitor && headerName === VISITOR_HEADER) {
      try {
        const cached = sessionStorage.getItem(VISITOR_CACHE_KEY);
        if (cached) {
          console.log("header-loader: using cached visitor header");
          return cached;
        }
      } catch (e) {}
    }
    const url = `${HEADER_BASE}/${headerName}/index.html`;
    console.log("header-loader: fetching", url);
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`Fetch failed: ${url} status ${res.status}`);
    const html = await res.text();
    if (cacheVisitor && headerName === VISITOR_HEADER) {
      try { sessionStorage.setItem(VISITOR_CACHE_KEY, html); } catch (e) {}
    }
    console.log(`header-loader: fetched (${headerName}) length=${html.length}`);
    console.log("header-loader: fetched HTML preview:", html.slice(0, 1000)); // first 1k chars
    return html;
  }

  async function executeScriptsFromHtmlFragment(fragment) {
    // fragment is a DocumentFragment or element container we inserted
    // We'll find <script> tags within container and run them in order.
    const scripts = Array.from(container.querySelectorAll("script"));
    for (const orig of scripts) {
      // remove original so we don't keep duplicate nodes
      orig.remove();
      if (orig.src) {
        // external
        await new Promise(resolve => {
          const s = document.createElement("script");
          if (orig.type) s.type = orig.type;
          if (orig.noModule) s.noModule = true;
          if (orig.crossOrigin) s.crossOrigin = orig.crossOrigin;
          if (orig.integrity) s.integrity = orig.integrity;
          s.async = false;
          s.src = orig.src;
          s.onload = () => { resolve(); s.remove(); };
          s.onerror = () => { console.warn("header-loader: external script failed", orig.src); resolve(); s.remove(); };
          document.head.appendChild(s);
        });
      } else {
        // inline -> run synchronously
        const s = document.createElement("script");
        if (orig.type) s.type = orig.type;
        s.textContent = orig.textContent;
        document.head.appendChild(s);
        s.remove();
      }
    }
  }

  function attachDelegatedHandlers() {
    container.removeEventListener("click", delegatedClickHandler);
    container.addEventListener("click", delegatedClickHandler);
  }
  function delegatedClickHandler(e) {
    const el = e.target.closest('[data-action="signout"]');
    if (!el) return;
    e.preventDefault();
    if (!auth) { alert("Auth unavailable"); return; }
    if (!confirm("Sign out?")) return;
    signOut(auth).catch(err => {
      console.error("header-loader: signOut error", err);
      alert("Sign out failed.");
    });
  }

  function getDebugOverride() {
    try {
      const p = new URLSearchParams(location.search);
      const v = p.get("debugHeader");
      if (v === VISITOR_HEADER || v === LOGGED_IN_HEADER) return v;
    } catch (e) {}
    return null;
  }

  showSkeleton();

  onAuthStateChanged(auth, async (user) => {
    const debug = getDebugOverride();
    const headerName = debug ? debug : (user ? LOGGED_IN_HEADER : VISITOR_HEADER);
    console.log("header-loader: loading header ->", headerName, " user? ", !!user);
    try {
      const html = await fetchHeaderHtml(headerName, { cacheVisitor: !user });
      // Quick-and-dirty: insert raw HTML. (This assumes your header fragments are valid HTML fragments.)
      container.innerHTML = html;
      // Run any scripts that were included inside the header fragment.
      await executeScriptsFromHtmlFragment(container);
      container.setAttribute("aria-busy", "false");
      attachDelegatedHandlers();
      console.log("header-loader: injected header:", headerName);
    } catch (err) {
      console.error("header-loader: failed to load header:", err);
      // Try to fallback to visitor header if not already
      if (headerName !== VISITOR_HEADER) {
        try {
          const fallback = await fetchHeaderHtml(VISITOR_HEADER, { cacheVisitor: false });
          container.innerHTML = fallback;
          await executeScriptsFromHtmlFragment(container);
          container.setAttribute("aria-busy", "false");
          attachDelegatedHandlers();
          console.log("header-loader: fallback visitor header injected.");
          return;
        } catch (e) {
          console.error("header-loader: fallback failed", e);
        }
      }
      renderFallbackNav();
    }
  });

  // noscript fallback
  (function addNoScript() {
    const nos = document.createElement("noscript");
    nos.innerHTML = `<nav aria-hidden="false"><a href="/">Home</a> · <a href="/login">Login</a></nav>`;
    container.appendChild(nos);
  })();
}
