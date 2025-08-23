// grocery/grocery.js (updated)
// === Import Firebase v10 ===
import { initializeApp, getApps, getApp } 
  from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAnalytics } 
  from "https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js";
import { getAuth, onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider } 
  from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, doc, getDoc, setDoc, updateDoc, deleteDoc, 
  onSnapshot, serverTimestamp, query, orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/* ---------- FIREBASE CONFIG (keep your keys here) ---------- */
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

// === Init Services ===
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

/* --- DOM refs (unchanged) --- */
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

/* --- dashboard DOM ids (from your HTML) --- */
const ids = {
  bigKcal: 'bigKcal', pctTarget: 'pctTarget', topIngredient: 'topIngredient',
  distinctItems: 'distinctItems', avgKcal: 'avgKcal', budgetVal: 'budgetVal',
  lineSummary: 'lineSummary', totalMonthCalories: 'totalMonthCalories',
  avgPerDay: 'avgPerDay', nutriScore: 'nutriScore', itemsLoaded: 'itemsLoaded',
  spentVal: 'spentVal', spendFruits: 'spendFruits', spendVeg: 'spendVeg',
  spendProt: 'spendProt', budgetMain: 'budgetMain', shoppingCount: 'shoppingCount'
};

/* --- state --- */
let currentUser = null;
let profileDocRef = null;
let profileData = null;
let activeGroceryListIndex = 0;
let editingContext = null; // {type:'grocery'|'pantry', idx}

/* --- Chart holders --- */
let lineChart = null;
let pieChart = null;

/* ------------------- Helpers ------------------- */
function safeText(id, v){
  const el = document.getElementById(id);
  if(!el) return;
  el.textContent = (v === null || v === undefined) ? '—' : v;
}
function escapeHTML(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function formatCurrency(n) {
  if (n == null || n === '') return '-';
  return '$' + (Number(n).toFixed(2));
}
function formatCurrencyCents(amountCents){
  if(amountCents === null || amountCents === undefined) return '—';
  if(Number.isInteger(amountCents) && Math.abs(amountCents) > 1000) return '$' + (amountCents/100).toFixed(2);
  return '$' + Number(amountCents).toFixed(2);
}
function parseCals(val){
  if(val === undefined || val === null) return 0;
  if(typeof val === 'number') return val;
  const m = (''+val).match(/([0-9]+\.?[0-9]*)/);
  return m ? parseFloat(m[1]) : 0;
}
function formatDate(d) {
  if (!d) return '-';
  const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0');
  return `${m}-${day}-${String(y).slice(-2)}`;
}
function convertMaybeTimestamp(v) {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate();
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  if (v instanceof Date) return v;
  return null;
}

/* ------------- Chart rendering ------------- */
function renderLineChart(names, values){
  const canvas = document.getElementById('lineChart');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  if(lineChart) lineChart.destroy();
  lineChart = new Chart(ctx, {
    type: 'line',
    data: { labels: names, datasets: [{ label:'kcal / 100g', data: values, borderColor:'#16a34a', backgroundColor:'rgba(22,163,74,0.08)', tension:0.25, pointBackgroundColor:'#16a34a', borderWidth:2, fill:true }]},
    options:{ responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true } }, plugins:{ legend:{ display:false } } }
  });
}
function renderPieChart(agg){
  const canvas = document.getElementById('pieChart');
  if(!canvas) return;
  const labels = Object.keys(agg);
  const data = labels.map(l => agg[l]);
  const ctx = canvas.getContext('2d');
  if(pieChart) pieChart.destroy();
  pieChart = new Chart(ctx, {
    type:'pie',
    data:{ labels, datasets:[{ data, backgroundColor:['#16a34a','#34d399','#facc15','#60a5fa','#f97316','#a78bfa'] }]},
    options:{ plugins:{ legend:{ position:'bottom' } }, maintainAspectRatio:false }
  });
}

/* ------------- Aggregate helper ------------- */
const categoryMap = {
  'CannedFruit': 'Fruit',
  'Fruit': 'Fruit',
  'Vegetable': 'Vegetables',
  'Protein': 'Protein',
  'Grain': 'Grain',
  'Carb': 'Carbs'
};
function aggregateByCategory(items){
  const agg = {};
  items.forEach(it=>{
    const raw = it.category || it.FoodCategory || it.type || 'Other';
    const cat = categoryMap[raw] || raw || 'Other';
    const c = parseCals(it.calories || it.Cals_per100grams || it.kcal || 0);
    agg[cat] = (agg[cat] || 0) + c;
  });
  return agg;
}

/* --------- Auth handlers (unchanged) --------- */
signinBtn.addEventListener('click', async () => {
  const provider = new GoogleAuthProvider();
  try { await signInWithPopup(auth, provider); }
  catch (e) { alert('Sign-in failed: ' + e.message); console.error(e); }
});
signoutBtn.addEventListener('click', async () => {
  await signOut(auth);
});

/* observe auth state */
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    signedState.textContent = user.displayName || user.email || user.uid;
    signinBtn.style.display = 'none';
    signoutBtn.style.display = '';
    profileDocRef = doc(db, 'profiles', user.uid);
    await loadOrCreateProfile();
    await updateDashboardUI();   // <-- populate dashboard values now that profileData exists
    renderAll();
  } else {
    signedState.textContent = 'Not signed in';
    signinBtn.style.display = '';
    signoutBtn.style.display = 'none';
    profileDocRef = null;
    profileData = null;
    clearUI();
    // clear dashboard placeholders
    Object.values(ids).forEach(id => safeText(id, '—'));
    if(lineChart){ lineChart.destroy(); lineChart = null; }
    if(pieChart){ pieChart.destroy(); pieChart = null; }
  }
});

/* --- profile load/create --- */
async function loadOrCreateProfile() {
  const snap = await getDoc(profileDocRef);
  if (!snap.exists()) {
    // use serverTimestamp for createdAt
    const initial = {
      groceryLists: [{ name: 'Default', items: [], createdAt: serverTimestamp() }],
      pantryItems: [],
      customIngredients: [],
      aiSuggestionsEnabled: true
    };
    try {
      await setDoc(profileDocRef, initial);
      // read back to have consistent types
      const fresh = await getDoc(profileDocRef);
      profileData = fresh.exists() ? fresh.data() : initial;
    } catch(e){
      console.error('Error creating profile doc', e);
      profileData = initial;
    }
  } else {
    profileData = snap.data();
    profileData.groceryLists = profileData.groceryLists || [{ name:'Default', items:[], createdAt: serverTimestamp() }];
    profileData.pantryItems = profileData.pantryItems || [];
    profileData.customIngredients = profileData.customIngredients || [];
  }
}

/* --- save (debounced) --- */
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
    // refresh dashboard UI so charts reflect saved changes
    try { await updateDashboardUI(); } catch(e){ console.error('updateDashboardUI after save failed', e); }
  }, 350);
}

/* --- renderers (unchanged) --- */
function clearUI() {
  if(groceriesBody) groceriesBody.innerHTML = '<tr><td colspan="4" class="small">Sign in to see your lists</td></tr>';
  if(pantryBody) pantryBody.innerHTML = '<tr><td colspan="4" class="small">Sign in to see your pantry</td></tr>';
}

function renderAll() {
  const list = (profileData && profileData.groceryLists && profileData.groceryLists[activeGroceryListIndex]) || { name:'Default', items:[] };
  renderGroceries(list.items || []);
  renderPantry(profileData ? (profileData.pantryItems || []) : []);
  signedState.textContent = currentUser ? (currentUser.displayName || currentUser.email) : 'Not signed in';
}

function renderGroceries(items) {
  if(!groceriesBody) return;
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

function renderPantry(items) {
  if(!pantryBody) return;
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

/* --- actions (unchanged) --- */
// Add grocery
addGroceryBtn?.addEventListener('click', () => {
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
addPantryBtn?.addEventListener('click', () => {
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

// Custom ingredient -> groceries list
customAddBtn?.addEventListener('click', () => {
  if (!currentUser) return alert('Sign in to add custom ingredients');
  const name = customName.value && customName.value.trim();
  if (!name) return alert('Enter a name');
  const qty = Number(customQty.value) || 1;
  const price = customPrice.value !== '' ? Number(customPrice.value) : null;
  const calories = customCalories.value !== '' ? Number(customCalories.value) : null;

  const item = { name, quantity: qty, price, calories };
  const list = profileData.groceryLists[activeGroceryListIndex];
  list.items = list.items || [];
  list.items.push(item);

  // keep optional record in customIngredients too
  profileData.customIngredients = profileData.customIngredients || [];
  profileData.customIngredients.push({ name, quantity: qty, price, calories });

  scheduleSave();
  renderAll();
  customName.value=''; customQty.value=''; customPrice.value=''; customCalories.value='';
  try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
});

// Edit / Delete / Move grocery handlers
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
  scheduleSave(); renderAll();
}
function onMoveToPantry(e) {
  const idx = Number(e.currentTarget.dataset.idx);
  const list = profileData.groceryLists[activeGroceryListIndex];
  const item = list.items.splice(idx,1)[0];
  const p = { name: item.name, quantity: item.quantity || 1 };
  profileData.pantryItems = profileData.pantryItems || [];
  profileData.pantryItems.push(p);
  scheduleSave(); renderAll();
}

// Edit pantry
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
  scheduleSave(); renderAll();
}

/* --- modal (unchanged) --- */
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
  scheduleSave(); closeModal(); renderAll();
});

window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

// initial
clearUI();

/* ----- Dashboard integration: compute and populate dashboard UI ----- */
async function updateDashboardUI(){
  if(!profileData) return;
  // source preference: customIngredients -> pantryItems -> groceryLists[].items
  let ingredients = [];
  if(Array.isArray(profileData.customIngredients) && profileData.customIngredients.length){
    ingredients = profileData.customIngredients.map(i=>({
      name: i.name || i.item || 'item',
      calories: i.calories ?? i.Cals_per100grams ?? 0,
      category: i.category || i.FoodCategory || 'Other'
    }));
  } else if(Array.isArray(profileData.pantryItems) && profileData.pantryItems.length){
    ingredients = profileData.pantryItems.map(i=>({
      name: i.name || i.item || 'item',
      calories: i.calories ?? i.Cals_per100grams ?? 0,
      category: i.category || i.FoodCategory || 'Other'
    }));
  } else if(Array.isArray(profileData.groceryLists) && profileData.groceryLists.length){
    profileData.groceryLists.forEach(list=>{
      if(Array.isArray(list.items)){
        list.items.forEach(it => ingredients.push({
          name: it.name || it.item || 'item',
          calories: it.calories ?? it.cal_per_100g ?? 0,
          category: it.category || it.FoodCategory || 'Other'
        }));
      }
    });
  } else {
    ingredients = [];
  }

  const cleaned = ingredients.filter(i => i && i.name);
  const names = cleaned.map(i => i.name);
  const calsArray = cleaned.map(i => parseCals(i.calories));
  const totalKcal = calsArray.reduce((s,x)=>s + (Number.isFinite(x) ? x : 0), 0);
  const avg = Math.round((calsArray.length ? totalKcal / calsArray.length : 0));
  const monthlyEstimate = Math.round(avg * 30);
  const topIngredient = cleaned.reduce((a,b)=> parseCals(b.calories) > parseCals(a.calories) ? b : a, cleaned[0] || {name:'—'});
  const agg = aggregateByCategory(cleaned);
  const proteinShare = agg['Protein'] || 0;
  const nutriScore = cleaned.length ? Math.round((proteinShare / (totalKcal || 1)) * 100) : 0;

  // spending
  let spendTotal = null;
  if(Array.isArray(profileData.spendingHistory) && profileData.spendingHistory.length){
    const amounts = profileData.spendingHistory.map(s => s.amount || 0);
    const median = amounts.slice().sort((a,b)=>a-b)[Math.floor(amounts.length/2)] || 0;
    if(Math.abs(median) > 1000 && amounts.every(a => Number.isInteger(a))){
      spendTotal = formatCurrencyCents(amounts.reduce((s,a)=>s+a,0));
    } else {
      spendTotal = '$' + (amounts.reduce((s,a)=>s + Number(a||0),0)).toFixed(2);
    }
  }

  // write UI
  safeText(ids.bigKcal, totalKcal ? (totalKcal + ' kcal') : '-- kcal');
  safeText(ids.pctTarget, (profileData.nutritionGoals && profileData.nutritionGoals.calories) ? Math.round((profileData.nutritionGoals.calories / 2000) * 100) + '% of 2000kcal' : '-- of daily target');
  safeText(ids.topIngredient, (topIngredient && (topIngredient.name || topIngredient.FoodItem)) || '—');
  safeText(ids.distinctItems, cleaned.length || '—');
  safeText(ids.avgKcal, avg ? (avg + ' kcal') : '-- kcal');

  if(profileData.monthlyBudget !== undefined && profileData.monthlyBudget !== null){
    if(Number.isInteger(profileData.monthlyBudget) && Math.abs(profileData.monthlyBudget) > 1000) safeText(ids.budgetVal, formatCurrencyCents(profileData.monthlyBudget));
    else safeText(ids.budgetVal, '$' + Number(profileData.monthlyBudget).toFixed(2));
    if(Number.isInteger(profileData.monthlyBudget) && Math.abs(profileData.monthlyBudget) > 1000) safeText(ids.budgetMain, formatCurrencyCents(profileData.monthlyBudget));
    else safeText(ids.budgetMain, '$' + (profileData.monthlyBudget || 0));
  } else {
    safeText(ids.budgetVal, '—'); safeText(ids.budgetMain, '—');
  }

  safeText(ids.lineSummary, totalKcal ? (totalKcal + ' kcal') : '-- kcal');
  safeText(ids.totalMonthCalories, monthlyEstimate ? (monthlyEstimate + ' kcal') : '-- kcal');
  safeText(ids.avgPerDay, avg ? (avg + ' kcal') : '-- kcal');
  safeText(ids.nutriScore, (isFinite(nutriScore) ? (Math.max(0, Math.min(100,nutriScore)) + '%') : '--%'));
  safeText(ids.itemsLoaded, cleaned.length || 0);
  safeText(ids.spentVal, spendTotal || '—');

  if(profileData.spendByCategory){
    safeText(ids.spendFruits, profileData.spendByCategory.fruits ? (profileData.spendByCategory.fruitsDisplay || formatCurrencyCents(profileData.spendByCategory.fruits)) : '—');
    safeText(ids.spendVeg, profileData.spendByCategory.vegetables ? (profileData.spendByCategory.vegetablesDisplay || formatCurrencyCents(profileData.spendByCategory.vegetables)) : '—');
    safeText(ids.spendProt, profileData.spendByCategory.protein ? (profileData.spendByCategory.proteinDisplay || formatCurrencyCents(profileData.spendByCategory.protein)) : '—');
  } else {
    safeText(ids.spendFruits, '—'); safeText(ids.spendVeg, '—'); safeText(ids.spendProt, '—');
  }

  safeText(ids.shoppingCount, Array.isArray(profileData.groceryLists) ? profileData.groceryLists.length : '—');

  // render charts
  renderLineChart(names, calsArray);
  renderPieChart(agg);
}

/* debug helpers */
window._profile = () => profileData;
window._saveNow = () => scheduleSave();
