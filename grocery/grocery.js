/*
  grocery.js
  - Replace firebaseConfig with your project's keys OR remove/adjust initialization if you init Firebase elsewhere.
  - Uses Firebase modular SDK from CDN (works on GitHub Pages).
*/

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, addDoc, doc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/* --------- EDIT THIS: paste your firebaseConfig from Firebase console --------- */
const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_AUTH_DOMAIN",
  projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
  // storageBucket, messagingSenderId, appId optional if you use them
};
/* --------------------------------------------------------------------------- */

/* initialize app only if not initialized already (safe for sites that init globally) */
let app;
if (getApps().length === 0) {
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

let uid = null;
let unsubGrocery = null;
let unsubPantry = null;

/* ---------- AUTH STATE ---------- */
// --- Option A: SAFE REDIRECT (replace existing onAuthStateChanged) ---
const LOGIN_PATH = '/login-form/'; // change to your actual login path if different

onAuthStateChanged(auth, (user) => {
  if (!user) {
    userDisplay.textContent = "Not signed in";

    // if we're already on the login page, don't redirect (prevents loops)
    const currentPath = window.location.pathname || '/';
    if (!currentPath.startsWith(LOGIN_PATH)) {
      // send the user to login and include a 'next' param so your login can redirect back after auth
      const next = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
      window.location.href = `${LOGIN_PATH}?next=${next}`;
    }
    return;
  }

  // user is signed in
  uid = user.uid;
  userDisplay.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px">
      <img src="${user.photoURL || ''}" style="width:30px;height:30px;border-radius:999px;object-fit:cover" />
      <strong style="font-size:14px">${(user.displayName || user.email)}</strong>
      <button id="signoutBtn" style="margin-left:10px;padding:6px 8px;border-radius:8px;border:1px solid #e6e9ef;background:#fff;cursor:pointer">Sign out</button>
    </div>`;
  document.getElementById("signoutBtn").onclick = async () => {
    await signOut(auth);
    window.location.reload();
  };

  subscribeRealtime();
});

/* ---------- UI actions ---------- */
addBtn.addEventListener("click", handleAdd);
groceryInput.addEventListener("keydown", (e) => { if (e.key === "Enter") handleAdd(); });

async function handleAdd(){
  if (!uid) return alert("Please sign in first.");
  const name = (groceryInput.value || "").trim();
  const qty = Number(groceryQty.value || 1);
  if (!name) { groceryInput.focus(); return; }

  addBtn.disabled = true;
  try {
    await addDoc(collection(db, "users", uid, "grocery"), {
      name,
      quantity: qty || 1,
      bought: false,
      createdAt: serverTimestamp()
    });
    groceryInput.value = "";
    groceryQty.value = 1;
  } catch (err) {
    console.error("Add failed", err);
    alert("Could not add item. Check console.");
  } finally {
    addBtn.disabled = false;
  }
}

/* ---------- Subscriptions ---------- */
function subscribeRealtime(){
  const gRef = collection(db, "users", uid, "grocery");
  const pRef = collection(db, "users", uid, "pantry");
  const qG = query(gRef, orderBy("createdAt", "desc"));
  const qP = query(pRef, orderBy("createdAt", "desc"));

  if (unsubGrocery) unsubGrocery();
  if (unsubPantry) unsubPantry();

  unsubGrocery = onSnapshot(qG, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderGrocery(items);
  });

  unsubPantry = onSnapshot(qP, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderPantry(items);
  });
}

/* ---------- Renderers ---------- */
function renderGrocery(items){
  groceryList.innerHTML = "";
  if (!items.length) {
    const el = document.createElement("li");
    el.className = "empty";
    el.textContent = "No groceries — add something above.";
    groceryList.appendChild(el);
    return;
  }

  for (const it of items){
    const li = document.createElement("li");
    li.className = "item";
    li.dataset.id = it.id;

    // left: checkbox + name + qty
    const left = document.createElement("div");
    left.className = "left";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!it.bought;
    cb.title = "Mark as bought";
    cb.addEventListener("change", () => toggleBought(it));

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = it.name;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `×${it.quantity || 1}`;

    left.append(cb, name, meta);

    // actions: move arrow + delete
    const actions = document.createElement("div");
    actions.className = "actions";

    const move = document.createElement("button");
    move.className = "icon-btn move-btn";
    move.title = "Move to pantry";
    move.innerHTML = `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>`;
    move.addEventListener("click", () => moveToPantryWithAnimation(li, it));

    const del = document.createElement("button");
    del.className = "icon-btn del";
    del.title = "Delete";
    del.innerHTML = `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>`;
    del.addEventListener("click", () => deleteGrocery(it.id));

    actions.append(move, del);

    if (it.bought) li.classList.add("bought");

    li.append(left, actions);
    groceryList.appendChild(li);
  }
}

function renderPantry(items){
  pantryList.innerHTML = "";
  if (!items.length) {
    const el = document.createElement("li");
    el.className = "empty";
    el.textContent = "Pantry is empty.";
    pantryList.appendChild(el);
    return;
  }

  for (const it of items){
    const li = document.createElement("li");
    li.className = "item";
    li.dataset.id = it.id;

    const left = document.createElement("div");
    left.className = "left";

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = it.name;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `×${it.quantity || 1}`;

    left.append(name, meta);

    const actions = document.createElement("div");
    actions.className = "actions";

    const out = document.createElement("button");
    out.className = "icon-btn";
    out.textContent = (it.inStock === false) ? "Refill" : "Out";
    out.addEventListener("click", () => toggleInStock(it));

    const del = document.createElement("button");
    del.className = "icon-btn del";
    del.innerHTML = `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>`;
    del.addEventListener("click", () => deletePantry(it.id));

    actions.append(out, del);

    li.append(left, actions);
    pantryList.appendChild(li);
  }
}

/* ---------- CRUD ---------- */

async function toggleBought(item){
  try {
    const ref = doc(db, "users", uid, "grocery", item.id);
    await updateDoc(ref, { bought: !item.bought });
  } catch (err) {
    console.error("toggleBought", err);
  }
}

async function deleteGrocery(id){
  try { await deleteDoc(doc(db, "users", uid, "grocery", id)); }
  catch (err) { console.error("deleteGrocery", err); alert("Delete failed"); }
}

async function deletePantry(id){
  try { await deleteDoc(doc(db, "users", uid, "pantry", id)); }
  catch (err) { console.error("deletePantry", err); alert("Delete failed"); }
}

async function toggleInStock(item){
  try {
    const ref = doc(db, "users", uid, "pantry", item.id);
    await updateDoc(ref, { inStock: !(item.inStock === undefined ? true : item.inStock) });
  } catch (err) { console.error("toggleInStock", err); }
}

/* ---------- Move with animation ---------- */
async function moveToPantryWithAnimation(liElement, item){
  // small visual feedback
  liElement.classList.add("moving");

  // short delay to show animation
  await new Promise(r => setTimeout(r, 220));

  try {
    await addDoc(collection(db, "users", uid, "pantry"), {
      name: item.name,
      quantity: item.quantity || 1,
      inStock: true,
      createdAt: serverTimestamp()
    });
    await deleteDoc(doc(db, "users", uid, "grocery", item.id));
  } catch (err) {
    console.error("moveToPantry failed", err);
    liElement.classList.remove("moving");
    alert("Move failed — see console for details.");
  }
}
