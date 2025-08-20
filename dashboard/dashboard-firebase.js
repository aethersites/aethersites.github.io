import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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

const form = document.getElementById('profileForm');
const saveBtn = document.getElementById('saveBtn');
const saveStatus = document.getElementById('saveStatus');

// Helper: get all form data
function getProfileFromForm() {
  const dietChips = Array.from(document.querySelectorAll('#dietChips .chip.selected')).map(n => n.textContent);
  const avatarDataUrl = document.querySelector('#avatarPreview img')?.src;
  return {
    fullName: form.fullName.value.trim(),
    email: form.email.value.trim(),
    phone: form.phone.value.trim(),
    location: form.location.value.trim(),
    address: form.address.value.trim(),
    nutritionGoals: form.nutritionGoals.value.trim(),
    preferredDelivery: form.preferredDelivery.value,
    bio: form.bio.value.trim(),
    units: form.units.value,
    dietTags: dietChips,
    avatarDataUrl: avatarDataUrl && avatarDataUrl.startsWith('data:') ? avatarDataUrl : '',
    updatedAt: new Date().toISOString()
  };
}

// Helper: fill form from object
function fillForm(profile) {
  if (!profile) return;
  form.fullName.value = profile.fullName || '';
  form.email.value = profile.email || '';
  form.phone.value = profile.phone || '';
  form.location.value = profile.location || '';
  form.address.value = profile.address || '';
  form.nutritionGoals.value = profile.nutritionGoals || '';
  form.preferredDelivery.value = profile.preferredDelivery || '';
  form.bio.value = profile.bio || '';
  form.units.value = profile.units || 'metric';
  // diet tags
  if (window.renderDietChips && profile.dietTags) window.renderDietChips(profile.dietTags);
  // avatar
  if (profile.avatarDataUrl) {
    const img = document.querySelector('#avatarPreview img');
    if (img) img.src = profile.avatarDataUrl;
  }
}

// Save to Firestore
async function saveToFirestore(user, data) {
  if (!user) return;
  saveStatus.textContent = 'Saving...';
  await setDoc(doc(db, "users", user.uid, "profile", "main"), data, { merge: true });
  saveStatus.textContent = 'Saved!';
  setTimeout(() => (saveStatus.textContent = 'Saved'), 1500);
}

// Load from Firestore
async function loadProfile(user) {
  if (!user) return;
  const snap = await getDoc(doc(db, "users", user.uid, "profile", "main"));
  if (snap.exists()) {
    fillForm(snap.data());
  }
}

// Main logic
onAuthStateChanged(auth, user => {
  if (!user) {
    // Optionally redirect to login
    // window.location.href = "/login.html";
    return;
  }
  loadProfile(user);

  // Save on submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    saveToFirestore(user, getProfileFromForm());
  });

  // Optionally, autosave on input (debounced)
  let autosaveTimer;
  form.addEventListener('input', () => {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => saveToFirestore(user, getProfileFromForm()), 1200);
  });
});
