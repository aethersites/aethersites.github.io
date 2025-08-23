// grocery/grocery.js
// Module for Groceries & Pantry UI — wired to Firestore using your schema:
//   users/{uid}  (doc id = uid)  --> email, name {first,last}, profilePicture, createdAt, subscriptionTier...
//   profiles/{uid} (doc id = uid) -> groceryLists[], pantryItems[], customIngredients[], spendingHistory[], ...
//
// NOTE: fill firebaseConfig below if not already provided in your app shell.
// This file assumes it's loaded as <script type="module" src="grocery/grocery.js"></script>

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/* ---------- FILL / CONFIRM your firebaseConfig here if needed ----------
   If your project already initialises Firebase elsewhere, you can leave
   this as-is (it will reuse the existing app). If not, fill the fields.
-------------------------------------------------------------------------*/
const firebaseConfig = {
   apiKey: "AIzaSyCOHC_OvQ4onPkhLvHzZEPazmY6PRcxjnw",
    authDomain: "goodplates-7ae36.firebaseapp.com",
    projectId: "goodplates-7ae36",
    storageBucket: "goodplates-7ae36.firebasestorage.app",
    messagingSenderId: "541149626283",
    appId: "1:541149626283:web:928888f0b42cda49b7dcee",
    measurementId: "G-HKMSHM726J"
};

// Initialize app (idempotent)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const analytics = (() => { try { return getAnalytics(app); } catch(e) { return null; } })();
const auth = getAuth(app);
const db = getFirestore(app);

/* ---------- DOM refs (safe guards if nodes missing) ---------- */
const signinBtn = document.getElementById('signinBtn');
const signoutBtn = document.getElementById('signoutBtn'); // optional in your HTML
const signedState = document.getElementById('signedState');
const brandEl = document.querySelector('.brand'); // uses .brand element

const groceriesBody = document.getElementById('groceriesBody');
const pantryBody = document.getElementById('pantryBody');

const addGroceryBtn = document.getElementById('addGroceryBtn');
const gName = document.getElementById('gName');
const gQty = document.getElementById('gQty');
const gPrice = document.getElementById('gPrice');
const gCurrency = document.getElementById('gCurrency');

const addPantryBtn = document.getElementById('addPantryBtn');
const pName = document.getElementById('pName');
const pQty = document.getElementById('pQty');
const pExp = document.getElementById('pExp');

const openCustomBtn = document.getElementById('openCustomBtn'); // opens modal
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
let usersDoc = null;     // users/{uid} doc data
let profileDocRef = null;
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

/* ---------- Auth button wiring (guarded) ---------- */
if (signinBtn) {
  signinBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try { await signInWithPopup(auth, provider); }
    catch (e) { alert('Sign-in failed: ' + (e.message || e)); console.error(e); }
  });
}
if (signoutBtn) {
  signoutBtn.addEventListener('click', async () => {
    try { await signOut(auth); }
    catch (e) { console.error('Sign-out failed', e); }
  });
}

/* ---------- Load or create profile document (profiles/{uid}) ---------- */
async function loadOrCreateProfile(uid) {
  if (!uid) return null;
  profileDocRef = doc(db, 'profiles', uid);
  const snap = await getDoc(profileDocRef);
  if (!snap.exists()) {
    // initial default profile (use your schema)
    const initial = {
      groceryLists: [
        { name: 'Default', items: [], createdAt: serverTimestamp() }
      ],
      pantryItems: [],
      customIngredients: [],
      aiSuggestionsEnabled: true,
      spendingHistory: [], // optional
      createdAt: serverTimestamp()
    };
    // create with serverTimestamp and return initial object (Firestore will set serverTimestamp)
    await setDoc(profileDocRef, initial);
    // read back to ensure timestamps are present if you need them (optional)
    const after = await getDoc(profileDocRef);
    profileData = after.exists() ? after.data() : initial;
  } else {
    profileData = snap.data();
    // normalize missing arrays
    profileData.groceryLists = profileData.groceryLists || [{ name:'Default', items:[], createdAt: serverTimestamp() }];
    profileData.pantryItems = profileData.pantryItems || [];
    profileData.customIngredients = profileData.customIngredients || [];
    profileData.spendingHistory = profileData.spendingHistory || [];
  }
}

/* ---------- Save (debounced) ---------- */
let pendingSave = null;
function scheduleSave() {
  if (pendingSave) clearTimeout(pendingSave);
  pendingSave = setTimeout(async () => {
    pendingSave = null;
    if (!profileDocRef || !profileData) return;
    try {
      // update arrays (merge)
      await updateDoc(profileDocRef, {
        groceryLists: profileData.groceryLists,
        pantryItems: profileData.pantryItems,
        customIngredients: profileData.customIngredients,
        aiSuggestionsEnabled: !!profileData.aiSuggestionsEnabled
      });
    } catch (e) {
      // If update fails (e.g., doc missing), fallback to setDoc merge
      try {
        await setDoc(profileDocRef, {
          groceryLists: profileData.groceryLists,
          pantryItems: profileData.pantryItems,
          customIngredients: profileData.customIngredients,
          aiSuggestionsEnabled: !!profileData.aiSuggestionsEnabled
        }, { merge: true });
      } catch (e2) { console.error('Save fallback failed', e2); }
    }
  }, 350);
}

/* ---------- Render / Clear UI ---------- */
function clearUI() {
  if (groceriesBody) groceriesBody.innerHTML = '<tr><td colspan="4" class="small">Sign in to see your lists</td></tr>';
  if (pantryBody) pantryBody.innerHTML = '<tr><td colspan="4" class="small">Sign in to see your pantry</td></tr>';
  safeSetText(signedState, 'Not signed in');
  if (brandEl) brandEl.textContent = '';
  // set header date (if present)
  const pageHeadingDate = document.querySelector('.page-heading p');
  if (pageHeadingDate) pageHeadingDate.textContent = 'Date: ' + formatDate(new Date());
}

function renderAll() {
  const list = (profileData && profileData.groceryLists && profileData.groceryLists[activeGroceryListIndex]) || { name:'Default', items:[] };
  renderGroceries(list.items || []);
  renderPantry(profileData ? (profileData.pantryItems || []) : []);
  // signedState: prefer users.name map (first+last) then auth displayName then email
  let display = '';
  if (usersDoc && usersDoc.name) {
    const n = usersDoc.name;
    display = (n.first || '') + (n.last ? (' ' + n.last) : '');
  }
  if (!display && currentUser) display = currentUser.displayName || currentUser.email || currentUser.uid;
  safeSetText(signedState, display || 'Not signed in');
  if (brandEl) brandEl.textContent = display ? display : 'GoodPlates';
}

function renderGroceries(items=[]) {
  if (!groceriesBody) return;
  groceriesBody.innerHTML = '';
  if (!items.length) return groceriesBody.innerHTML = '<tr><td colspan="4" class="small">No grocery items</td></tr>';
  items.forEach((it, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHTML(it.name)}</td>
      <td>${it.quantity ?? 1}</td>
      <td>${it.price != null ? formatCurrency(it.price) : '-'}</td>
      <td class="actions">
        <button data-idx="${idx}" class="btn btn-edit btn-edit-row">Edit</button>
        <button data-idx="${idx}" class="btn btn-muted btn-move">Move → Pantry</button>
        <button data-idx="${idx}" class="btn btn-danger btn-delete">Delete</button>
      </td>
    `;
    groceriesBody.appendChild(tr);
  });
  groceriesBody.querySelectorAll('.btn-edit-row').forEach(btn => btn.addEventListener('click', onEditGrocery));
  groceriesBody.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', onDeleteGrocery));
  groceriesBody.querySelectorAll('.btn-move').forEach(btn => btn.addEventListener('click', onMoveToPantry));
}

function renderPantry(items=[]) {
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
    pantryBody.appendChild(tr);
  });
  pantryBody.querySelectorAll('.btn-edit-pantry').forEach(btn => btn.addEventListener('click', onEditPantry));
  pantryBody.querySelectorAll('.btn-delete-pantry').forEach(btn => btn.addEventListener('click', onDeletePantry));
}

/* ---------- Event handlers: Add / Edit / Delete / Move ---------- */
// Add grocery
if (addGroceryBtn) addGroceryBtn.addEventListener('click', () => {
  if (!currentUser) return alert('Sign in to add items');
  const name = gName?.value?.trim();
  if (!name) return alert('Enter a name');
  const qty = Number(gQty?.value) || 1;
  const price = (gPrice && gPrice.value !== '') ? Number(gPrice.value) : null;
  const item = { name, quantity: qty, price };
  profileData.groceryLists = profileData.groceryLists || [{ name:'Default', items: [] }];
  const list = profileData.groceryLists[activeGroceryListIndex] || profileData.groceryLists[0];
  list.items = list.items || [];
  list.items.push(item);
  scheduleSave();
  renderAll();
  if (gName) gName.value = ''; if (gQty) gQty.value = 1; if (gPrice) gPrice.value = '';
});

// Add pantry
if (addPantryBtn) addPantryBtn.addEventListener('click', () => {
  if (!currentUser) return alert('Sign in to add pantry items');
  const name = pName?.value?.trim();
  if (!name) return alert('Enter a name');
  const qty = Number(pQty?.value) || 1;
  const expirationDate = pExp && pExp.value ? new Date(pExp.value) : null;
  const item = { name, quantity: qty };
  if (expirationDate) item.expirationDate = expirationDate;
  profileData.pantryItems = profileData.pantryItems || [];
  profileData.pantryItems.push(item);
  scheduleSave();
  renderAll();
  if (pName) pName.value=''; if (pQty) pQty.value=1; if (pExp) pExp.value='';
});

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

// modal save (for edit or custom)
if (modalSave) modalSave.addEventListener('click', () => {
  if (!editingContext) { setModalVisible(false); return; }
  const t = editingContext;
  const name = (t.type === 'grocery' || t.type === 'pantry') ? (document.getElementById('mName')?.value?.trim() || '') : (cName?.value?.trim() || '');
  // Note: we support both flows: editingContext created using edit buttons uses 'mName' etc in original code,
  // but this file uses the modal's cName for new / custom items. If you want separate edit modal fields, adapt HTML.
  if (!name) return alert('Enter a name');
  const qty = Number((t.type === 'grocery' || t.type === 'pantry') ? (document.getElementById('mQty')?.value || 1) : (cQty?.value || 1));
  const price = (t.type === 'grocery' || t.type === 'pantry') ? (Number(document.getElementById('mPrice')?.value) || null) : ((cPrice && cPrice.value !== '') ? Number(cPrice.value) : null);

  if (t.type === 'grocery' && Number.isFinite(t.idx)) {
    const list = profileData.groceryLists[activeGroceryListIndex];
    const it = list.items[t.idx];
    it.name = name; it.quantity = qty; it.price = price;
  } else if (t.type === 'pantry' && Number.isFinite(t.idx)) {
    const it = profileData.pantryItems[t.idx];
    it.name = name; it.quantity = qty;
    if (price != null) it.price = price;
    else delete it.price;
  } else if (t.type === 'custom') {
    const item = { name, quantity: qty, price: price };
    profileData.groceryLists = profileData.groceryLists || [{ name:'Default', items: [] }];
    profileData.groceryLists[activeGroceryListIndex].items.push(item);
    profileData.customIngredients = profileData.customIngredients || [];
    profileData.customIngredients.push({ name, quantity: qty, price: price });
  }
  scheduleSave();
  setModalVisible(false);
  editingContext = null;
  renderAll();
});

// modal cancel
if (modalCancel) modalCancel.addEventListener('click', () => { setModalVisible(false); editingContext = null; });

// Edit / Delete / Move handlers
function onEditGrocery(e) {
  const idx = Number(e.currentTarget.dataset.idx);
  const item = profileData.groceryLists[activeGroceryListIndex].items[idx];
  editingContext = { type:'grocery', idx };
  // For simplicity reuse custom modal fields (cName etc.) to edit
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
  scheduleSave(); renderAll();
}
function onMoveToPantry(e) {
  const idx = Number(e.currentTarget.dataset.idx);
  const item = profileData.groceryLists[activeGroceryListIndex].items.splice(idx,1)[0];
  const p = { name: item.name, quantity: item.quantity || 1 };
  profileData.pantryItems = profileData.pantryItems || [];
  profileData.pantryItems.push(p);
  scheduleSave(); renderAll();
}

function onEditPantry(e) {
  const idx = Number(e.currentTarget.dataset.idx);
  const item = profileData.pantryItems[idx];
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
  scheduleSave(); renderAll();
}

/* ---------- Auth observer: fetch users + profiles ---------- */
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!user) {
    // signed out
    signedState && (signedState.textContent = 'Not signed in');
    if (signinBtn) signinBtn.style.display = '';
    if (signoutBtn) signoutBtn.style.display = 'none';
    profileDocRef = null;
    profileData = null;
    usersDoc = null;
    clearUI();
    return;
  }

  // signed in
  if (signinBtn) signinBtn.style.display = 'none';
  if (signoutBtn) signoutBtn.style.display = '';

  // fetch users/{uid} doc (optional)
  try {
    const usersSnap = await getDoc(doc(db, 'users', user.uid));
    if (!usersSnap.exists()) {
      // create a light users doc if not present (merge)
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

  // ensure profile exists
  await loadOrCreateProfile(user.uid);

  renderAll();
});

/* ---------- initial UI ---------- */
clearUI();
// expose some debug helpers
window._profile = () => profileData;
window._usersDoc = () => usersDoc;
window._saveNow = () => scheduleSave();
