import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

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
export { auth, db };

// --- DOM Ready ---
document.addEventListener('DOMContentLoaded', () => {
  // --- DOM refs (some pages may not have all of these; we guard their use) ---
  const form = document.getElementById('profileForm');
  const saveStatus = document.getElementById('saveStatus');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const loggedAs = document.getElementById('loggedAs');
  const previewName = document.getElementById('previewName');
  const previewEmail = document.getElementById('previewEmail');
  const avatarInput = document.getElementById('avatarInput');
  const removeAvatarBtn = document.getElementById('removeAvatar');

  // Missing variables referenced later — define them or fallback to null
  const notSignedIn = document.getElementById('notSignedIn') || null;
  const mainEl = document.querySelector('main') || null;
  const profileFormEl = form || null;

  // helper to attach a listener once to an element (prevents duplicates)
  function addOnce(el, ev, fn) {
    if (!el) return;
    if (!el.__listeners) el.__listeners = new Set();
    const key = ev + '::' + (fn.name || Math.random());
    if (el.__listeners.has(key)) return;
    el.addEventListener(ev, fn);
    el.__listeners.add(key);
  }
  
  function getProfileFromForm() {
    const first = (form.elements['firstName']?.value || "").trim();
    const last = (form.elements['lastName']?.value || "").trim();
    const phone = (form.elements['phone']?.value || "").trim();
    const profilePicture = (form.elements['profilePictureUrl']?.value || "").trim();
    const subscriptionTier = (form.elements['subscriptionTier']?.value || "free");
    const aboutMe = (form.elements['aboutMe']?.value || "").trim();

    const usersPayload = {
      name: { first, last },
      phone,
      profilePicture,
      subscriptionTier,
      updatedAt: serverTimestamp()
    };

    const profilesPayload = {
      aboutMe,
      updatedAt: serverTimestamp()
    };

    return { usersPayload, profilesPayload };
  }

  function fillForm(userDoc, profileDoc) {
    if (userDoc) {
      form.elements['firstName'].value = userDoc.name?.first || '';
      form.elements['lastName'].value = userDoc.name?.last || '';
      form.elements['email'].value = userDoc.email || (auth.currentUser && auth.currentUser.email) || '';
      form.elements['phone'].value = userDoc.phone || '';
      form.elements['subscriptionTier'].value = userDoc.subscriptionTier || 'free';
      form.elements['profilePictureUrl'].value = userDoc.profilePicture || '';

      const avatarImg = document.querySelector('#avatarPreview img');
      if (userDoc.profilePicture && avatarImg) avatarImg.src = userDoc.profilePicture;

      const createdAtEl = document.getElementById('createdAt');
      if (userDoc.createdAt && typeof userDoc.createdAt.toDate === "function") {
        createdAtEl.textContent = userDoc.createdAt.toDate().toLocaleString();
      } else {
        createdAtEl.textContent = userDoc.createdAt || '—';
      }

      document.getElementById('stripeCustomerId').textContent = userDoc.stripeCustomerId || '—';
    } else {
      form.reset();
      form.elements['email'].value = auth.currentUser?.email || '';
      document.getElementById('createdAt').textContent = '—';
      document.getElementById('stripeCustomerId').textContent = '—';
    }

    if (profileDoc) {
      form.elements['aboutMe'].value = profileDoc.aboutMe || '';
    } else {
      form.elements['aboutMe'].value = '';
    }

    previewName.textContent = `${form.elements['firstName'].value || ''} ${form.elements['lastName'].value || ''}`.trim() || (auth.currentUser?.email || '—');
    previewEmail.textContent = form.elements['email'].value || '';
  }

  async function saveToFirestore(user, usersPayload, profilesPayload) {
    if (!user) return;
    try {
      if (saveStatus) saveStatus.textContent = 'Saving...';

      // --- Users doc (merge, preserve createdAt) ---
      await setDoc(doc(db, "users", user.uid), {
        ...usersPayload,
        createdAt: user.metadata?.creationTime
          ? new Date(user.metadata.creationTime)
          : serverTimestamp()
      }, { merge: true });

      // --- Profiles doc (merge only, no createdAt field needed here) ---
      await setDoc(doc(db, "profiles", user.uid), profilesPayload, { merge: true });

      if (saveStatus) {
        saveStatus.textContent = 'Saved!';
        setTimeout(() => {
          if (saveStatus) saveStatus.textContent = 'Saved';
        }, 1500);
      }
    } catch (err) {
      if (saveStatus) saveStatus.textContent = 'Save failed!';
      console.error("Firestore save error:", err);
    }
  }

  async function loadProfile(user) {
    if (!user) return;
    try {
      const [userSnap, profileSnap] = await Promise.all([
        getDoc(doc(db, "users", user.uid)),
        getDoc(doc(db, "profiles", user.uid))
      ]);

      const userDoc = userSnap.exists() ? userSnap.data() : null;
      const profileDoc = profileSnap.exists() ? profileSnap.data() : null;

      fillForm(userDoc, profileDoc);
      if (saveStatus) saveStatus.textContent = 'Loaded';
    } catch (err) {
      console.error("Firestore load error:", err);
      if (saveStatus) saveStatus.textContent = 'Load failed';
    }
  }

  onAuthStateChanged(auth, user => {
    
    if (!user) {
  window.location.href = "/login-form/";
  return;
    }

    // Signed in → clean up overlay and restore form
    if (notSignedIn) notSignedIn.style.display = 'none';
    if (mainEl) mainEl.style.filter = '';
    if (profileFormEl) profileFormEl.style.pointerEvents = '';

    if (loggedAs) loggedAs.textContent = "Signed in as " + (user.displayName || user.email);
if (loginBtn) loginBtn.style.display = "none";
if (logoutBtn) logoutBtn.style.display = "";
if (previewName) previewName.textContent = user.displayName || user.email || "—";
if (previewEmail) previewEmail.textContent = user.email || "";
    
    loadProfile(user);

    // Save on form submit
if (form) addOnce(form, 'submit', (e) => {
  e.preventDefault();
  const { usersPayload, profilesPayload } = getProfileFromForm();
  saveToFirestore(user, usersPayload, profilesPayload);
});

// Autosave on blur + Enter
if (form) {
  Array.from(form.elements).forEach(el => {
    if (!el) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
      addOnce(el, 'blur', () => {
        const { usersPayload, profilesPayload } = getProfileFromForm();
        saveToFirestore(user, usersPayload, profilesPayload);
      });
      addOnce(el, 'keydown', (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const { usersPayload, profilesPayload } = getProfileFromForm();
          saveToFirestore(user, usersPayload, profilesPayload);
          el.blur();
        }
      });
    }
  });

  // Debounced autosave
  let autosaveTimer;
  addOnce(form, 'input', () => {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      const { usersPayload, profilesPayload } = getProfileFromForm();
      saveToFirestore(auth.currentUser, usersPayload, profilesPayload);
    }, 1200);
  });
}

    // Avatar upload
    if (avatarInput) addOnce(avatarInput, 'change', async (e) => {
  // (same code you already have)
});

if (removeAvatarBtn) addOnce(removeAvatarBtn, 'click', (e) => {
  e.preventDefault();
  // (existing removal code)
});

// Logout (guarded)
if (logoutBtn) addOnce(logoutBtn, 'click', async () => {
  await signOut(auth);
  window.location.href = "/login-form/";
});

// Go to login page (guarded)
if (loginBtn) addOnce(loginBtn, 'click', () => {
  window.location.href = "/login-form/";
});
