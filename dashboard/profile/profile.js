import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// --- Firebase config ---
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

document.addEventListener('DOMContentLoaded', () => {
  // Form and modal refs
  const form = document.getElementById('profileForm');
  const saveBtn = document.getElementById('saveBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const saveStatus = document.getElementById('saveStatus');
  const modal = document.getElementById('notSignedInModal');
  const loginModalBtn = document.getElementById('lightboxLoginBtn');

  function fillForm(profile) {
    form.fullName.value = profile.fullName || "";
    form.email.value = profile.email || "";
    form.phone.value = profile.phone || "";
    form.location.value = profile.location || "";
    form.bio.value = profile.bio || "";
  }

  function getProfileFromForm() {
    return {
      fullName: form.fullName.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      location: form.location.value.trim(),
      bio: form.bio.value.trim(),
      updatedAt: new Date().toISOString()
    };
  }

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

  async function loadProfile(user) {
    if (!user) return;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) fillForm(snap.data());
      else fillForm({ email: user.email });
    } catch (err) {
      console.error("Firestore load error:", err);
    }
  }

  // Login button always redirects
  loginModalBtn.onclick = () => window.location.href = "/login-form/";

  // Auth state listener
  onAuthStateChanged(auth, user => {
    if (!user) {
      // Show modal, hide form
      modal.style.display = "block";
      form.style.display = "none";
      return;
    }

    // User signed in, show form
    modal.style.display = "none";
    form.style.display = "block";
    loadProfile(user);

    form.addEventListener('submit', e => {
      e.preventDefault();
      saveProfile(user);
    });

    logoutBtn.addEventListener('click', async () => {
      await signOut(auth);
      window.location.href = "/login-form/";
    });
  });
});
