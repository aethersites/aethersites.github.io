import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Firebase config (MUST match your project)
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
const auth = getAuth(app);
const db = getFirestore(app);

// DOM refs
const modal = document.getElementById('notSignedInModal');
const loginBtn = document.getElementById('loginBtn');
const container = document.getElementById('profileContainer');
const form = document.getElementById('profileForm');
const saveBtn = document.getElementById('saveBtn');
const logoutBtn = document.getElementById('logoutBtn');
const saveStatus = document.getElementById('saveStatus');
const photoInput = document.getElementById('photo');
const profilePic = document.getElementById('profilePic');

// Always redirect to login page when button is clicked
loginBtn.onclick = () => window.location.href = "/login-form/";

// Show profile image preview
photoInput?.addEventListener('change', () => {
  const input = photoInput;
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      profilePic.src = e.target.result;
      profilePic.style.display = 'block';
    };
    reader.readAsDataURL(input.files[0]);
  }
});

// Fill form with profile data
function fillForm(profile, user) {
  form.name.value = profile.name || (user.displayName || "");
  form.email.value = profile.email || (user.email || "");
  form.gender.value = profile.gender || "";
  form.age.value = profile.age || "";
  if (profile.photoDataUrl) {
    profilePic.src = profile.photoDataUrl;
    profilePic.style.display = 'block';
  } else {
    profilePic.src = "#";
    profilePic.style.display = 'none';
  }
}

// Get profile data from form
function getProfileFromForm() {
  return {
    name: form.name.value.trim(),
    email: form.email.value.trim(),
    gender: form.gender.value,
    age: form.age.value,
    photoDataUrl: (profilePic.src && profilePic.src !== "#") ? profilePic.src : "",
    updatedAt: new Date().toISOString()
  };
}

// Save profile to Firestore
async function saveProfile(user) {
  if (!user) return;
  try {
    saveStatus.textContent = "Saving...";
    await setDoc(doc(db, "users", user.uid), getProfileFromForm(), { merge: true });
    saveStatus.textContent = "Saved!";
    setTimeout(() => (saveStatus.textContent = ""), 1500);
  } catch (err) {
    saveStatus.textContent = "Save failed!";
    console.error("Firestore save error:", err);
  }
}

// Load profile from Firestore
async function loadProfile(user) {
  if (!user) return;
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) fillForm(snap.data(), user);
    else fillForm({ email: user.email }, user);
  } catch (err) {
    console.error("Firestore load error:", err);
  }
}

// Auth state listener
onAuthStateChanged(auth, user => {
  if (!user) {
    modal.style.display = "block";
    container.style.display = "none";
    return;
  }
  modal.style.display = "none";
  container.style.display = "block";
  loadProfile(user);

  form.onsubmit = async (e) => {
    e.preventDefault();
    await saveProfile(user);
  };

  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "/login-form/";
  };
});
