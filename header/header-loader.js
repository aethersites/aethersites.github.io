// header-loader.js (adjusted to use header-1.html / header-2.html)
// Include on each page: 
// <div id="global-header" aria-live="polite" aria-busy="true"></div>
// <script type="module" src="/header/header-loader.js"></script>

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const HEADER_BASE = "/header";
const VISITOR_HEADER = "header-1";   // will load /header/header-1.html
const LOGGED_IN_HEADER = "header-2"; // will load /header/header-2.html
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

  // ---------- Fixed: load headerName.html directly ----------
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
    // NOTE: changed to .html filenames (not index.html)
    const url = `${HEADER_BASE}/${headerName}.html`;
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

// TEMPORARY passcode system
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Under Construction — We'll be back soon</title>
  <meta name="description" content="We're building something great. Leave your email and we'll let you know when we're back." />

  <!-- System font stack (Apple-like feel) -->
  <style>
    :root{
      --bg: #f7f7f8; /* very light grey */
      --card: rgba(255,255,255,0.95);
      --muted: #6b7280;
      --accent-green: #16a34a; /* accessible apple-ish green */
      --accent-green-600: #13803d;
      --glass: rgba(255,255,255,0.6);
      --shadow: 0 10px 30px rgba(16,24,40,0.08), inset 0 1px 0 rgba(255,255,255,0.6);
      --radius: 18px;
      --maxw: 980px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, system-ui;
      color-scheme: light;
    }

    html,body{height:100%;}
    body{
      margin:0;
      background: linear-gradient(180deg, var(--bg) 0%, #ffffff 100%);
      -webkit-font-smoothing:antialiased;
      -moz-osx-font-smoothing:grayscale;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:48px 24px;
    }

    .frame{
      width:100%;
      max-width:var(--maxw);
      display:grid;
      grid-template-columns: 1fr 420px;
      gap:40px;
      align-items:center;
    }

    /* On small screens stack vertically */
    @media (max-width:880px){
      .frame{grid-template-columns:1fr; gap:24px;}
    }

    .panel{
      background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.95));
      border-radius: var(--radius);
      padding: 44px;
      box-shadow: var(--shadow);
      backdrop-filter: blur(6px) saturate(120%);
      border: 1px solid rgba(16,24,40,0.03);
    }

    .hero-title{
      font-size: clamp(28px, 3.8vw, 40px);
      line-height:1.03;
      margin:0 0 12px 0;
      font-weight:600;
      color: #0f172a;
    }
    .hero-sub{
      margin:0 0 22px 0;
      color: var(--muted);
      font-size:16px;
    }

    .kicker{
      display:inline-block;
      font-size:12px;
      text-transform:uppercase;
      letter-spacing:1px;
      padding:6px 10px;
      border-radius:999px;
      background: rgba(16,24,40,0.03);
      color:#374151;
      margin-bottom:14px;
      font-weight:600;
    }

    .cta-row{display:flex; gap:14px; align-items:center; flex-wrap:wrap;}

    .btn{
      appearance:none;
      border:0;
      padding:12px 18px;
      border-radius:12px;
      font-weight:600;
      font-size:15px;
      cursor:pointer;
      transition: transform .14s ease, box-shadow .14s ease;
      box-shadow: 0 6px 18px rgba(16,24,40,0.06);
    }

    .btn-primary{
      background: linear-gradient(180deg, var(--accent-green), var(--accent-green-600));
      color:white;
      box-shadow: 0 8px 30px rgba(16,24,40,0.12);
    }
    .btn-primary:active{transform: translateY(1px) scale(.998);}    

    .btn-ghost{
      background: transparent;
      color: var(--accent-green-600);
      border: 1px solid rgba(20,90,50,0.12);
      padding:11px 16px;
    }

    .meta{font-size:13px; color:var(--muted); margin-top:18px}

    /* right panel artwork */
    .device-wrap{
      display:flex; align-items:center; justify-content:center; 
      height:100%;
      min-height:260px;
    }
    .device{
      width:360px; max-width:86%; border-radius:22px; padding:22px; background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(250,250,250,0.92));
      box-shadow: 0 20px 50px rgba(16,24,40,0.12);
      border:1px solid rgba(16,24,40,0.04);
      position:relative;
      overflow:hidden;
    }

    .screen{
      height:260px; border-radius:12px; background: linear-gradient(180deg,#ffffff,#f8fafc);
      display:flex; align-items:center; justify-content:center; flex-direction:column; gap:12px; padding:22px; box-sizing:border-box;
      border: 1px solid rgba(16,24,40,0.03);
    }

    .screen .title{font-weight:700; color:#0f172a}
    .screen .sub{font-size:13px; color:var(--muted)}

    /* floating circles in the background */
    .bg-ornament{
      position: absolute; inset:0; pointer-events:none; z-index:-1; overflow:hidden; border-radius:calc(var(--radius) + 6px);
    }
    .circle{
      position:absolute; filter: blur(28px); opacity:0.18; transform:translate3d(0,0,0);
    }
    .c1{width:260px;height:260px;background:linear-gradient(180deg,#a7f3d0,#10b981); top:-40px; left:-60px}
    .c2{width:160px;height:160px;background:linear-gradient(180deg,#bbf7d0,#34d399); right:-40px; bottom:-30px}

    /* footer small */
    .footer{margin-top:20px;font-size:13px;color:var(--muted)}

    /* subtle entrance animation */
    .panel{transform:translateY(6px); opacity:0; animation:pop .6s ease-out forwards;}
    @keyframes pop{to{transform:none;opacity:1}}

    /* toast */
    .toast{position:fixed; right:24px; bottom:24px; background:#0f172a; color:white; padding:12px 16px; border-radius:10px; box-shadow:0 10px 30px rgba(2,6,23,0.24); display:none}
    .toast.show{display:block; animation:toastIn .36s ease-out}
    @keyframes toastIn{from{transform:translateY(10px);opacity:0}to{transform:none;opacity:1}}
  </style>
</head>
<body>
  <main class="frame" role="main">
    <section class="panel" aria-labelledby="page-title">
      <div>
        <div class="kicker">Coming soon</div>
        <h1 id="page-title" class="hero-title">We’re building something beautiful.</h1>
        <p class="hero-sub">Thanks for your patience — we’re polishing the details. Sign up and we’ll notify you when we launch, or learn more about the updates below.</p>

        <div class="cta-row" role="group" aria-label="Primary actions">
          <button class="btn btn-primary" id="notifyBtn">Notify me</button>
          <a class="btn btn-ghost" href="/status" id="learnBtn">Status &amp; ETA</a>
        </div>

        <div class="meta">Want early access or partnership info? <a href="mailto:hello@example.com">hello@example.com</a></div>

        <div class="footer">This page is temporary — we appreciate your patience.</div>
      </div>
    </section>

    <aside class="panel device-wrap" aria-hidden="false">
      <div class="device" role="img" aria-label="Decorative device mockup showing under construction">
        <div class="bg-ornament">
          <div class="circle c1"></div>
          <div class="circle c2"></div>
        </div>
        <div class="screen">
          <svg width="84" height="84" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C9.243 2 7 4.243 7 7c0 4.418 5 9 5 9s5-4.582 5-9c0-2.757-2.243-5-5-5z" fill="#10B981" opacity="0.18"></path>
            <path d="M11.25 8.75h1.5v6h-1.5z" fill="#065F46"></path>
            <path d="M8.75 12.75h6.5v1.5h-6.5z" fill="#065F46"></path>
          </svg>
          <div class="title">Under construction</div>
          <div class="sub">We're fine-tuning the experience. Check back soon.</div>
        </div>
      </div>
    </aside>
  </main>

  <div id="toast" class="toast" role="status" aria-live="polite">Thanks — we’ll notify you when we launch.</div>

  <script>
    (function(){
      const notify = document.getElementById('notifyBtn');
      const toast = document.getElementById('toast');

      notify.addEventListener('click', function(){
        // simple accessible feedback
        toast.classList.add('show');
        setTimeout(()=>toast.classList.remove('show'), 3200);

        // micro-animation
        notify.animate([
          { transform: 'scale(1)' },
          { transform: 'scale(0.98)' },
          { transform: 'scale(1)' }
        ], { duration: 180, easing: 'ease-out' });

        // in a real site: open signup modal or post email to backend
      });

      // keyboard: focus styles
      document.addEventListener('keydown', function(e){
        if(e.key === 'Tab') document.documentElement.classList.add('show-focus');
      });
    })();
  </script>
</body>
</html>
