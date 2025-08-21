// ==== FIREBASE CONFIGURATION ====
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Firebase config (replace XX with your credentials)
const firebaseConfig = {
  apiKey: "AIzaSyCOHC_OvQ4onPkhLvHzZEPazmY6PRcxjnw",
  authDomain: "goodplates-7ae36.firebaseapp.com",
  projectId: "goodplates-7ae36",
  storageBucket: "goodplates-7ae36.appspot.com",
  messagingSenderId: "541149626283",
  appId: "1:541149626283:web:928888f0b42cda49b7dcee",
  measurementId: "G-HKMSHM726J"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==== DOM REFS ====
const profileInput = document.getElementById('profile-picture');
const profilePreview = document.getElementById('profile-preview');
const saveBtn = document.getElementById('save-btn');
const logoutBtn = document.getElementById('logout-btn');

// ==== PREVIEW PROFILE PICTURE ====
profileInput.addEventListener('change', () => {
  const file = profileInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = e => profilePreview.src = e.target.result;
    reader.readAsDataURL(file);
  }
});

// ==== AUTH STATE & DATA LOAD ====
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Not logged in. Redirecting...");
    window.location.href = "/login.html";
    return;
  }

  document.getElementById('email').value = user.email;

  const docRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    document.getElementById('name').value = data.name || "";
    document.getElementById('phone').value = data.phone || "";
    document.getElementById('card-number').value = data.cardNumber || "";
    document.getElementById('expiry').value = data.expiry || "";
    document.getElementById('cvc').value = data.cvc || "";
    document.getElementById('calories').value = data.calories || "";
    document.getElementById('protein').value = data.protein || "";
    document.getElementById('carbs').value = data.carbs || "";
    document.getElementById('fats').value = data.fats || "";
    if (data.profilePictureUrl) {
      profilePreview.src = data.profilePictureUrl;
    }
  }
});

// ==== SAVE PROFILE ====
saveBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return alert("You must be logged in to save your profile.");

  const userData = {
    name: document.getElementById('name').value,
    phone: document.getElementById('phone').value,
    cardNumber: document.getElementById('card-number').value,
    expiry: document.getElementById('expiry').value,
    cvc: document.getElementById('cvc').value,
    calories: document.getElementById('calories').value,
    protein: document.getElementById('protein').value,
    carbs: document.getElementById('carbs').value,
    fats: document.getElementById('fats').value
  };

  try {
    await setDoc(doc(db, "users", user.uid), userData, { merge: true });
    alert("Profile saved successfully!");
  } catch (error) {
    console.error("Error saving profile:", error);
    alert("An error occurred while saving your profile.");
  }
});

// ==== LOGOUT ====
logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = "/login.html";
});
