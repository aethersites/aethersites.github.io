import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// --- Firebase config (your real project config) ---
const firebaseConfig = {
  apiKey: "AIzaSyCOHC_OvQ4onPkhLvHzZEPazmY6PRcxjnw",
  authDomain: "goodplates-7ae36.firebaseapp.com",
  projectId: "goodplates-7ae36",
  storageBucket: "goodplates-7ae36.firebasestorage.app",
  messagingSenderId: "541149626283",
  appId: "1:541149626283:web:928888f0b42cda49b7dcee",
  measurementId: "G-HKMSHM726J"
};

let app;
if (getApps().length === 0) app = initializeApp(firebaseConfig);
else app = getApp();

const auth = getAuth(app);
const db = getFirestore(app);

// --- DOM Ready ---
document.addEventListener('DOMContentLoaded', () => {
  // --- DOM refs ---
  const form = document.getElementById('profileForm');
  const saveBtn = document.getElementById('saveBtn');
  const saveStatus = document.getElementById('saveStatus');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const loggedAs = document.getElementById('loggedAs');
  const previewName = document.getElementById('previewName');
  const previewEmail = document.getElementById('previewEmail');
  const avatarInput = document.getElementById('avatarInput');
  const removeAvatarBtn = document.getElementById('removeAvatar');

  // --- Helper: Get profile data from form ---
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

  // --- Helper: Fill form from profile object ---
  function fillForm(profile) {
    if (!profile) return;
    form.elements['fullName'].value = profile.fullName || '';
    form.elements['email'].value = profile.email || '';
    form.elements['phone'].value = profile.phone || '';
    form.elements['location'].value = profile.location || '';
    form.elements['address'].value = profile.address || '';
    form.elements['nutritionGoals'].value = profile.nutritionGoals || '';
    // Ensure value exists for <select>
    ensureOption(form.elements['preferredDelivery'], profile.preferredDelivery);
    form.elements['preferredDelivery'].value = profile.preferredDelivery || '';
    form.elements['bio'].value = profile.bio || '';
    // Ensure value exists for <select>
    ensureOption(form.elements['units'], profile.units);
    form.elements['units'].value = profile.units || 'metric';

    // Render diet chips if function exists
    if (window.renderDietChips && profile.dietTags) window.renderDietChips(profile.dietTags);
    // Avatar preview
    if (profile.avatarDataUrl) {
      const img = document.querySelector('#avatarPreview img');
      if (img) img.src = profile.avatarDataUrl;
    }
    // UI preview
    previewName.textContent = profile.fullName || profile.email || '—';
    previewEmail.textContent = profile.email || '';
  }

  // --- Dynamically add option for select if needed ---
  function ensureOption(select, value) {
    if (select && value && ![...select.options].some(opt => opt.value === value)) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = value;
      select.appendChild(opt);
    }
  }

  // --- Save profile to Firestore ---
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

  // --- Load profile from Firestore ---
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

  // --- Auth State ---
  onAuthStateChanged(auth, user => {
    if (!user) {
      // Show lightbox/modal
      document.getElementById('notSignedInModal').style.display = "flex";
      document.querySelector('.main').style.filter = "blur(3px)";
      document.getElementById('profileForm').style.pointerEvents = "none";
      document.getElementById('lightboxLoginBtn').onclick = function() {
        window.location.href = "/login-form/";
      };
      return;
    }

    // User is logged in: update UI
    loggedAs.textContent = "Signed in as " + (user.displayName || user.email);
    loginBtn.style.display = "none";
    logoutBtn.style.display = "";
    previewName.textContent = user.displayName || user.email || "—";
    previewEmail.textContent = user.email || "";

    // Load profile from Firestore
    loadProfile(user);

    // Save on form submit
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      saveToFirestore(user, getProfileFromForm());
    });

    // Autosave on blur for each field
    Array.from(form.elements).forEach(el => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
        el.addEventListener('blur', () => {
          saveToFirestore(user, getProfileFromForm());
        });
        // Also save on Enter key
        el.addEventListener('keydown', (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            saveToFirestore(user, getProfileFromForm());
            el.blur();
          }
        });
      }
    });

    // Autosave on input (debounced)
    let autosaveTimer;
    form.addEventListener('input', () => {
      clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(() => saveToFirestore(user, getProfileFromForm()), 1200);
    });

    // Avatar upload (resize/compress if needed)
    avatarInput?.addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      if (!f.type.startsWith('image/')) {
        alert('Please upload an image');
        return;
      }
      // Optionally process image here (resize/compress)
      const reader = new FileReader();
      reader.onload = () => {
        const img = document.querySelector('#avatarPreview img');
        if (img) img.src = reader.result;
        // Autosave after selecting avatar
        saveToFirestore(user, getProfileFromForm());
      };
      reader.readAsDataURL(f);
    });

    removeAvatarBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      const img = document.querySelector('#avatarPreview img');
      if (img) img.src = 'https://i.pravatar.cc/300?img=5';
      saveToFirestore(user, getProfileFromForm());
    });

    // Logout
    logoutBtn.addEventListener('click', async () => {
      await signOut(auth);
      window.location.href = "/login-form/";
    });
  });

  // Login button (for users who are logged out)
  loginBtn.addEventListener('click', () => {
    window.location.href = "/login-form/";
  });
});
