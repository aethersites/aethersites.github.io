// grocery/grocery.js
// Firestore-linked groceries + pantry with transactional array updates
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  collection
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

/* --------- FIREBASE: YOUR CONFIG (you already gave this) --------- */
const firebaseConfig = {
  apiKey: "AIzaSyCOHC_OvQ4onPkhLvHzZEPazmY6PRcxjnw",
  authDomain: "goodplates-7ae36.firebaseapp.com",
  projectId: "goodplates-7ae36",
  storageBucket: "goodplates-7ae36.firebasestorage.app",
  messagingSenderId: "541149626283",
  appId: "1:541149626283:web:928888f0b42cda49b7dcee",
  measurementId: "G-HKMSHM726J"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
try { getAnalytics(app); } catch (e) { /* optional */ }

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
function safeSetText(el, txt) { if (!el) return; el.textContent = (txt === null || txt === undefined) ? '' : String(txt); }
function setModalVisible(visible) { if (!modalBackdrop) return; modalBackdrop.style.display = visible ? 'flex' : 'none'; document.body.classList.toggle('modal-open', !!visible); }

/* ---------- generate stable id helper (client-side) ---------- */
function genId() {
  // Generate an ID using Firestore's doc().id pattern but without writing:
  try {
    const ref = doc(collection(db, '__idgen__'));
    return ref.id;
  } catch (e) {
    // fallback: reasonably unique client-side id
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8);
  }
}

/* ---------- Persistence helpers using transactions ---------- */

/**
 * Transactionally add an item to the grocery list (array of maps)
 * Ensures we do a read/modify/write in a transaction to reduce overwrite races.
 * Writes the following item map:
 * { id, name, quantity, price, priceCents, currency, createdAt, updatedAt }
 */
async function txAddGroceryItem(item) {
  if (!profileDocRef) throw new Error('profileDocRef missing');

  // runTransaction returns the value returned from the transaction function;
  // we return the created item so caller can reconcile optimistic previews if needed.
  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(profileDocRef);
    let data = snap.exists() ? snap.data() : null;

    // initialize data shape if missing (don't write yet)
    if (!data) {
      data = {
        groceryLists: [],
        pantryItems: [],
        customIngredients: []
      };
    }

    // normalize arrays
    data.groceryLists = data.groceryLists || [];

    // ensure active list exists
    if (!data.groceryLists[activeGroceryListIndex]) {
      data.groceryLists[activeGroceryListIndex] = {
        id: genId(),
        name: 'Default',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        currency: '$',
        items: []
      };
    }

    const list = data.groceryLists[activeGroceryListIndex];
    list.items = list.items || [];

    // robust price handling: allow 0, null if absent
    const price = (item.price !== undefined && item.price !== null && item.price !== '') ? Number(item.price) : null;
    const priceCents = (price != null) ? Math.round(price * 100) : null;

    const newItem = {
      id: genId(),
      name: (item.name || '').trim(),
      quantity: Number(item.quantity || 1),
      price: price,                      // null or a number (0 allowed)
      priceCents: priceCents,            // null or integer cents
      currency: item.currency || list.currency || '$',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    list.items.push(newItem);
    list.updatedAt = serverTimestamp();

    // Single write: if the doc already existed -> update, else set (merge)
    if (snap.exists()) {
      tx.update(profileDocRef, {
        groceryLists: data.groceryLists,
        updatedAt: serverTimestamp()
      });
    } else {
      // ensure other top-level arrays exist when creating the doc
      tx.set(profileDocRef, {
        groceryLists: data.groceryLists,
        pantryItems: data.pantryItems || [],
        customIngredients: data.customIngredients || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    // return the created item for caller's convenience
    return newItem;
  });
}


/**
 * Transactionally add pantry item:
 * { id, name, quantity, price, priceCents, currency, createdAt, updatedAt, expirationDate? }
 */
async function txAddPantryItem(item) {
  if (!profileDocRef) throw new Error('profileDocRef missing');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(profileDocRef);
    let data = snap.exists() ? snap.data() : null;
    if (!data) {
      data = {
        groceryLists: [],
        pantryItems: [],
        customIngredients: []
      };
      tx.set(profileDocRef, data, { merge: true });
    }
    data.pantryItems = data.pantryItems || [];
    const price = (typeof item.price === 'number') ? item.price : (item.price ? Number(item.price) : 0);
    const priceCents = Math.round((price || 0) * 100);
    const newItem = {
      id: genId(),
      name: (item.name || '').trim(),
      quantity: Number(item.quantity || 1),
      price: price || null,
      priceCents: price != null ? priceCents : null,
      currency: item.currency || '$',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    if (item.expirationDate) newItem.expirationDate = item.expirationDate; // store Date or string (Firestore will accept JS Date)
    data.pantryItems.push(newItem);
    tx.update(profileDocRef, { pantryItems: data.pantryItems });
  });
}

/**
 * Transactionally add a custom ingredient to customIngredients array:
 * { name, quantity, price, calories? }
 */
async function txAddCustomIngredient(ci) {
  if (!profileDocRef) throw new Error('profileDocRef missing');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(profileDocRef);
    let data = snap.exists() ? snap.data() : null;
    if (!data) {
      data = { groceryLists: [], pantryItems: [], customIngredients: [] };
      tx.set(profileDocRef, data, { merge: true });
    }
    data.customIngredients = data.customIngredients || [];
    const newCI = {
      name: (ci.name || '').trim(),
      quantity: Number(ci.quantity || 1),
      price: ci.price != null ? Number(ci.price) : null,
      calories: ci.calories != null ? Number(ci.calories) : undefined
    };
    data.customIngredients.push(newCI);
    tx.update(profileDocRef, { customIngredients: data.customIngredients });
  });
}

/* ---------- Drag helpers (unchanged) ---------- */
function makeDraggableRow(tr, kind, idx) {
  tr.setAttribute('draggable', 'true');
  tr.dataset.kind = kind;
  tr.dataset.idx = String(idx);
  tr.addEventListener('dragstart', (ev) => {
    if (!currentUser) { ev.preventDefault(); return alert('Sign in to move items between lists'); }
    const payload = JSON.stringify({ kind, idx });
    try { ev.dataTransfer.setData('application/json', payload); } catch(e) {}
    ev.dataTransfer.effectAllowed = 'move';
    try { ev.dataTransfer.setData('text/plain', escapeHTML((tr.textContent || '').trim().slice(0, 200))); } catch(e){}
    if (groceriesBox) groceriesBox.classList.add('drag-target');
    if (pantryBox) pantryBox.classList.add('drag-target');
  });
  tr.addEventListener('dragend', () => {
    if (groceriesBox) groceriesBox.classList.remove('drag-target');
    if (pantryBox) pantryBox.classList.remove('drag-target');
  });
}

/* ---------- render/clear UI (keeps your existing renderers) ---------- */
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
  if (!items.length) return groceriesBody.innerHTML = '<tr><td colspan="5" class="small">No grocery items</td></tr>';
  items.forEach((it, idx) => {
    const purchasedClass = it.purchased ? 'style="text-decoration:line-through; opacity:.7;"' : '';
    const currency = it.currency || '$';
    const priceDisplay = (it.price != null) ? formatCurrency(it.price, currency) : '-';
    const created = convertMaybeTimestamp(it.createdAt) || null;
    const createdText = created ? (' • ' + formatDate(created)) : '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td ${purchasedClass}>
        <label style="display:flex;align-items:center;gap:10px;">
          <input type="checkbox" data-idx="${idx}" class="chk-bought" ${it.purchased ? 'checked' : ''} />
          <span>${escapeHTML(it.name)}</span>
        </label>
      </td>
      <td ${purchasedClass}>${it.quantity ?? 1}</td>
      <td ${purchasedClass}>${escapeHTML(currency)}</td>
      <td ${purchasedClass}>${priceDisplay}${createdText}</td>
      <td class="actions">
        <button data-idx="${idx}" class="btn btn-edit btn-edit-row" type="button">Edit</button>
        <button data-idx="${idx}" class="btn btn-move" type="button">&gt;</button>
        <button data-idx="${idx}" class="btn btn-delete" type="button">X</button>
      </td>
    `;
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
    const created = convertMaybeTimestamp(it.createdAt) || null;
    const createdText = created ? (' • ' + formatDate(created)) : '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHTML(it.name)}</td>
      <td>${it.quantity ?? 1}</td>
      <td>${exp}${createdText}</td>
      <td class="actions">
        <button data-idx="${idx}" class="btn btn-edit btn-edit-pantry" type="button">Edit</button>
        <button data-idx="${idx}" class="btn btn-muted btn-delete-pantry" type="button">Delete</button>
      </td>
    `;
    makeDraggableRow(tr, 'pantry', idx);
    pantryBody.appendChild(tr);
  });
  pantryBody.querySelectorAll('.btn-edit-pantry').forEach(btn => btn.addEventListener('click', onEditPantry));
  pantryBody.querySelectorAll('.btn-delete-pantry').forEach(btn => btn.addEventListener('click', onDeletePantry));
}

/* ---------- Event handlers (Add) ---------- */
if (addGroceryBtn) addGroceryBtn.type = 'button';
if (addPantryBtn) addPantryBtn.type = 'button';
if (modalSave) modalSave.type = 'button';
if (modalCancel) modalCancel.type = 'button';

async function handleAddGrocery(e) {
  if (!currentUser) return alert('Sign in to add items');
  e && e.preventDefault && e.preventDefault();

  const name = gName?.value?.trim();
  if (!name) return alert('Enter a name');

  const qty = Number(gQty?.value) || 1;
  const price = (gPrice && gPrice.value !== '') ? Number(gPrice.value) : null;
  const currency = (gCurrency && gCurrency.value) || '$';

  // Local optimistic push so UI reflects quickly
  profileData = profileData || {};
  profileData.groceryLists = profileData.groceryLists || [{ id: genId(), name:'Default', items: [] }];
  const list = profileData.groceryLists[activeGroceryListIndex] || profileData.groceryLists[0];
  list.items = list.items || [];
  // create a local preview item (no server timestamps)
  const previewItem = {
    id: genId(),
    name,
    quantity: qty,
    price: price,
    priceCents: price != null ? Math.round(price * 100) : null,
    currency,
    createdAt: new Date(), // local placeholder
    updatedAt: new Date()
  };
  list.items.push(previewItem);
  renderAll();

  // now persist using transaction
  try {
    await txAddGroceryItem({ name, quantity: qty, price, currency });
    console.log('Grocery item added to Firestore');
  } catch (err) {
    console.error('Failed to add grocery item transactionally', err);
    alert('Could not save grocery item. Check console for details.');
    // Optionally: revert preview or mark as unsynced
  }

  if (gName) gName.value = '';
  if (gQty) gQty.value = 1;
  if (gPrice) gPrice.value = '';
}
if (addGroceryBtn) addGroceryBtn.addEventListener('click', handleAddGrocery);
if (addGroceryForm) addGroceryForm.addEventListener('submit', handleAddGrocery);

async function handleAddPantry(e) {
  if (!currentUser) return alert('Sign in to add pantry items');
  e && e.preventDefault && e.preventDefault();

  const name = pName?.value?.trim();
  if (!name) return alert('Enter a name');
  const qty = Number(pQty?.value) || 1;
  const expirationDate = pExp && pExp.value ? new Date(pExp.value) : null;
  const price = null;
  const currency = '$';

  // optimistic local push
  profileData = profileData || {};
  profileData.pantryItems = profileData.pantryItems || [];
  const preview = {
    id: genId(),
    name,
    quantity: qty,
    price: price,
    priceCents: price != null ? Math.round(price*100) : null,
    currency,
    expirationDate: expirationDate || null,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  profileData.pantryItems.push(preview);
  renderAll();

  try {
    await txAddPantryItem({ name, quantity: qty, expirationDate, price, currency });
    console.log('Pantry item added to Firestore');
  } catch (err) {
    console.error('Failed to add pantry item', err);
    alert('Could not save pantry item. Check console.');
  }

  if (pName) pName.value = '';
  if (pQty) pQty.value = 1;
  if (pExp) pExp.value = '';
}
if (addPantryBtn) addPantryBtn.addEventListener('click', handleAddPantry);
if (addPantryForm) addPantryForm.addEventListener('submit', handleAddPantry);

/* ---------- modal custom save ---------- */
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

if (modalSave) modalSave.addEventListener('click', async () => {
  if (!editingContext) { setModalVisible(false); return; }
  const t = editingContext;
  const name = (cName?.value?.trim() || '');
  if (!name) return alert('Enter a name');
  const qty = Number(cQty?.value || 1);
  const price = (cPrice && cPrice.value !== '') ? Number(cPrice.value) : null;

  if (t.type === 'custom') {
    // optimistic local push
    profileData = profileData || {};
    profileData.customIngredients = profileData.customIngredients || [];
    profileData.customIngredients.push({ name, quantity: qty, price });
    renderAll();

    try {
      await txAddCustomIngredient({ name, quantity: qty, price });
      console.log('Custom ingredient saved');
    } catch (err) {
      console.error('Failed to save custom ingredient', err);
      alert('Could not save custom ingredient.');
    }
  } else {
    // other edit branches you already had could be adapted to transactions if needed
  }
/* ---------- simple debounced save helpers (add these) ---------- */
let _pendingSaveTimer = null;
async function _doSaveToFirestore() {
  if (!profileDocRef || !profileData) return;
  try {
    await updateDoc(profileDocRef, {
      groceryLists: profileData.groceryLists || [],
      pantryItems: profileData.pantryItems || [],
      customIngredients: profileData.customIngredients || [],
      aiSuggestionsEnabled: !!profileData.aiSuggestionsEnabled,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    // fallback: setDoc with merge if update fails
    try {
      await setDoc(profileDocRef, {
        groceryLists: profileData.groceryLists || [],
        pantryItems: profileData.pantryItems || [],
        customIngredients: profileData.customIngredients || [],
        aiSuggestionsEnabled: !!profileData.aiSuggestionsEnabled,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error('Save to Firestore failed', e);
      throw e;
    }
  }
}

function scheduleSave() {
  if (!profileDocRef || profileData == null) return;
  if (_pendingSaveTimer) clearTimeout(_pendingSaveTimer);
  _pendingSaveTimer = setTimeout(() => {
    _pendingSaveTimer = null;
    _doSaveToFirestore().catch(e => console.error('Scheduled save error', e));
  }, 350);
}

async function saveNow() {
  if (_pendingSaveTimer) { clearTimeout(_pendingSaveTimer); _pendingSaveTimer = null; }
  return _doSaveToFirestore();
}
  
  scheduleSave();
  await saveNow().catch(()=>{});
  setModalVisible(false);
  editingContext = null;
  renderAll();
});

/* ---------- Edit/Delete/Move/Toggles (kept local+scheduled) ---------- */
/* For edits/deletes/moves I retained your scheduleSave/saveNow flow for simplicity.
   If you want every edit/delete/move to be transactional, we can convert them to runTransaction updates similarly.
*/

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
  const p = { id: genId(), name: item.name, quantity: item.quantity || 1, price: item.price ?? null, priceCents: item.price ? Math.round(item.price*100) : null, currency: item.currency || '$', createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
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
  if (it.purchased) it.purchasedAt = new Date(); else delete it.purchasedAt;
  scheduleSave(); saveNow(); renderAll();
}

/* ---------- Drag/drop on boxes ---------- */
function parseDragData(ev) { try { const raw = ev.dataTransfer.getData('application/json') || ev.dataTransfer.getData('text/plain'); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
async function handleDropOnBox(ev, targetKind) {
  ev.preventDefault();
  if (!currentUser) return alert('Sign in to move items');
  const payload = parseDragData(ev);
  if (!payload || typeof payload.kind !== 'string' || payload.idx == null) return;
  const srcKind = payload.kind;
  const srcIdx = Number(payload.idx);
  if (srcKind === targetKind) { if (groceriesBox) groceriesBox.classList.remove('drag-target'); if (pantryBox) pantryBox.classList.remove('drag-target'); return; }

  if (srcKind === 'grocery' && targetKind === 'pantry') {
    const list = profileData.groceryLists[activeGroceryListIndex];
    if (!list || !list.items || !list.items[srcIdx]) return;
    const item = list.items.splice(srcIdx,1)[0];
    // optimistic local update
    profileData.pantryItems = profileData.pantryItems || [];
    profileData.pantryItems.push({ id: genId(), name: item.name, quantity: item.quantity || 1, price: item.price ?? null, priceCents: item.price ? Math.round(item.price*100) : null, currency: item.currency || '$', createdAt: new Date(), updatedAt: new Date() });
    renderAll();
    // persist (for simplicity, reusing scheduleSave)
    scheduleSave(); await saveNow().catch(()=>{});
  }

  if (srcKind === 'pantry' && targetKind === 'grocery') {
    if (!profileData.pantryItems || !profileData.pantryItems[srcIdx]) return;
    const pitem = profileData.pantryItems.splice(srcIdx,1)[0];
    profileData.groceryLists = profileData.groceryLists || [{ id: genId(), name:'Default', items: [] }];
    profileData.groceryLists[activeGroceryListIndex].items.push({ id: genId(), name: pitem.name, quantity: pitem.quantity || 1, price: pitem.price ?? null, priceCents: pitem.price ? Math.round(pitem.price*100) : null, currency: pitem.currency || '$', createdAt: new Date(), updatedAt: new Date() });
    renderAll();
    scheduleSave(); await saveNow().catch(()=>{});
  }

  if (groceriesBox) groceriesBox.classList.remove('drag-target');
  if (pantryBox) pantryBox.classList.remove('drag-target');
}
if (groceriesBox) { groceriesBox.addEventListener('dragover', (e) => e.preventDefault()); groceriesBox.addEventListener('drop', (e) => handleDropOnBox(e, 'grocery')); }
if (pantryBox) { pantryBox.addEventListener('dragover', (e) => e.preventDefault()); pantryBox.addEventListener('drop', (e) => handleDropOnBox(e, 'pantry')); }

/* ---------- Auth observer & profile realtime ---------- */
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

  // Hide local sign-in (we assume header handles auth) and update the textual state.
if (signinBtn) signinBtn.style.display = 'none';
if (signedState) {
  signedState.textContent = currentUser ? (currentUser.displayName || currentUser.email || currentUser.uid) : 'Not signed in';
}
// If the header exposes a sign-out button, let it handle sign-out.
const headerSignout = document.getElementById('headerSignout');
if (headerSignout) headerSignout.style.display = '';

  
// Update the textual user state. The header may have its own UI, but we keep signedState accurate.
if (signedState) {
  signedState.textContent = currentUser ? (currentUser.displayName || currentUser.email || currentUser.uid) : 'Not signed in';
}

// Optional: if your header exposes a sign-out button with id="headerSignout", show it:
const headerSignout = document.getElementById('headerSignout');
if (headerSignout) {
  headerSignout.style.display = ''; // make sure it's visible
  // headerSignout should call signOut(auth) itself when clicked.
}

  // ensure users/{uid}
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
        groceryLists: [{ id: genId(), name: 'Default', items: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp(), currency: '$' }],
        pantryItems: [],
        customIngredients: [],
        aiSuggestionsEnabled: true,
        spendingHistory: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await setDoc(profileDocRef, initial);
    }
  } catch (e) {
    console.error('Could not ensure profile doc', e);
  }

  if (profileUnsub) { profileUnsub(); profileUnsub = null; }
  profileUnsub = onSnapshot(profileDocRef, (snap) => {
    if (!snap.exists()) { profileData = null; clearUI(); return; }
    profileData = snap.data();
    // normalize arrays
    profileData.groceryLists = profileData.groceryLists || [{ id: genId(), name:'Default', items: [] }];
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

// debug helpers:
window._profile = () => profileData;
window._usersDoc = () => usersDoc;
window._saveNow = () => (profileDocRef ? updateDoc(profileDocRef, { updatedAt: serverTimestamp() }) : Promise.resolve());

/* End of grocery/grocery.js */
