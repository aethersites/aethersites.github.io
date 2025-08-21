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
  // Refs
  const form = document.getElementById('profileForm');
  const saveBtn = document.getElementById('saveBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const logoutNavBtn = document.getElementById('logoutNavBtn');
  const saveStatus = document.getElementById('saveStatus');
  const modal = document.getElementById('notSignedInModal');
  const loginModalBtn = document.getElementById('lightboxLoginBtn');
  const avatarInput = document.getElementById('avatarInput');
  const removeAvatarBtn = document.getElementById('removeAvatar');
  const avatarPreview = document.getElementById('avatarPreview');
  const previewName = document.getElementById('previewName');
  const previewEmail = document.getElementById('previewEmail');

  // Helper: fill form from Firestore profile
  function fillForm(profile) {
    form.fullName.value = profile.fullName || "";
    form.email.value = profile.email || "";
    form.phone.value = profile.phone || "";
    form.location.value = profile.location || "";
    form.preferredDelivery.value = profile.preferredDelivery || "";
    form.nutritionGoals.value = profile.nutritionGoals || "";
    form.units.value = profile.units || "metric";
    form.bio.value = profile.bio || "";
    previewName.textContent = profile.fullName || profile.email || "—";
    previewEmail.textContent = profile.email || "—";
    if (profile.avatarDataUrl && profile.avatarDataUrl.startsWith("data:")) {
      avatarPreview.src = profile.avatarDataUrl;
    } else {
      avatarPreview.src = "https://i.pravatar.cc/120?img=5";
    }
  }

  // Helper: get profile from form
  function getProfileFromForm() {
    return {
      fullName: form.fullName.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      location: form.location.value.trim(),
      preferredDelivery: form.preferredDelivery.value,
      nutritionGoals: form.nutritionGoals.value.trim(),
      units: form.units.value,
      bio: form.bio.value.trim(),
      avatarDataUrl: avatarPreview.src.startsWith("data:") ? avatarPreview.src : "",
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
      if (snap.exists()) fillForm(snap.data());
      else fillForm({ email: user.email }); // Fill email at minimum
    } catch (err) {
      console.error("Firestore load error:", err);
    }
  }

  // Avatar upload
  avatarInput?.addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      alert('Please upload an image');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      avatarPreview.src = reader.result;
      saveStatus.textContent = "Avatar updated. Don't forget to Save!";
    };
    reader.readAsDataURL(f);
  });

  removeAvatarBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    avatarPreview.src = "https://i.pravatar.cc/120?img=5";
    saveStatus.textContent = "Avatar removed. Don't forget to Save!";
  });

  // Auth state listener
  onAuthStateChanged(auth, user => {
    if (!user) {
      // Show modal, blur form
      modal.style.display = "flex";
      form.style.filter = "blur(3px)";
      form.style.pointerEvents = "none";
      loginModalBtn.onclick = () => window.location.href = "/login-form/";
      logoutNavBtn && (logoutNavBtn.style.display = "none");
      return;
    }

    // User signed in, show form, load profile
    modal.style.display = "none";
    form.style.filter = "";
    form.style.pointerEvents = "";
    logoutNavBtn && (logoutNavBtn.style.display = "");
    loadProfile(user);

    // Save on submit
    form.addEventListener('submit', e => {
      e.preventDefault();
      saveProfile(user);
    });

    // Autosave on blur/enter
    Array.from(form.elements).forEach(el => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) {
        el.addEventListener("blur", () => saveProfile(user));
        el.addEventListener("keydown", e => {
          if (e.key === "Enter") {
            e.preventDefault();
            saveProfile(user);
            el.blur();
          }
        });
      }
    });

    // Manual logout
    logoutBtn.addEventListener('click', async () => {
      await signOut(auth);
      window.location.href = "/login-form/";
    });

    // Navbar logout
    logoutNavBtn && logoutNavBtn.addEventListener('click', async () => {
      await signOut(auth);
      window.location.href = "/login-form/";
    });
  });
});
