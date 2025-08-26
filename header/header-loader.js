// header-loader.js (robust + debug-friendly)
// Usage: include on every page where you want the header:
// <div id="global-header" aria-live="polite" aria-busy="true"></div>
// <script type="module" src="/header/header-loader.js"></script>

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const HEADER_BASE = "/header";               // base directory
const VISITOR_HEADER = "header-1";           // -> /header/header-1/index.html
const LOGGED_IN_HEADER = "header-2";         // -> /header/header-2/index.html
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

// init firebase only once
const app = (getApps().length > 0) ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);

const container = document.getElementById("global-header");
if (!container) {
  console.warn("header-loader: No #global-header found — loader exiting.");
} else {

  /* --------------- helpers & UI --------------- */
  function showSkeleton() {
    container.setAttribute("aria-busy", "true");
    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:.75rem 1rem;min-height:56px;">
        <div style="width:140px;height:20px;background:rgba(0,0,0,0.06);border-radius:6px"></div>
        <div style="width:40%;height:18px;background:rgba(0,0,0,0.06);border-radius:6px"></div>
        <div style="width:84px;height:32px;background:rgba(0,0,0,0.06);border-radius:16px"></div>
      </div>
    `;
  }

  function renderFallbackNav() {
    container.setAttribute("aria-busy", "false");
    container.innerHTML = `<nav style="padding:.75rem 1rem"><a href="/" style="margin-right:1rem">Home</a><a href="/login">Log in</a></nav>`;
  }

  async function fetchWithTimeout(url, timeoutMs = FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal, credentials: "same-origin" });
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
          console.log(`header-loader: using cached ${VISITOR_CACHE_KEY}`);
          return cached;
        }
      } catch (e) { /* ignore */ }
    }

    const url = `${HEADER_BASE}/${headerName}/index.html`;
    console.log(`header-loader: fetching ${url}`);
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url} — status ${res.status}`);
    const html = await res.text();
    if (cacheVisitor && headerName === VISITOR_HEADER) {
      try { sessionStorage.setItem(VISITOR_CACHE_KEY, html); } catch (e) { /* ignore */ }
    }
    console.log(`header-loader: fetched ${url} (${html.length} bytes)`);
    return html;
  }

  /* Parse full HTML (document) OR fragment, and return Document for easy querying */
  function parseToDocument(html) {
    // DOMParser handles fragments too (returns a Document)
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    return doc;
  }

  /* Move style/link tags into the page <head>, but avoid duplicates */
  function importHeadAssets(doc) {
    const head = document.head;

    // helper dedupe checks
    const existingHrefs = new Set(Array.from(head.querySelectorAll("link[href]")).map(l => l.getAttribute("href")));
    const existingStyleHashes = new Set(Array.from(head.querySelectorAll("style")).map(s => s.textContent.trim()).filter(Boolean));

    // copy <link rel="stylesheet"> and other link tags
    Array.from(doc.head.querySelectorAll("link")).forEach(link => {
      const href = link.getAttribute("href");
      if (href && existingHrefs.has(href)) {
        // skip duplicates
        return;
      }
      // clone and append
      const clone = document.createElement("link");
      for (const attr of ["rel","href","media","integrity","crossorigin","type"]) {
        if (link.hasAttribute(attr)) clone.setAttribute(attr, link.getAttribute(attr));
      }
      head.appendChild(clone);
      if (href) existingHrefs.add(href);
      console.log("header-loader: appended <link> to head:", href);
    });

    // copy inline <style> tags (dedup by exact text)
    Array.from(doc.head.querySelectorAll("style")).forEach(style => {
      const txt = style.textContent.trim();
      if (!txt || existingStyleHashes.has(txt)) return;
      const clone = document.createElement("style");
      clone.textContent = txt;
      head.appendChild(clone);
      existingStyleHashes.add(txt);
      console.log("header-loader: appended inline <style> to head");
    });

    // copy relevant meta tags (optional — avoid title)
    Array.from(doc.head.querySelectorAll("meta")).forEach(meta => {
      // only add if not a charset/title/meta viewport that would conflict
      const name = meta.getAttribute("name");
      const prop = meta.getAttribute("property");
      if (!(name === "viewport" || meta.getAttribute("charset"))) {
        const clone = document.createElement("meta");
        Array.from(meta.attributes).forEach(a => clone.setAttribute(a.name, a.value));
        head.appendChild(clone);
      }
    });
  }

  /* Execute scripts (head + body) in document order, preserving sequence.
     Handles inline, external, and module scripts. */
  async function executeScriptsSequentially(doc) {
    // querySelectorAll returns in document order (head scripts first, then body)
    const scripts = Array.from(doc.querySelectorAll("script"));
    for (const orig of scripts) {
      // build a fresh <script> element and append to head to execute it
      const s = document.createElement("script");
      // preserve important attributes
      if (orig.type) s.type = orig.type;
      if (orig.noModule) s.noModule = true;
      if (orig.src) {
        // external script
        // copy cross-origin/integrity attributes if present
        if (orig.crossOrigin) s.crossOrigin = orig.crossOrigin;
        if (orig.integrity) s.integrity = orig.integrity;
        if (orig.referrerPolicy) s.referrerPolicy = orig.referrerPolicy;
        // ensure modules are handled properly by preserving type e.g. "module"
        s.src = orig.src;
        // wait for load or error (resolve anyway so we preserve order)
        await new Promise(resolve => {
          s.onload = () => { resolve(); s.remove(); };
          s.onerror = (e) => { console.warn("header-loader: script load error", orig.src, e); resolve(); s.remove(); };
          document.head.appendChild(s);
        });
      } else {
        // inline script: set content and append (executes synchronously)
        s.textContent = orig.textContent;
        document.head.appendChild(s);
        // inline scripts execute immediately; remove node after execution
        s.remove();
      }
    }
  }

  /* Inject body content into container (replace container content) */
  function injectBodyToContainer(doc) {
    // If the fetched html is a full document, use its body; otherwise use doc.body
    const sourceBody = doc.body || doc; // 'doc' is a Document so doc.body is ok
    // Move children into container
    container.innerHTML = "";
    Array.from(sourceBody.childNodes).forEach(node => {
      // clone nodes into page (do not import head-level scripts/styles here)
      container.appendChild(node.cloneNode(true));
    });
  }

  /* Delegated click handler for sign-out */
  function attachDelegatedAuthHandlers() {
    container.removeEventListener("click", delegatedClickHandler);
    container.addEventListener("click", delegatedClickHandler);
  }
  function delegatedClickHandler(e) {
    const el = e.target.closest('[data-action="signout"]');
    if (!el) return;
    e.preventDefault();
    if (!auth) { alert("Auth not available"); return; }
    if (!confirm("Sign out?")) return;
    signOut(auth).catch(err => {
      console.error("header-loader: signOut error", err);
      alert("Sign-out failed — see console.");
    });
  }

  /* ---------- debug override via URL (force header) ---------- */
  function getDebugOverride() {
    try {
      const params = new URLSearchParams(location.search);
      const val = params.get("debugHeader");
      if (val === VISITOR_HEADER || val === LOGGED_IN_HEADER) {
        console.warn(`header-loader: debug override active -> ${val}`);
        return val;
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  /* ---------- Main flow: decide header and load ---------- */
  showSkeleton();

  onAuthStateChanged(auth, async (user) => {
    const debug = getDebugOverride();
    const headerName = debug ? debug : (user ? LOGGED_IN_HEADER : VISITOR_HEADER);
    console.log("header-loader: auth state changed. user:", !!user, " -> loading:", headerName);

    try {
      const html = await fetchHeaderHtml(headerName, { cacheVisitor: !user });
      // parse into doc
      const doc = parseToDocument(html);

      // import <link>/<style> assets into page head (only if any head assets exist)
      if (doc.head && doc.head.children.length > 0) {
        try { importHeadAssets(doc); } catch (e) { console.warn("header-loader: importHeadAssets failed", e); }
      }

      // inject body content into container
      try { injectBodyToContainer(doc); } catch (e) {
        console.warn("header-loader: injectBodyToContainer failed, falling back to raw innerHTML", e);
        container.innerHTML = html;
      }

      // execute scripts from fetched doc (head + body) in order
      try { await executeScriptsSequentially(doc); } catch (e) { console.warn("header-loader: executeScriptsSequentially failed", e); }

      container.setAttribute("aria-busy", "false");
      attachDelegatedAuthHandlers();
      console.log(`header-loader: ${headerName} injected successfully.`);
    } catch (err) {
      console.error("header-loader: failed to load header:", err);
      // fallback attempt: load visitor header directly if different
      try {
        const fallback = await fetchHeaderHtml(VISITOR_HEADER, { cacheVisitor: false });
        const doc = parseToDocument(fallback);
        importHeadAssets(doc);
        injectBodyToContainer(doc);
        await executeScriptsSequentially(doc);
        attachDelegatedAuthHandlers();
        container.setAttribute("aria-busy", "false");
        console.log("header-loader: fallback visitor header loaded.");
      } catch (e) {
        console.error("header-loader: fallback header load also failed", e);
        renderFallbackNav();
      }
    }
  });

  // noscript fallback
  (function addNoScriptFallback() {
    const nos = document.createElement("noscript");
    nos.innerHTML = `<nav aria-hidden="false"><a href="/">Home</a> · <a href="/login">Login</a></nav>`;
    container.appendChild(nos);
  })();
}
