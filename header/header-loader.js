// file: /header/header-loader.js
// import this on each page with: <script type="module" src="/header/header-loader.js"></script>

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const HEADER_BASE = "/header";
const VISITOR_HEADER = "header-1";
const LOGGED_IN_HEADER = "header-2";
const FETCH_TIMEOUT_MS = 7000;
const VISITOR_CACHE_KEY = "header-1-html-v1";

const firebaseConfig = {
  apiKey: "AIzaSyCOHC_OvQ4onPkhLvHzZEPazmY6PRcxjnw",
    authDomain: "goodplates-7ae36.firebaseapp.com",
    projectId: "goodplates-7ae36",
    storageBucket: "goodplates-7ae36.firebasestorage.app",
    messagingSenderId: "541149626283",
    appId: "1:541149626283:web:928888f0b42cda49b7dcee",
    measurementId: "G-HKMSHM726J"
  };


let app, auth;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
} catch (e) {
  console.warn("Firebase already initialized or failed:", e);
  // if already initialized, getAuth() throws; try to read it anyway
  try { auth = getAuth(); } catch (_) { auth = null; }
}

const container = document.getElementById("global-header");
if (!container) throw new Error("Missing #global-header on page");

/* tiny skeleton to avoid layout jump */
function showSkeleton() {
  container.setAttribute("aria-busy", "true");
  container.innerHTML = `
    <div class="header-skeleton" style="display:flex;align-items:center;justify-content:space-between;padding:.75rem 1rem;min-height:56px;">
      <div style="width:140px;height:20px;background:#eee;border-radius:6px"></div>
      <div style="width:40%;height:18px;background:#eee;border-radius:6px"></div>
      <div style="width:84px;height:32px;background:#eee;border-radius:16px"></div>
    </div>
  `;
}

/* fetch with timeout + optional visitor caching */
async function fetchHeader(headerName, { cacheVisitor = false } = {}) {
  if (cacheVisitor && headerName === VISITOR_HEADER) {
    try {
      const cached = sessionStorage.getItem(VISITOR_CACHE_KEY);
      if (cached) return cached;
    } catch (e) {}
  }

  const url = `${HEADER_BASE}/${headerName}/index.html`;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal, credentials: "same-origin" });
    clearTimeout(id);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    const html = await res.text();
    if (cacheVisitor && headerName === VISITOR_HEADER) {
      try { sessionStorage.setItem(VISITOR_CACHE_KEY, html); } catch (e) {}
    }
    return html;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

/* inject html and also execute any inline <script> tags inside it */
function injectHtmlAndRunScripts(html) {
  // Create a template element so we can extract scripts safely
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  // Move non-script nodes
  const nodes = Array.from(tpl.content.childNodes);
  container.innerHTML = ""; // clear
  nodes.forEach(n => {
    if (n.nodeName.toLowerCase() === "script") return; // we'll handle scripts later
    container.appendChild(n.cloneNode(true));
  });
  // Now handle scripts from the template (both inline and with src)
  const scripts = tpl.content.querySelectorAll("script");
  scripts.forEach(orig => {
    const s = document.createElement("script");
    if (orig.src) {
      s.src = orig.src;
      s.async = false; // preserve order
    } else {
      s.textContent = orig.textContent;
    }
    // copy type / nomodule attributes if present
    if (orig.type) s.type = orig.type;
    if (orig.noModule) s.noModule = true;
    document.head.appendChild(s);
    // remove appended script after execution to keep DOM clean (optional)
    s.addEventListener("load", () => s.remove());
    if (!s.src) s.remove(); // inline scripts already executed; we can remove copy
  });
}

/* delegated auth handlers (e.g. data-action="signout") */
function attachDelegatedAuthHandlers() {
  container.removeEventListener("click", delegatedClickHandler);
  container.addEventListener("click", delegatedClickHandler);
}
function delegatedClickHandler(e) {
  const el = e.target.closest('[data-action="signout"]');
  if (!el) return;
  e.preventDefault();
  if (!auth) { alert("Auth unavailable"); return; }
  if (confirm("Sign out?")) {
    signOut(auth).catch(err => {
      console.error("Sign-out failed:", err);
      alert("Sign-out failed. See console for details.");
    });
  }
}

/* main flow */
showSkeleton();

if (!auth) {
  // If firebase/auth not available for any reason, show visitor header as best-effort
  fetchHeader(VISITOR_HEADER, { cacheVisitor: false })
    .then(html => { injectHtmlAndRunScripts(html); attachDelegatedAuthHandlers(); container.setAttribute("aria-busy", "false"); })
    .catch(() => {
      container.innerHTML = '<nav style="padding:.75rem 1rem"><a href="/">Home</a> · <a href="/login">Login</a></nav>';
      container.setAttribute("aria-busy", "false");
    });
} else {
  onAuthStateChanged(auth, async (user) => {
    try {
      const headerName = user ? LOGGED_IN_HEADER : VISITOR_HEADER;
      const html = await fetchHeader(headerName, { cacheVisitor: !user });
      injectHtmlAndRunScripts(html);
      attachDelegatedAuthHandlers();
      container.setAttribute("aria-busy", "false");
    } catch (err) {
      console.error("Header load failed:", err);
      // fallback to visitor header or minimal nav
      try {
        const fallback = await fetchHeader(VISITOR_HEADER, { cacheVisitor: false });
        injectHtmlAndRunScripts(fallback);
      } catch {
        container.innerHTML = '<nav style="padding:.75rem 1rem"><a href="/">Home</a> · <a href="/login">Login</a></nav>';
      } finally {
        container.setAttribute("aria-busy", "false");
        attachDelegatedAuthHandlers();
      }
    }
  });
}
