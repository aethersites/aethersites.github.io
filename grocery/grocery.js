// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, addDoc, doc,
  updateDoc, deleteDoc, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// TODO: your config
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const groceryInput = document.getElementById("groceryInput");
const groceryQty = document.getElementById("groceryQty");
const addBtn = document.getElementById("addGrocery");
const groceryList = document.getElementById("groceryList");
const pantryList = document.getElementById("pantryList");
const userDisplay = document.getElementById("userDisplay");

let uid = null;

// Auth check
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "/login-form/";
  } else {
    uid = user.uid;
    userDisplay.textContent = `👤 ${user.email}`;
    loadGroceryList();
    loadPantryList();
  }
});

// Add grocery item
async function addGrocery() {
  if (!uid || !groceryInput.value.trim()) return;
  await addDoc(collection(db, "users", uid, "grocery"), {
    name: groceryInput.value.trim(),
    quantity: Number(groceryQty.value),
    bought: false,
    createdAt: serverTimestamp(),
  });
  groceryInput.value = "";
  groceryQty.value = 1;
}
addBtn.onclick = addGrocery;
groceryInput.addEventListener("keypress", e => {
  if (e.key === "Enter") addGrocery();
});

// Grocery List
function loadGroceryList() {
  onSnapshot(collection(db, "users", uid, "grocery"), (snap) => {
    groceryList.innerHTML = "";
    snap.forEach((docSnap) => {
      const item = docSnap.data();
      const li = document.createElement("li");

      const left = document.createElement("div");
      left.className = "item-left";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = item.bought;
      checkbox.onchange = () => toggleBought(docSnap.id, item.bought);

      const span = document.createElement("span");
      span.className = "item-name";
      span.textContent = `${item.name} ×${item.quantity}`;

      left.appendChild(checkbox);
      left.appendChild(span);

      const actions = document.createElement("div");
      actions.className = "actions";

      const moveBtn = document.createElement("button");
      moveBtn.className = "action-btn";
      moveBtn.innerHTML = "➡️";
      moveBtn.title = "Move to Pantry";
      moveBtn.onclick = () => moveToPantry(docSnap.id, item);

      actions.appendChild(moveBtn);

      li.appendChild(left);
      li.appendChild(actions);
      groceryList.appendChild(li);
    });
  });
}

// Pantry List
function loadPantryList() {
  onSnapshot(collection(db, "users", uid, "pantry"), (snap) => {
    pantryList.innerHTML = "";
    snap.forEach((docSnap) => {
      const item = docSnap.data();
      const li = document.createElement("li");
      li.textContent = `${item.name} ×${item.quantity}`;
      pantryList.appendChild(li);
    });
  });
}

// Toggle bought
async function toggleBought(id, current) {
  const ref = doc(db, "users", uid, "grocery", id);
  await updateDoc(ref, { bought: !current });
}

// Move grocery to pantry
async function moveToPantry(id, item) {
  await addDoc(collection(db, "users", uid, "pantry"), {
    name: item.name,
    quantity: item.quantity,
    inStock: true,
    createdAt: serverTimestamp(),
  });
  await deleteDoc(doc(db, "users", uid, "grocery", id));
}
