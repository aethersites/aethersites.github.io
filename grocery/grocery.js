
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, addDoc, doc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// UI refs
const signinBtn = document.getElementById('signinBtn');
const signoutBtn = document.getElementById('signoutBtn');
const signedState = document.getElementById('signedState');

const groceriesBody = document.getElementById('groceriesBody');
const pantryBody = document.getElementById('pantryBody');

const addGroceryBtn = document.getElementById('addGroceryBtn');
const gName = document.getElementById('gName');
const gQty = document.getElementById('gQty');
const gPrice = document.getElementById('gPrice');

const addPantryBtn = document.getElementById('addPantryBtn');
const pName = document.getElementById('pName');
const pQty = document.getElementById('pQty');
const pExp = document.getElementById('pExp');

const customAddBtn = document.getElementById('customAddBtn');
const customName = document.getElementById('customName');
const customQty = document.getElementById('customQty');
const customPrice = document.getElementById('customPrice');
const customCalories = document.getElementById('customCalories');

const modalBackdrop = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const mName = document.getElementById('mName');
const mQty = document.getElementById('mQty');
const mPrice = document.getElementById('mPrice');
const modalSave = document.getElementById('modalSave');
const modalCancel = document.getElementById('modalCancel');

// state
let currentUser = null;
let profileDocRef = null;
let profileData = null;
let activeGroceryListIndex = 0;
let editingContext = null;

signinBtn.addEventListener('click', async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    alert('Sign-in failed: ' + e.message);
    console.error(e);
  }
});
signoutBtn.addEventListener('click', async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    signedState.textContent = user.displayName || user.email || user.uid;
    signinBtn.style.display = 'none';
    signoutBtn.style.display = '';
    profileDocRef = doc(db, 'profiles', user.uid);
    await loadOrCreateProfile();
    renderAll();
  } else {
    signedState.textContent = 'Not signed in';
    signinBtn.style.display = '';
    signoutBtn.style.display = 'none';
    profileDocRef = null;
    profileData = null;
    clearUI();
  }
});

async function loadOrCreateProfile() {
  const snap = await getDoc(profileDocRef);
  if (!snap.exists()) {
    const initial = {
      groceryLists: [{ name: 'Default', items: [], createdAt: new Date() }],
      pantryItems: [],
      customIngredients: [],
      aiSuggestionsEnabled: true
    };
    await setDoc(profileDocRef, initial);
    profileData = initial;
  } else {
    profileData = snap.data();
    profileData.groceryLists = profileData.groceryLists || [{ name:'Default', items:[], createdAt:new Date() }];
    profileData.pantryItems = profileData.pantryItems || [];
    profileData.customIngredients = profileData.customIngredients || [];
  }
}

// debounce save
let pendingSave = null;
function scheduleSave() {
  if (pendingSave) clearTimeout(pendingSave);
  pendingSave = setTimeout(async () => {
    pendingSave = null;
    if (!profileDocRef) return;
    try {
      await updateDoc(profileDocRef, {
        groceryLists: profileData.groceryLists,
        pantryItems: profileData.pantryItems,
        customIngredients: profileData.customIngredients,
        aiSuggestionsEnabled: !!profileData.aiSuggestionsEnabled
      });
    } catch (e) {
      console.error('Save failed', e);
      try { await setDoc(profileDocRef, profileData, { merge: true }); } catch (e2) { console.error(e2); }
    }
  }, 350);
}

function clearUI() {
  groceriesBody.innerHTML = '<tr><td colspan="4" class="small">Sign in to see your lists</td></tr>';
  pantryBody.innerHTML = '<tr><td colspan="4" class="small">Sign in to see your pantry</td></tr>';
}

function renderAll() {
  const list = (profileData.groceryLists && profileData.groceryLists[activeGroceryListIndex]) || { name:'Default', items:[] };
  renderGroceries(list.items || []);
  renderPantry(profileData.pantryItems || []);
  document.getElementById('signedState').textContent = currentUser ? (currentUser.displayName || currentUser.email) : 'Not signed in';
}

function renderGroceries(items) {
  groceriesBody.innerHTML = '';
  if (!items.length) {
    groceriesBody.innerHTML = '<tr><td colspan="4" class="small">No grocery items</td></tr>';
    return;
  }
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

function renderPantry(items) {
  pantryBody.innerHTML = '';
  if (!items.length) {
    pantryBody.innerHTML = '<tr><td colspan="4" class="small">No pantry items</td></tr>';
    return;
  }
  items.forEach((it, idx) => {
    const exp = it.expirationDate ? formatDate(new Date(it.expirationDate.seconds ? it.expirationDate.toMillis() : it.expirationDate)) : '-';
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

function escapeHTML(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function formatCurrency(n) {
  if (n == null || n === '') return '-';
  return '$' + (Number(n).toFixed(2));
}
function formatDate(d) {
  if (!d) return '-';
  const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0');
  return `${m}-${day}-${String(y).slice(-2)}`;
}

// Add grocery
addGroceryBtn.addEventListener('click', () => {
  if (!currentUser) return alert('Sign in to add items');
  const name = gName.value && gName.value.trim();
  if (!name) return alert('Enter a name');
  const qty = Number(gQty.value) || 1;
  const price = gPrice.value !== '' ? Number(gPrice.value) : null;
  const item = { name, quantity: qty, price };
  const list = profileData.groceryLists[activeGroceryListIndex];
  list.items = list.items || [];
  list.items.push(item);
  scheduleSave();
  renderAll();
  gName.value = ''; gQty.value = 1; gPrice.value = '';
});

// Add pantry
addPantryBtn.addEventListener('click', () => {
  if (!currentUser) return alert('Sign in to add pantry items');
  const name = pName.value && pName.value.trim();
  if (!name) return alert('Enter a name');
  const qty = Number(pQty.value) || 1;
  const expirationDate = pExp.value ? new Date(pExp.value) : null;
  const item = { name, quantity: qty };
  if (expirationDate) item.expirationDate = expirationDate;
  profileData.pantryItems = profileData.pantryItems || [];
  profileData.pantryItems.push(item);
  scheduleSave();
  renderAll();
  pName.value=''; pQty.value=1; pExp.value='';
});

// Custom ingredient now adds to groceries list
customAddBtn.addEventListener('click', () => {
  if (!currentUser) return alert('Sign in to add custom ingredients');
  const name = customName.value && customName.value.trim();
  if (!name) return alert('Enter a name');
  const qty = Number(customQty.value) || 1;
  const price = customPrice.value !== '' ? Number(customPrice.value) : null;
  const calories = customCalories.value !== '' ? Number(customCalories.value) : null;

  // push into groceries list (so it's managed like other grocery items)
  const item = { name, quantity: qty, price, calories };
  const list = profileData.groceryLists[activeGroceryListIndex];
  list.items = list.items || [];
  list.items.push(item);
  // keep also in customIngredients optionally (keeps legacy data)
  profileData.customIngredients = profileData.customIngredients || [];
  profileData.customIngredients.push({ name, quantity: qty, price, calories });

  scheduleSave();
  renderAll();
  customName.value=''; customQty.value=''; customPrice.value=''; customCalories.value='';
  // small UX ack
  alert('Custom ingredient added to Groceries list');
});

// Edit grocery
function onEditGrocery(e) {
  const idx = Number(e.currentTarget.dataset.idx);
  const list = profileData.groceryLists[activeGroceryListIndex];
  const item = list.items[idx];
  editingContext = { type:'grocery', idx };
  openModal('Edit Grocery Item', item.name, item.quantity, item.price);
}
function onDeleteGrocery(e) {
  const idx = Number(e.currentTarget.dataset.idx);
  if (!confirm('Delete this grocery item?')) return;
  const list = profileData.groceryLists[activeGroceryListIndex];
  list.items.splice(idx,1);
  scheduleSave();
  renderAll();
}
function onMoveToPantry(e) {
  const idx = Number(e.currentTarget.dataset.idx);
  const list = profileData.groceryLists[activeGroceryListIndex];
  const item = list.items.splice(idx,1)[0];
  const p = { name: item.name, quantity: item.quantity || 1 };
  profileData.pantryItems = profileData.pantryItems || [];
  profileData.pantryItems.push(p);
  scheduleSave();
  renderAll();
}

// Edit pantry handlers
function onEditPantry(e) {
  const idx = Number(e.currentTarget.dataset.idx);
  const item = profileData.pantryItems[idx];
  editingContext = { type:'pantry', idx };
  openModal('Edit Pantry Item', item.name, item.quantity, item.price ?? '');
}
function onDeletePantry(e) {
  const idx = Number(e.currentTarget.dataset.idx);
  if (!confirm('Delete this pantry item?')) return;
  profileData.pantryItems.splice(idx,1);
  scheduleSave();
  renderAll();
}

// modal
function openModal(title, name='', qty='', price='') {
  modalTitle.textContent = title;
  mName.value = name || '';
  mQty.value = qty || 1;
  mPrice.value = price != null ? price : '';
  modalBackdrop.style.display='flex';
  mName.focus();
}
function closeModal() {
  modalBackdrop.style.display='none';
  editingContext = null;
}
modalCancel.addEventListener('click', closeModal);

modalSave.addEventListener('click', () => {
  if (!editingContext) return closeModal();
  const name = mName.value && mName.value.trim(); if (!name) return alert('Enter a name');
  const qty = Number(mQty.value) || 1;
  const price = (mPrice.value !== '' && !isNaN(mPrice.value)) ? Number(mPrice.value) : null;

  if (editingContext.type === 'grocery') {
    const list = profileData.groceryLists[activeGroceryListIndex];
    const it = list.items[editingContext.idx];
    it.name = name; it.quantity = qty; it.price = price;
  } else if (editingContext.type === 'pantry') {
    const it = profileData.pantryItems[editingContext.idx];
    it.name = name; it.quantity = qty;
    if (mPrice.value !== '') it.price = price;
    else delete it.price;
  }
  scheduleSave();
  closeModal();
  renderAll();
});

// esc to close modal
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

clearUI();

// debugging helpers
window._profile = () => profileData;
window._saveNow = () => scheduleSave();
