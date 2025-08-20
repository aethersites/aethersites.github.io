// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, addDoc, doc,
  updateDoc, deleteDoc, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// TODO: Replace with your firebaseConfig
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM elements
const groceryInput = document.getElementById("groceryInput");
const groceryQty = document.getElementById("groceryQty");
const addBtn = document.getElementById("addGrocery");
const groceryList = document.getElementById("groceryList");
const pantryList = document.getElementById("pantryList");

let uid = null;

// Wait for user login
onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("Please log in first");
    window.location.href = "/login-form/"; // redirect if not logged in
  } else {
    uid = user.uid;
    loadGroceryList();
    loadPantryList();
  }
});

// Add grocery item
addBtn.addEventListener("click", async () => {
  if (!uid || !groceryInput.value.trim()) return;
  await addDoc(collection(db, "users", uid, "grocery"), {
    name: groceryInput.value.trim(),
    quantity: Number(groceryQty.value),
    bought: false,
    createdAt: serverTimestamp(),
  });
  groceryInput.value = "";
  groceryQty.value = 1;
});

// Load grocery list realtime
function loadGroceryList() {
  onSnapshot(collection(db, "users", uid, "grocery"), (snap) => {
    groceryList.innerHTML = "";
    snap.forEach((docSnap) => {
      const item = docSnap.data();
      const li = document.createElement("li");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = item.bought;
      checkbox.onchange = () => toggleBought(docSnap.id, item.bought);

      const span = document.createElement("span");
      span.textContent = `${item.name} ×${item.quantity}`;

      const moveBtn = document.createElement("button");
      moveBtn.textContent = "→ Pantry";
      moveBtn.onclick = () => moveToPantry(docSnap.id, item);

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(moveBtn);
      groceryList.appendChild(li);
    });
  });
}

// Load pantry realtime
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
