// budget-dashboard.js
// Usage: <script type="module" src="/budget-dashboard.js"></script>

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/* ---------- FILL YOUR FIREBASE CONFIG HERE ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyCOHC_OvQ4onPkhLvHzZEPazmY6PRcxjnw",
    authDomain: "goodplates-7ae36.firebaseapp.com",
    projectId: "goodplates-7ae36",
    storageBucket: "goodplates-7ae36.firebasestorage.app",
    messagingSenderId: "541149626283",
    appId: "1:541149626283:web:928888f0b42cda49b7dcee",
    measurementId: "G-HKMSHM726J"
  // ...other fields as provided by Firebase
};
/* ---------------------------------------------------- */

/* ---------- Initialize Firebase (idempotent) ---------- */
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}
const auth = getAuth(app);
const db = getFirestore(app);

/* ---------- Helpers ---------- */
function fmtCurrency(n) {
  if (n == null || !isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n));
}
function safeText(id, txt) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = (txt === undefined || txt === null) ? "—" : String(txt);
}
function setBarWidth(id, pct) {
  const el = document.getElementById(id);
  if (!el) return;
  if (pct == null || !isFinite(pct)) el.style.width = "0%";
  else el.style.width = Math.max(0, Math.min(100, pct)) + "%";
}
function parseAmount(v) {
  if (v == null) return 0;
  if (Number.isInteger(v) && Math.abs(v) > 1000) return v / 100;
  const n = Number(v);
  return isFinite(n) ? n : 0;
}
function toMonthKey(date) {
  const dt = (date instanceof Date) ? date : new Date(date);
  return `${dt.getFullYear()}-${dt.getMonth() + 1}`;
}
function toDate(d) {
  if (!d) return null;
  if (typeof d.toDate === "function") return d.toDate();
  const parsed = new Date(d);
  if (!isNaN(parsed.getTime())) return parsed;
  return null;
}

/* ---------- DOM rendering helpers ---------- */
function renderCategories(categoriesMap, monthlyBudget) {
  const el = document.getElementById("categoriesList");
  if (!el) return;
  el.innerHTML = "";
  const entries = Object.entries(categoriesMap || {});
  if (entries.length === 0) {
    el.innerHTML = '<div class="text-sm muted">No category data yet</div>';
    return;
  }
  entries.sort((a, b) => b[1] - a[1]);
  const monthTotal = entries.reduce((s, e) => s + (e[1] || 0), 0) || 1;
  for (const [cat, val] of entries) {
    const pct = monthlyBudget ? Math.round((val / monthlyBudget) * 100) : Math.round((val / monthTotal) * 100);
    const row = document.createElement("div");
    row.innerHTML = `
      <div class="flex justify-between text-sm">
        <span>${escapeHtml(cat)}</span>
        <span>${fmtCurrency(val)} (${pct}%)</span>
      </div>
      <div class="w-full bg-green-200 h-1 rounded mt-1">
        <div class="bg-green-700 h-1 rounded" style="width:${pct}%"></div>
      </div>
    `;
    el.appendChild(row);
  }
}

function renderRecentTransactions(transactions) {
  const el = document.getElementById("recentTransactions");
  if (!el) return;
  el.innerHTML = "";
  if (!transactions || transactions.length === 0) {
    el.innerHTML = '<div class="text-sm muted">No transactions yet</div>';
    return;
  }
  for (const tx of transactions) {
    const d = tx.date ? tx.date.toLocaleDateString() : "—";
    const amountText = fmtCurrency(tx.amount);
    const merchant = tx.raw?.vendor || "Shopping trip";
    const category = tx.raw?.category || tx.category || "Mixed";
    const note = tx.note || tx.raw?.note || "";
    const row = document.createElement("div");
    row.className = "flex justify-between items-center p-4 bg-green-50 rounded-2xl";
    row.innerHTML = `
      <div>
        <h4 class="font-medium">${escapeHtml(merchant)}</h4>
        <p class="text-sm text-green-800/80">${escapeHtml(note)}</p>
        <span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">${escapeHtml(category)}</span>
        <span class="text-xs text-green-800/60 ml-2">${escapeHtml(d)}</span>
      </div>
      <p class="text-lg font-semibold">${amountText}</p>
    `;
    el.appendChild(row);
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ---------- Main: wait for auth and populate DOM ---------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.warn("User is not signed in. The budget UI will not populate until sign-in.");
    return;
  }

  const uid = user.uid;
  try {
    const userSnap = await getDoc(doc(db, "users", uid));
    const profileSnap = await getDoc(doc(db, "profiles", uid));
    const userDoc = userSnap.exists() ? userSnap.data() : {};
    const profileDoc = profileSnap.exists() ? profileSnap.data() : {};
    const profile = { ...userDoc, ...profileDoc };

    const rawSpending = Array.isArray(profile.spendingHistory) ? profile.spendingHistory : [];

    const transactions = rawSpending.map((tx) => {
      const date = toDate(tx.date);
      const amount = parseAmount(tx.amount ?? tx.amountCents ?? tx.value ?? 0);
      return { date, amount, raw: tx };
    }).filter(t => t.amount !== undefined && !isNaN(t.amount));

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;

    const thisMonthTx = transactions.filter(t => t.date && toMonthKey(t.date) === currentMonthKey);

    const totalThisMonth = thisMonthTx.reduce((s, t) => s + (t.amount || 0), 0);
    const tripsCount = Math.max(0, thisMonthTx.length);
    const avgPerTrip = tripsCount ? (totalThisMonth / tripsCount) : 0;

    const monthlyBudget = (profile.monthlyBudget == null) ? null : Number(profile.monthlyBudget);
    const pctOfBudget = (monthlyBudget && monthlyBudget > 0) ? ((totalThisMonth / monthlyBudget) * 100) : null;
    const savedVal = (monthlyBudget != null) ? (monthlyBudget - totalThisMonth) : null;

    const weekTotals = [0, 0, 0, 0, 0];
    for (const t of thisMonthTx) {
      if (!t.date) continue;
      const day = t.date.getDate();
      let wk = 1;
      if (day >= 8 && day <= 14) wk = 2;
      else if (day >= 15 && day <= 21) wk = 3;
      else if (day >= 22) wk = 4;
      weekTotals[wk] += t.amount || 0;
    }
    const monthTotalFromWeeks = weekTotals.reduce((a, b) => a + b, 0) || 1;

    const categories = {}; // no category info with current schema

    const recent = transactions
      .filter(t => t.date)
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 8)
      .map(t => ({ ...t, note: t.raw?.note || "" }));

    /* ---------- Update DOM ---------- */
    safeText("totalSpentVal", fmtCurrency(totalThisMonth));
    safeText("cardTotalSpent", fmtCurrency(totalThisMonth));
    safeText("pctOfBudget", monthlyBudget ? (Math.round(pctOfBudget) + "% of $" + monthlyBudget) : "no budget set");
    safeText("savedVal", savedVal != null ? fmtCurrency(savedVal) : "—");
    safeText("savedSub", monthlyBudget ? `of $${monthlyBudget}` : "No monthlyBudget set in profile");
    safeText("moneySaved", fmtCurrency(profile.previousMonthTotal ? (profile.previousMonthTotal - totalThisMonth) : (profile.savedThisMonth || 0)));
    safeText("avgPerWeek", fmtCurrency(totalThisMonth / 4));
    safeText("pctChangeBadge", profile.pctChangeLabel || "-");
    safeText("onTrackBadge", (monthlyBudget && pctOfBudget < 90) ? "On Track" : (monthlyBudget ? "Check" : "—"));
    safeText("savedBadge", profile.savedBadge || "-");
    safeText("tripCountBadge", tripsCount ? `${tripsCount} trips` : "0 trips");
    safeText("avgPerTrip", fmtCurrency(avgPerTrip));
    safeText("tripsNote", tripsCount ? `${(tripsCount / Math.max(1, Math.ceil(now.getDate() / 7))).toFixed(1)} trips per week on average` : "—");
    safeText("weeklyBudgetLabel", monthlyBudget ? `Weekly Budget: $${(monthlyBudget / 4).toFixed(2)}` : "Weekly Budget: —");
    safeText("weeklyStatus", (monthlyBudget && pctOfBudget < 100) ? "Under budget" : (monthlyBudget ? "Over budget" : "—"));
    safeText("budgetPctText", monthlyBudget ? `${Math.round(pctOfBudget)}% of budget used` : "—");

    if (monthlyBudget) setBarWidth("budgetProgressBar", pctOfBudget);

    for (let i = 1; i <= 4; i++) {
      safeText(`week${i}Amount`, fmtCurrency(weekTotals[i]));
      const pct = monthlyBudget ? Math.round((weekTotals[i] / monthlyBudget) * 100) : Math.round((weekTotals[i] / monthTotalFromWeeks) * 100);
      safeText(`week${i}PctBadge`, `${pct}%`);
      setBarWidth(`week${i}Bar`, pct);
    }

    renderCategories(categories, monthlyBudget);
    renderRecentTransactions(recent);

  } catch (err) {
    console.error("Failed to load profile/spending data:", err);
  }
});
