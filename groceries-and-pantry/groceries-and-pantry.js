// grocery/grocery.js
// Replace the firebaseConfig placeholder with your real config object.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

/* --------- FIREBASE: fill your config here --------- */
const firebaseConfig = {
    apiKey: "AIzaSyCOHC_OvQ4onPkhLvHzZEPazmY6PRcxjnw",
    authDomain: "goodplates-7ae36.firebaseapp.com",
    projectId: "goodplates-7ae36",
    storageBucket: "goodplates-7ae36.firebasestorage.app",
    messagingSenderId: "541149626283",
    appId: "1:541149626283:web:928888f0b42cda49b7dcee",
    measurementId: "G-HKMSHM726J"
};

const app = initializeApp(firebaseConfig);
try { getAnalytics(app); } catch (e) { /* analytics optional */ }

const db = getFirestore(app);
const auth = getAuth(app);

/* ---------- DOM refs (guards) ---------- */
const signinBtn = document.getElementById('signinBtn');
let signoutBtn = document.getElementById('signoutBtn'); // might be missing in HTML
const signedState = document.getElementById('signedState');
const brandEl = document.querySelector('.brand');

const groceriesBody = document.getElementById('groceriesBody');
const pantryBody = document.getElementById('pantryBody');

const groceriesBox = document.getElementById('groceriesBox');
const pantryBox = document.getElementById('pantryBox');

const addGroceryBtn = document.getElementById('addGroceryBtn');
const gName = document.getElementById('gName');
const gQty = document.getElementById('gQty');
const gPrice = document.getElementById('gPrice');
const gCurrency = document.getElementById('gCurrency');
const addGroceryForm = document.getElementById('addGroceryForm');

const addPantryBtn = document.getElementById('addPantryBtn');
const pName = document.getElementById('pName');
const pQty = document.getElementById('pQty');
const pExp = document.getElementById('pExp');
const addPantryForm = document.getElementById('addPantryForm');

const openCustomBtn = document.getElementById('openCustomBtn');
const cName = document.getElementById('cName');
const cQty = document.getElementById('cQty');
const cPrice = document.getElementById('cPrice');
const cCurrency = document.getElementById('cCurrency');

const modalBackdrop = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalSave = document.getElementById('modalSave');
const modalCancel = document.getElementById('modalCancel');

/* ---------- app state ---------- */
let currentUser = null;
let usersDoc = null;
let profileDocRef = null;
let profileUnsub = null;
let profileData = null;
let activeGroceryListIndex = 0;
let editingContext = null; // {type:'grocery'|'pantry'|'custom', idx}

/* ---------- Helpers ---------- */
function escapeHTML(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function formatCurrency(n, symbol = '$') {
  if (n == null || n === '') return '-';
  const num = Number(n);
  if (!isFinite(num)) return '-';
  return symbol + num.toFixed(2);
}
function convertMaybeTimestamp(v) {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate();
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (v instanceof Date) return v;
  return null;
}
function formatDate(d) {
  if (!d) return '-';
  const dt = (d instanceof Date) ? d : new Date(d);
  const y = dt.getFullYear(); const m = String(dt.getMonth()+1).padStart(2,'0'); const day = String(dt.getDate()).padStart(2,'0');
  return `${m}-${day}-${String(y).slice(-2)}`;
}
function safeSetText(el, txt) {
  if (!el) return;
  el.textContent = (txt === null || txt === undefined) ? '' : String(txt);
}
function setModalVisible(visible) {
  if (!modalBackdrop) return;
  modalBackdrop.style.display = visible ? 'flex' : 'none';
  if (visible) document.body.classList.add('modal-open'); else document.body.classList.remove('modal-open');
}

/* ---------- Persistence helpers ---------- */
let pendingSave = null;
function scheduleSave() {
  if (!profileDocRef || profileData == null) return;
  if (pendingSave) clearTimeout(pendingSave);
  pendingSave = setTimeout(async () => {
    pendingSave = null;
    try {
      await updateDoc(profileDocRef, {
        groceryLists: profileData.groceryLists || [],
        pantryItems: profileData.pantryItems || [],
        customIngredients: profileData.customIngredients || [],
        aiSuggestionsEnabled: !!profileData.aiSuggestionsEnabled
      });
    } catch (e) {
      try {
        await setDoc(profileDocRef, {
          groceryLists: profileData.groceryLists || [],
          pantryItems: profileData.pantryItems || [],
          customIngredients: profileData.customIngredients || [],
          aiSuggestionsEnabled: !!profileData.aiSuggestionsEnabled
        }, { merge: true });
      } catch (e2) {
        console.error('Save failed', e2);
      }
    }
  }, 350);
}
async function saveNow() {
  if (!profileDocRef || profileData == null) return;
  try {
    await updateDoc(profileDocRef, {
      groceryLists: profileData.groceryLists || [],
      pantryItems: profileData.pantryItems || [],
      customIngredients: profileData.customIngredients || [],
      aiSuggestionsEnabled: !!profileData.aiSuggestionsEnabled
    });
  } catch (e) {
    try {
      await setDoc(profileDocRef, {
        groceryLists: profileData.groceryLists || [],
        pantryItems: profileData.pantryItems || [],
        customIngredients: profileData.customIngredients || [],
        aiSuggestionsEnabled: !!profileData.aiSuggestionsEnabled
      }, { merge: true });
    } catch (e2) {
      console.error('Immediate save failed', e2);
    }
  }
}

/* ---------- Drag state & helpers ---------- */
function makeDraggableRow(tr, kind, idx) {
  // add attributes used for drag/drop
  tr.setAttribute('draggable', 'true');
  tr.dataset.kind = kind; // 'grocery' or 'pantry'
  tr.dataset.idx = String(idx);

  tr.addEventListener('dragstart', (ev) => {
    // disallow drag if not signed in
    if (!currentUser) {
      ev.preventDefault();
      return alert('Sign in to move items between lists');
    }
    const payload = JSON.stringify({ kind, idx });
    ev.dataTransfer.setData('application/json', payload);
    // allow move effect
    ev.dataTransfer.effectAllowed = 'move';
    // small visual (some browsers need text)
    ev.dataTransfer.setData('text/plain', escapeHTML((tr.textContent || '').trim().slice(0, 200)));
    // highlight target boxes
    if (groceriesBox) groceriesBox.classList.add('drag-target');
    if (pantryBox) pantryBox.classList.add('drag-target');
  });

  tr.addEventListener('dragend', (ev) => {
    if (groceriesBox) groceriesBox.classList.remove('drag-target');
    if (pantryBox) pantryBox.classList.remove('drag-target');
  });
}

/* ---------- Render / Clear UI ---------- */
function clearUI() {
  if (groceriesBody) groceriesBody.innerHTML = '<tr><td colspan="4" class="small">Sign in to see your lists</td></tr>';
  if (pantryBody) pantryBody.innerHTML = '<tr><td colspan="4" class="small">Sign in to see your pantry</td></tr>';
  safeSetText(signedState, 'Not signed in');
  if (brandEl) brandEl.textContent = '';
  const pageHeadingDate = document.querySelector('.page-heading p');
  if (pageHeadingDate) pageHeadingDate.textContent = 'Date: ' + formatDate(new Date());
}

function renderAll() {
  const list = (profileData && profileData.groceryLists && profileData.groceryLists[activeGroceryListIndex]) || { name:'Default', items:[] };
  renderGroceries(list.items || []);
  renderPantry(profileData ? (profileData.pantryItems || []) : []);
  let display = '';
  if (usersDoc && usersDoc.name) {
    const n = usersDoc.name;
    display = (n.first || '') + (n.last ? (' ' + n.last) : '');
  }
  if (!display && currentUser) display = currentUser.displayName || currentUser.email || currentUser.uid;
  safeSetText(signedState, display || 'Not signed in');
  if (brandEl) brandEl.textContent = display ? display : 'GoodPlates';
}

function renderGroceries(items = []) {
  if (!groceriesBody) return;
  groceriesBody.innerHTML = '';
  if (!items.length) return groceriesBody.innerHTML = '<tr><td colspan="4" class="small">No grocery items</td></tr>';

  items.forEach((it, idx) => {
    const purchasedClass = it.purchased ? 'style="text-decoration:line-through; opacity:.7;"' : '';
    const currency = it.currency || '$';
    const priceDisplay = (it.price != null) ? formatCurrency(it.price, currency) : '-';
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td ${purchasedClass}>
        <label style="display:flex;align-items:center;gap:10px;">
          <input type="checkbox" data-idx="${idx}" class="chk-bought" ${it.purchased ? 'checked' : ''} />
          <span>${escapeHTML(it.name)}</span>
        </label>
      </td>
      <td ${purchasedClass}>${it.quantity ?? 1}</td>
      <td ${purchasedClass}>${priceDisplay}</td>
      <td class="actions">
        <button data-idx="${idx}" class="btn btn-edit btn-edit-row">Edit</button>
        <button data-idx="${idx}" class="btn btn-muted btn-move">Move → Pantry</button>
        <button data-idx="${idx}" class="btn btn-danger btn-delete">Delete</button>
      </td>
    `;
    // make the table row draggable
    makeDraggableRow(tr, 'grocery', idx);

    groceriesBody.appendChild(tr);
  });

  groceriesBody.querySelectorAll('.chk-bought').forEach(cb => cb.addEventListener('change', onTogglePurchased));
  groceriesBody.querySelectorAll('.btn-edit-row').forEach(btn => btn.addEventListener('click', onEditGrocery));
  groceriesBody.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', onDeleteGrocery));
  groceriesBody.querySelectorAll('.btn-move').forEach(btn => btn.addEventListener('click', onMoveToPantry));
}

function renderPantry(items = []) {
  if (!pantryBody) return;
  pantryBody.innerHTML = '';
  if (!items.length) return pantryBody.innerHTML = '<tr><td colspan="4" class="small">No pantry items</td></tr>';
  items.forEach((it, idx) => {
    const exp = it.expirationDate ? formatDate(convertMaybeTimestamp(it.expirationDate)) : '-';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHTML(it.name)}</td>
      <td>${it.quantity ?? 1}</td>
      <td>${exp}</td>
      <td class="actions">
        <button data-idx="${idx}" class="btn btn-edit btn-edit-pantry">Edit</button>
        <button data-idx="${idx}" class="btn btn-danger btn-delete-pantry">Delete</button>
      </td>
    `;
    // make the row draggable
    makeDraggableRow(tr, 'pantry', idx);

    pantryBody.appendChild(tr);
  });
  pantryBody.querySelectorAll('.btn-edit-pantry').forEach(btn => btn.addEventListener('click', onEditPantry));
  pantryBody.querySelectorAll('.btn-delete-pantry').forEach(btn => btn.addEventListener('click', onDeletePantry));
}

/* ---------- Event handlers ---------- */

// ensure form buttons don't submit the page; force button-type for safety
if (addGroceryBtn) addGroceryBtn.type = 'button';
if (addPantryBtn) addPantryBtn.type = 'button';
if (modalSave) modalSave.type = 'button';
if (modalCancel) modalCancel.type = 'button';

// Add grocery
async function handleAddGrocery(e) {
  if (!currentUser) return alert('Sign in to add items');
  e && e.preventDefault && e.preventDefault();
  const name = gName?.value?.trim();
  if (!name) return alert('Enter a name');
  const qty = Number(gQty?.value) || 1;
  const price = (gPrice && gPrice.value !== '') ? Number(gPrice.value) : null;
  const currency = (gCurrency && gCurrency.value) || '$';
  const item = { name, quantity: qty, price, currency, createdAt: serverTimestamp(), purchased: false };
  profileData = profileData || {};
  profileData.groceryLists = profileData.groceryLists || [{ name:'Default', items: [] }];
  const list = profileData.groceryLists[activeGroceryListIndex] || profileData.groceryLists[0];
  list.items = list.items || [];
  list.items.push(item);

  scheduleSave();
  await saveNow().catch(() => { /* already scheduled */ });

  renderAll();
  if (gName) gName.value = '';
  if (gQty) gQty.value = 1;
  if (gPrice) gPrice.value = '';
}
if (addGroceryBtn) addGroceryBtn.addEventListener('click', handleAddGrocery);
if (addGroceryForm) addGroceryForm.addEventListener('submit', handleAddGrocery);

// Add pantry
async function handleAddPantry(e) {
  if (!currentUser) return alert('Sign in to add pantry items');
  e && e.preventDefault && e.preventDefault();
  const name = pName?.value?.trim();
  if (!name) return alert('Enter a name');
  const qty = Number(pQty?.value) || 1;
  const expirationDate = pExp && pExp.value ? new Date(pExp.value) : null;
  const item = { name, quantity: qty, createdAt: serverTimestamp() };
  if (expirationDate) item.expirationDate = expirationDate;
  profileData = profileData || {};
  profileData.pantryItems = profileData.pantryItems || [];
  profileData.pantryItems.push(item);

  scheduleSave();
  await saveNow().catch(()=>{});

  renderAll();
  if (pName) pName.value='';
  if (pQty) pQty.value=1;
  if (pExp) pExp.value='';
}
if (addPantryBtn) addPantryBtn.addEventListener('click', handleAddPantry);
if (addPantryForm) addPantryForm.addEventListener('submit', handleAddPantry);

// open custom modal
if (openCustomBtn) openCustomBtn.addEventListener('click', () => {
  if (!currentUser) return alert('Sign in to add custom ingredients');
  editingContext = { type: 'custom' };
  if (modalTitle) modalTitle.textContent = 'Add Custom Ingredient';
  if (cName) cName.value = '';
  if (cQty) cQty.value = 1;
  if (cPrice) cPrice.value = '';
  setModalVisible(true);
  if (cName) cName.focus();
});

// modal save
if (modalSave) modalSave.addEventListener('click', async () => {
  if (!editingContext) { setModalVisible(false); return; }
  const t = editingContext;
  const name = (cName?.value?.trim() || '');
  if (!name) return alert('Enter a name');
  const qty = Number(cQty?.value || 1);
  const price = (cPrice && cPrice.value !== '') ? Number(cPrice.value) : null;

  if (t.type === 'grocery' && Number.isFinite(t.idx)) {
    const list = profileData.groceryLists[activeGroceryListIndex];
    const it = list.items[t.idx];
    it.name = name; it.quantity = qty; it.price = price;
  } else if (t.type === 'pantry' && Number.isFinite(t.idx)) {
    const it = profileData.pantryItems[t.idx];
    it.name = name; it.quantity = qty;
    if (price != null) it.price = price; else delete it.price;
  } else if (t.type === 'custom') {
    const currency = (cCurrency && cCurrency.value) || '$';
    const item = { name, quantity: qty, price: price, currency, createdAt: serverTimestamp() };
    profileData.groceryLists = profileData.groceryLists || [{ name:'Default', items: [] }];
    profileData.groceryLists[activeGroceryListIndex].items.push(item);
    profileData.customIngredients = profileData.customIngredients || [];
    profileData.customIngredients.push({ name, quantity: qty, price: price, currency, createdAt: serverTimestamp() });
  }
  scheduleSave();
  await saveNow().catch(()=>{});
  setModalVisible(false);
  editingContext = null;
  renderAll();
});

// modal cancel
if (modalCancel) modalCancel.addEventListener('click', () => { setModalVisible(false); editingContext = null; });

// Edit / Delete / Move / Toggle handlers
function onEditGrocery(e) {
  const idx = Number(e.currentTarget.dataset.idx);
  const item = (profileData?.groceryLists?.[activeGroceryListIndex]?.items || [])[idx];
  if (!item) return;
  editingContext = { type:'grocery', idx };
  if (modalTitle) modalTitle.textContent = 'Edit Grocery Item';
  if (cName) cName.value = item.name || '';
  if (cQty) cQty.value = item.quantity ?? 1;
  if (cPrice) cPrice.value = item.price != null ? String(item.price) : '';
  setModalVisible(true);
}
function onDeleteGrocery(e) {
  const idx = Number(e.currentTarget.dataset.idx);
  if (!confirm('Delete this grocery item?')) return;
  profileData.groceryLists[activeGroceryListIndex].items.splice(idx,1);
  scheduleSave(); saveNow();
  renderAll();
}
function onMoveToPantry(e) {
  const idx = Number(e.currentTarget.dataset.idx);
  const list = profileData.groceryLists[activeGroceryListIndex];
  const item = list.items.splice(idx,1)[0];
  if (!item) return;
  const p = { name: item.name, quantity: item.quantity || 1, createdAt: serverTimestamp() };
  profileData.pantryItems = profileData.pantryItems || [];
  profileData.pantryItems.push(p);
  scheduleSave(); saveNow();
  renderAll();
}
function onEditPantry(e) {
  const idx = Number(e.currentTarget.dataset.idx);
  const item = profileData.pantryItems[idx];
  if (!item) return;
  editingContext = { type:'pantry', idx };
  if (modalTitle) modalTitle.textContent = 'Edit Pantry Item';
  if (cName) cName.value = item.name || '';
  if (cQty) cQty.value = item.quantity ?? 1;
  if (cPrice) cPrice.value = item.price != null ? String(item.price) : '';
  setModalVisible(true);
}
function onDeletePantry(e) {
  const idx = Number(e.currentTarget.dataset.idx);
  if (!confirm('Delete this pantry item?')) return;
  profileData.pantryItems.splice(idx,1);
  scheduleSave(); saveNow();
  renderAll();
}
function onTogglePurchased(e) {
  const idx = Number(e.currentTarget.dataset.idx);
  const list = profileData.groceryLists[activeGroceryListIndex];
  if (!list || !list.items || !list.items[idx]) return;
  const it = list.items[idx];
  it.purchased = !!e.currentTarget.checked;
  if (it.purchased) it.purchasedAt = new Date();
  else delete it.purchasedAt;
  scheduleSave(); saveNow();
  renderAll();
}

/* ---------- Drag drop on boxes ---------- */
// add handlers to accept drops on the two boxes
function parseDragData(ev) {
  try {
    const raw = ev.dataTransfer.getData('application/json') || ev.dataTransfer.getData('text/plain');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

async function handleDropOnBox(ev, targetKind) {
  ev.preventDefault();
  if (!currentUser) return alert('Sign in to move items');
  const payload = parseDragData(ev);
  if (!payload || typeof payload.kind !== 'string' || payload.idx == null) {
    return;
  }
  const srcKind = payload.kind;
  const srcIdx = Number(payload.idx);

  // no-op if same list
  if (srcKind === targetKind) {
    if (groceriesBox) groceriesBox.classList.remove('drag-target');
    if (pantryBox) pantryBox.classList.remove('drag-target');
    return;
  }

  // move from groceries -> pantry
  if (srcKind === 'grocery' && targetKind === 'pantry') {
    const list = profileData.groceryLists[activeGroceryListIndex];
    if (!list || !list.items || !list.items[srcIdx]) return;
    const item = list.items.splice(srcIdx,1)[0];
    const p = { name: item.name, quantity: item.quantity || 1, createdAt: serverTimestamp() };
    profileData.pantryItems = profileData.pantryItems || [];
    profileData.pantryItems.push(p);
    scheduleSave(); await saveNow().catch(()=>{});
    renderAll();
  }

  // move from pantry -> groceries
  if (srcKind === 'pantry' && targetKind === 'grocery') {
    if (!profileData.pantryItems || !profileData.pantryItems[srcIdx]) return;
    const pitem = profileData.pantryItems.splice(srcIdx,1)[0];
    const gItem = { name: pitem.name, quantity: pitem.quantity || 1, price: pitem.price ?? null, createdAt: serverTimestamp() };
    profileData.groceryLists = profileData.groceryLists || [{ name:'Default', items: [] }];
    profileData.groceryLists[activeGroceryListIndex].items.push(gItem);
    scheduleSave(); await saveNow().catch(()=>{});
    renderAll();
  }

  if (groceriesBox) groceriesBox.classList.remove('drag-target');
  if (pantryBox) pantryBox.classList.remove('drag-target');
}

if (groceriesBox) {
  groceriesBox.addEventListener('dragover', (e) => e.preventDefault());
  groceriesBox.addEventListener('drop', (e) => handleDropOnBox(e, 'grocery'));
}
if (pantryBox) {
  pantryBox.addEventListener('dragover', (e) => e.preventDefault());
  pantryBox.addEventListener('drop', (e) => handleDropOnBox(e, 'pantry'));
}

/* ---------- Auth observer: fetch users + profile (realtime) ---------- */
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!user) {
    signedState && (signedState.textContent = 'Not signed in');
    if (signinBtn) signinBtn.style.display = '';
    if (signoutBtn) signoutBtn.style.display = 'none';
    profileDocRef = null;
    profileData = null;
    usersDoc = null;
    if (profileUnsub) { profileUnsub(); profileUnsub = null; }
    clearUI();
    return;
  }

  // signed in
  if (signinBtn) signinBtn.style.display = 'none';
  // ensure signout button exists (create if HTML didn't include it)
  if (!signoutBtn) {
    const authActions = document.querySelector('.auth-actions');
    if (authActions) {
      signoutBtn = document.createElement('button');
      signoutBtn.id = 'signoutBtn';
      signoutBtn.className = 'btn btn-muted';
      signoutBtn.textContent = 'Sign out';
      authActions.appendChild(signoutBtn);
      signoutBtn.addEventListener('click', async () => {
        try { await signOut(auth); } catch (e) { console.error('Sign-out failed', e); }
      });
    }
  } else {
    signoutBtn.style.display = '';
  }

  // fetch or create users/{uid}
  try {
    const usersSnap = await getDoc(doc(db, 'users', user.uid));
    if (!usersSnap.exists()) {
      const userRecord = {
        email: user.email || '',
        name: { first: user.displayName ? user.displayName.split(' ')[0] : '', last: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '' },
        profilePicture: user.photoURL || '',
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, 'users', user.uid), userRecord, { merge: true });
      usersDoc = userRecord;
    } else {
      usersDoc = usersSnap.data();
    }
  } catch (e) {
    console.warn('Could not read/create users/{uid}', e);
    usersDoc = null;
  }

  // ensure profile exists; then listen in realtime
  profileDocRef = doc(db, 'profiles', user.uid);
  try {
    const snap = await getDoc(profileDocRef);
    if (!snap.exists()) {
      const initial = {
        groceryLists: [{ name: 'Default', items: [], createdAt: serverTimestamp() }],
        pantryItems: [],
        customIngredients: [],
        aiSuggestionsEnabled: true,
        spendingHistory: [],
        createdAt: serverTimestamp()
      };
      await setDoc(profileDocRef, initial);
      // profileData will be loaded by onSnapshot below
    }
  } catch (e) {
    console.error('Could not ensure profile doc', e);
  }

  if (profileUnsub) { profileUnsub(); profileUnsub = null; }
  profileUnsub = onSnapshot(profileDocRef, (snap) => {
    if (!snap.exists()) {
      profileData = null;
      clearUI();
      return;
    }
    profileData = snap.data();
    // normalize arrays
    profileData.groceryLists = profileData.groceryLists || [{ name:'Default', items: [] }];
    profileData.pantryItems = profileData.pantryItems || [];
    profileData.customIngredients = profileData.customIngredients || [];
    profileData.spendingHistory = profileData.spendingHistory || [];
    renderAll();
  }, (err) => {
    console.error('Profile realtime error', err);
  });
});

/* ---------- initial UI ---------- */
clearUI();
// debug helpers for console
window._profile = () => profileData;
window._usersDoc = () => usersDoc;
window._saveNow = () => saveNow();
