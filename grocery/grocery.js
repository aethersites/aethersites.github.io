/* grocery.js — production-ready (auth required). No demo mode.
   Steps:
   1) Paste your Firebase web app config into `firebaseConfig` below.
   2) Ensure Firestore is enabled and your rules restrict access to /users/{uid}/...
*/

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, addDoc, doc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/* ---------- CONFIG: PASTE YOUR FIREBASE CONFIG HERE ---------- */
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

/* ---------------------------------------------------------------- */

let app;
if (getApps().length === 0) {
  if (!firebaseConfig || !firebaseConfig.projectId) {
    console.error('Please paste your Firebase config into grocery/grocery.js before enabling cloud mode.');
  }
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);

/* ---------- DOM ---------- */
const groceryInput = document.getElementById("groceryInput");
const groceryQty = document.getElementById("groceryQty");
const addBtn = document.getElementById("addGrocery");
const groceryList = document.getElementById("groceryList");
const pantryList = document.getElementById("pantryList");
const userDisplay = document.getElementById("userDisplay");
const panelContainer = document.getElementById("panelContainer");

let uid = null;
let unsubGrocery = null;
let unsubPantry = null;

/* ---------- UI initial: disabled until sign-in ---------- */
function setUIEnabled(enabled) {
  // panels fade when disabled
  if (enabled) panelContainer.classList.remove('disabled'); else panelContainer.classList.add('disabled');

  // enable/disable inputs & buttons
  groceryInput.disabled = !enabled;
  groceryQty.disabled = !enabled;
  addBtn.disabled = !enabled;
  addBtn.setAttribute('aria-disabled', (!enabled).toString());
  // disable any action buttons via attribute (they are added dynamically; we will also guard by checking uid on click)
  const actionButtons = document.querySelectorAll('.icon-btn');
  actionButtons.forEach(b => b.disabled = !enabled);
}
setUIEnabled(false);

/* ---------- Auth state: no redirect, only enable UI on sign-in ---------- */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    uid = null;
    userDisplay.textContent = 'Not signed in — sign in to enable editing';
    setUIEnabled(false);
    // unsubscribe snapshots if present
    if (unsubGrocery) { unsubGrocery(); unsubGrocery = null; }
    if (unsubPantry) { unsubPantry(); unsubPantry = null; }
    // still render empty placeholders so page is usable view-only
    renderGrocery([]);
    renderPantry([]);
    return;
  }

  // user is signed-in: enable UI and start realtime listeners
  uid = user.uid;
  userDisplay.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px">
      <img src="${user.photoURL || ''}" style="width:30px;height:30px;border-radius:999px;object-fit:cover" />
      <strong style="font-size:14px">${(user.displayName || user.email)}</strong>
      <button id="signoutBtn" style="margin-left:10px;padding:6px 8px;border-radius:8px;border:1px solid #e6e9ef;background:#fff;cursor:pointer">Sign out</button>
    </div>`;
  document.getElementById('signoutBtn').onclick = async () => { await signOut(auth); window.location.reload(); };

  setUIEnabled(true);
  subscribeRealtime();
});

/* ---------- Add item ---------- */
addBtn.addEventListener('click', handleAdd);
groceryInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleAdd(); });

async function handleAdd() {
  if (!uid) { alert('Please sign in to add items.'); return; }
  const name = (groceryInput.value || '').trim();
  const qty = Number(groceryQty.value || 1);
  if (!name) { groceryInput.focus(); return; }

  addBtn.disabled = true;
  try {
    await addDoc(collection(db, 'users', uid, 'grocery'), {
      name, quantity: qty || 1, bought: false, createdAt: serverTimestamp()
    });
    groceryInput.value = ''; groceryQty.value = 1;
  } catch (err) {
    console.error('Add failed', err);
    alert('Could not add item — check console.');
  } finally {
    addBtn.disabled = false;
  }
}

/* ---------- Realtime firestore subscriptions ---------- */
function subscribeRealtime() {
  if (!uid) return;
  const gRef = collection(db, 'users', uid, 'grocery');
  const pRef = collection(db, 'users', uid, 'pantry');
  const qG = query(gRef, orderBy('createdAt', 'desc'));
  const qP = query(pRef, orderBy('createdAt', 'desc'));

  if (unsubGrocery) unsubGrocery();
  if (unsubPantry) unsubPantry();

  unsubGrocery = onSnapshot(qG, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderGrocery(items);
  }, err => { console.error('grocery snapshot error', err); });

  unsubPantry = onSnapshot(qP, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderPantry(items);
  }, err => { console.error('pantry snapshot error', err); });
}

/* ---------- Renderers ---------- */
function renderGrocery(items) {
  groceryList.innerHTML = '';
  if (!items || items.length === 0) {
    const el = document.createElement('li'); el.className = 'empty'; el.textContent = 'No groceries — add something above.'; groceryList.appendChild(el); return;
  }

  for (const it of items) {
    const li = document.createElement('li'); li.className = 'item'; li.dataset.id = it.id;

    const left = document.createElement('div'); left.className = 'left';
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!it.bought; cb.title = 'Mark as bought';
    cb.addEventListener('change', () => {
      if (!uid) { cb.checked = !cb.checked; alert('Sign in to change'); return; }
      updateDoc(doc(db, 'users', uid, 'grocery', it.id), { bought: !it.bought }).catch(err => console.error(err));
    });

    const name = document.createElement('div'); name.className = 'name'; name.textContent = it.name;
    const meta = document.createElement('div'); meta.className = 'meta'; meta.textContent = `×${it.quantity || 1}`;
    left.append(cb, name, meta);

    const actions = document.createElement('div'); actions.className = 'actions';
    const move = document.createElement('button'); move.className = 'icon-btn move-btn'; move.title = 'Move to pantry';
    move.innerHTML = `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>`;
    move.disabled = !uid;
    move.addEventListener('click', async () => {
      if (!uid) return alert('Sign in to move items');
      li.classList.add('moving');
      setTimeout(async () => {
        try {
          await addDoc(collection(db, 'users', uid, 'pantry'), { name: it.name, quantity: it.quantity || 1, inStock: true, createdAt: serverTimestamp() });
          await deleteDoc(doc(db, 'users', uid, 'grocery', it.id));
        } catch (err) {
          console.error('Move failed', err); li.classList.remove('moving'); alert('Move failed — check console.');
        }
      }, 200);
    });

    const del = document.createElement('button'); del.className = 'icon-btn del'; del.title = 'Delete';
    del.innerHTML = `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>`;
    del.disabled = !uid;
    del.addEventListener('click', () => {
      if (!uid) return alert('Sign in to delete');
      deleteDoc(doc(db, 'users', uid, 'grocery', it.id)).catch(err => console.error(err));
    });

    if (it.bought) li.classList.add('bought');
    actions.append(move, del);
    li.append(left, actions);
    groceryList.appendChild(li);
  }
}

function renderPantry(items) {
  pantryList.innerHTML = '';
  if (!items || items.length === 0) {
    const el = document.createElement('li'); el.className = 'empty'; el.textContent = 'Pantry is empty.'; pantryList.appendChild(el); return;
  }

  for (const it of items) {
    const li = document.createElement('li'); li.className = 'item'; li.dataset.id = it.id;
    const left = document.createElement('div'); left.className = 'left';
    const name = document.createElement('div'); name.className = 'name'; name.textContent = it.name;
    const meta = document.createElement('div'); meta.className = 'meta'; meta.textContent = `×${it.quantity || 1}`;
    left.append(name, meta);

    const actions = document.createElement('div'); actions.className = 'actions';
    const out = document.createElement('button'); out.className = 'icon-btn'; out.textContent = (it.inStock === false) ? 'Refill' : 'Out';
    out.disabled = !uid;
    out.addEventListener('click', () => {
      if (!uid) return alert('Sign in to edit pantry');
      updateDoc(doc(db, 'users', uid, 'pantry', it.id), { inStock: !(it.inStock === undefined ? true : it.inStock) }).catch(err => console.error(err));
    });

    const del = document.createElement('button'); del.className = 'icon-btn del'; del.title = 'Delete';
    del.innerHTML = `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>`;
    del.disabled = !uid;
    del.addEventListener('click', () => {
      if (!uid) return alert('Sign in to delete');
      deleteDoc(doc(db, 'users', uid, 'pantry', it.id)).catch(err => console.error(err));
    });

    actions.append(out, del);
    li.append(left, actions);
    pantryList.appendChild(li);
  }
}
