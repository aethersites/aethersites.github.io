<script type="module">
  import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
  import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
  import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

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


// DOM ready wrapper
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('profileForm');
  const saveBtn = document.getElementById('saveBtn');
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

// DOM ready wrapper
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('profileForm');
  const saveBtn = document.getElementById('saveBtn');
  const saveStatus = document.getElementById('saveStatus');

  if (!form) {
    console.error("Profile form with id 'profileForm' not found in HTML.");
    return;
  }

  // Helper: get all form data
  function getProfileFromForm() {
    const dietChips = Array.from(document.querySelectorAll('#dietChips .chip.selected')).map(n => n.textContent);
    const avatarDataUrl = document.querySelector('#avatarPreview img')?.src;
    return {
      fullName: form.elements['fullName']?.value.trim() || "",
      email: form.elements['email']?.value.trim() || "",
      phone: form.elements['phone']?.value.trim() || "",
      location: form.elements['location']?.value.trim() || "",
      address: form.elements['address']?.value.trim() || "",
      nutritionGoals: form.elements['nutritionGoals']?.value.trim() || "",
      preferredDelivery: form.elements['preferredDelivery']?.value || "",
      bio: form.elements['bio']?.value.trim() || "",
      units: form.elements['units']?.value || "metric",
      dietTags: dietChips,
      avatarDataUrl: avatarDataUrl && avatarDataUrl.startsWith('data:') ? avatarDataUrl : '',
      updatedAt: new Date().toISOString()
    };
  }

  // Helper: fill form from object
  function fillForm(profile) {
    if (!profile) return;
    form.elements['fullName'].value = profile.fullName || '';
    form.elements['email'].value = profile.email || '';
    form.elements['phone'].value = profile.phone || '';
    form.elements['location'].value = profile.location || '';
    form.elements['address'].value = profile.address || '';
    form.elements['nutritionGoals'].value = profile.nutritionGoals || '';
    form.elements['preferredDelivery'].value = profile.preferredDelivery || '';
    form.elements['bio'].value = profile.bio || '';
    form.elements['units'].value = profile.units || 'metric';
    // diet tags (chips)
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
    try {
      if (saveStatus) saveStatus.textContent = 'Saving...';
      await setDoc(doc(db, "users", user.uid), data, { merge: true });
      if (saveStatus) {
        saveStatus.textContent = 'Saved!';
        setTimeout(() => (saveStatus.textContent = 'Saved'), 1500);
      }
    } catch (err) {
      if (saveStatus) saveStatus.textContent = 'Save failed!';
      console.error("Firestore save error:", err);
    }
  }

  // Load from Firestore
  async function loadProfile(user) {
    if (!user) return;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        fillForm(snap.data());
      }
    } catch (err) {
      console.error("Firestore load error:", err);
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
  });
  
</script>
