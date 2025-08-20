// dashboard-login.js
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/* ---- FIREBASE CONFIG ---- */
const firebaseConfig = {
  apiKey: "AIzaSyCOHC_OvQ4onPkhLvHzZEPazmY6PRcxjnw",
  authDomain: "goodplates-7ae36.firebaseapp.com",
  projectId: "goodplates-7ae36",
  storageBucket: "goodplates-7ae36.appspot.com",
  messagingSenderId: "541149626283",
  appId: "1:541149626283:web:928888f0b42cda49b7dcee",
  measurementId: "G-HKMSHM726J"
};

let app;
if (getApps().length === 0) app = initializeApp(firebaseConfig);
else app = getApp();

const auth = getAuth(app);
const db = getFirestore(app);

/* ---- DOM refs ---- */
const previewName = document.getElementById('previewName');
const previewEmail = document.getElementById('previewEmail');
const avatarImg = document.querySelector('#avatarPreview img');
const loggedAs = document.getElementById('loggedAs');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const profileForm = document.getElementById('profileForm');

/* ---- Minimal: Load and display user info from Firebase ---- */
async function loadFirebaseUserProfile(user) {
  if (!user) return;
  // Display name/email/avatar from Auth
  previewName.textContent = user.displayName || user.email || '—';
  previewEmail.textContent = user.email || '';
  avatarImg.src = user.photoURL || 'https://i.pravatar.cc/300?img=5';
  loggedAs.textContent = 'Signed in as ' + (user.displayName || user.email);

  // Try to load profile data from Firestore (users/{uid})
  const profDoc = await getDoc(doc(db, 'users', user.uid));
  if (profDoc.exists()) {
    const data = profDoc.data();
    // Fill form fields if present (minimal: fullName, phone, location, etc.)
    if (profileForm) {
      if (data.fullName) profileForm.fullName.value = data.fullName;
      if (data.phone) profileForm.phone.value = data.phone;
      if (data.location) profileForm.location.value = data.location;
      if (data.address) profileForm.address.value = data.address;
      if (data.nutritionGoals) profileForm.nutritionGoals.value = data.nutritionGoals;
      if (data.preferredDelivery) profileForm.preferredDelivery.value = data.preferredDelivery;
      if (data.bio) profileForm.bio.value = data.bio;
      if (data.units) profileForm.units.value = data.units;
      if (data.email) profileForm.email.value = data.email;
      // Diet tags, avatar
      if (data.avatarDataUrl) avatarImg.src = data.avatarDataUrl;
      if (data.dietTags && Array.isArray(data.dietTags)) {
        // Try to update chips if your chips logic is exposed globally
        if (window.renderDietChips) window.renderDietChips(data.dietTags);
      }
    }
  }
}

async function saveFirebaseUserProfile(user) {
  if (!user || !profileForm) return;
  const data = {
    fullName: profileForm.fullName.value.trim(),
    email: profileForm.email.value.trim(),
    phone: profileForm.phone.value.trim(),
    location: profileForm.location.value.trim(),
    address: profileForm.address.value.trim(),
    nutritionGoals: profileForm.nutritionGoals.value.trim(),
    preferredDelivery: profileForm.preferredDelivery.value,
    bio: profileForm.bio.value.trim(),
    units: profileForm.units.value,
    // For diet tags and avatar
    dietTags: window.refs && window.refs.dietChips
      ? Array.from(window.refs.dietChips.querySelectorAll('.chip.selected')).map(n=>n.textContent)
      : [],
    avatarDataUrl: avatarImg.src && avatarImg.src.startsWith('data:') ? avatarImg.src : null,
    updatedAt: new Date().toISOString()
  };
  // Save to Firestore
  await setDoc(doc(db, 'users', user.uid), data, { merge: true });
  // Optionally, update the Auth profile (displayName, photoURL)
  await updateProfile(user, {
    displayName: data.fullName || user.displayName,
    photoURL: data.avatarDataUrl || user.photoURL
  });
}

/* ---- Auth state ---- */
onAuthStateChanged(auth, user => {
  if (user) {
    loginBtn.style.display = 'none';
    logoutBtn.style.display = '';
    loadFirebaseUserProfile(user);
  } else {
    loginBtn.style.display = '';
    logoutBtn.style.display = 'none';
    loggedAs.textContent = '';
    previewName.textContent = 'Guest';
    previewEmail.textContent = 'not logged in';
    avatarImg.src = 'https://i.pravatar.cc/300?img=5';
    // Optionally clear form fields here
  }
});

/* ---- Login/Logout buttons ---- */
loginBtn.addEventListener('click', () => {
  // Minimal: redirect to your existing login page or trigger your login UI
  window.location.href = '/login.html'; // Change to your login page
});
logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  window.location.reload();
});

/* ---- Save profile to Firebase when form is submitted ---- */
if (profileForm) {
  profileForm.addEventListener('submit', async e => {
    e.preventDefault();
    const user = auth.currentUser;
    if (user) {
      await saveFirebaseUserProfile(user);
      // Optionally show a toast or saved status
      if (window.showToast) window.showToast('Saved to cloud');
    }
  });
}
