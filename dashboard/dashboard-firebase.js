// dashboard.js (iframe-friendly onboarding)

/* --- imports --- */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  setDoc as setDocAgain, // harmless alias if used elsewhere
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

/* --- Firebase config --- */
const firebaseConfig = {
  apiKey:  "AIzaSyCOHC_OvQ4onPkhLvHzZEPazmY6PRcxjnw",
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

/* --- DOM Ready --- */
document.addEventListener('DOMContentLoaded', () => {

  /* === showOnboardingModalIfNeeded: iframe version === */
  async function showOnboardingModalIfNeeded(user, profileDoc = null) {
    if (!user || user.isAnonymous) return;
    const uid = user.uid;
    const profileRef = doc(db, 'profiles', uid);

    // prefer passed-in profileDoc; otherwise fetch
    let profile = profileDoc;
    if (!profile) {
      const snap = await getDoc(profileRef);
      profile = snap.exists() ? snap.data() : null;
    }

    if (profile && profile.onboardingComplete === true) return; // nothing to do

    // ensure a seed so later writes merge cleanly
    if (!profile) {
      await setDoc(profileRef, { onboardingComplete: false, onboardingStartedAt: serverTimestamp() }, { merge: true });
    }

    // create iframe overlay (minimal)
    const overlay = document.createElement('div');
    overlay.id = 'gp-onb-overlay';
    overlay.style = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:12px;background:rgba(0,0,0,0.45);backdrop-filter: blur(4px);';

    const iframe = document.createElement('iframe');
    iframe.src = '/onboarding/index.html?embedded=1';
    iframe.setAttribute('title', 'Onboarding');
    iframe.style = 'width:min(1100px,96%);height:min(820px,92vh);border-radius:12px;border:0;box-shadow:0 20px 60px rgba(2,6,23,0.6);';
    // allow scripts & same-origin (same origin required to accept messages securely)
    iframe.sandbox = 'allow-same-origin allow-scripts allow-forms allow-popups';

    overlay.appendChild(iframe);
    document.body.appendChild(overlay);

    // message listener: close overlay when child signals completion
    function onMessage(e) {
      // accept only messages from same origin for safety
      if (e.origin !== location.origin) return;
      const data = e.data || {};
      if (data && data.type === 'onboardingComplete') {
        window.removeEventListener('message', onMessage);
        window.removeEventListener('keydown', onKey);
        const o = document.getElementById('gp-onb-overlay'); if (o) o.remove();
        // reload so dashboard can reflect changes (lightweight)
        setTimeout(() => window.location.reload(), 200);
      }
    }
    window.addEventListener('message', onMessage, false);

    // allow Escape to close overlay (dev convenience)
    function onKey(e) {
      if (e.key === 'Escape') {
        window.removeEventListener('message', onMessage);
        window.removeEventListener('keydown', onKey);
        const o = document.getElementById('gp-onb-overlay'); if (o) o.remove();
      }
    }
    window.addEventListener('keydown', onKey, false);
  } // end showOnboardingModalIfNeeded

  /* --- DOM refs --- */
  const form = document.getElementById('profileForm');
  const saveStatus = document.getElementById('saveStatus');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const loggedAs = document.getElementById('loggedAs');
  const previewName = document.getElementById('previewName');
  const previewEmail = document.getElementById('previewEmail');
  const avatarInput = document.getElementById('avatarInput');
  const removeAvatarBtn = document.getElementById('removeAvatar');

  const notSignedIn = document.getElementById('notSignedIn') || null;
  const mainEl = document.querySelector('main') || null;
  const profileFormEl = form || null;

  /* --- helpers --- */
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
      if (form) form.reset();
      if (form) form.elements['email'].value = auth.currentUser?.email || '';
      const createdAtEl = document.getElementById('createdAt');
      if (createdAtEl) createdAtEl.textContent = '—';
      const stripeEl = document.getElementById('stripeCustomerId');
      if (stripeEl) stripeEl.textContent = '—';
    }

    if (profileDoc) {
      if (form) form.elements['aboutMe'].value = profileDoc.aboutMe || '';
    } else {
      if (form) form.elements['aboutMe'].value = '';
    }

    if (previewName) previewName.textContent = `${(form?.elements['firstName']?.value || '')} ${(form?.elements['lastName']?.value || '')}`.trim() || (auth.currentUser?.email || '—');
    if (previewEmail) previewEmail.textContent = form?.elements['email']?.value || '';
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
    if (!user) return null;
    try {
      const [userSnap, profileSnap] = await Promise.all([
        getDoc(doc(db, "users", user.uid)),
        getDoc(doc(db, "profiles", user.uid))
      ]);

      const userDoc = userSnap.exists() ? userSnap.data() : null;
      const profileDoc = profileSnap.exists() ? profileSnap.data() : null;

      fillForm(userDoc, profileDoc);
      if (saveStatus) saveStatus.textContent = 'Loaded';
      return profileDoc;
    } catch (err) {
      console.error("Firestore load error:", err);
      if (saveStatus) saveStatus.textContent = 'Load failed';
      return null;
    }
  }

  // Auth state change
  onAuthStateChanged(auth, async (user) => {
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

    const profileDoc = await loadProfile(user);
    await showOnboardingModalIfNeeded(user, profileDoc);
  });

  // Save on form submit — use auth.currentUser (works even outside the auth callback)
  if (form) addOnce(form, 'submit', (e) => {
    e.preventDefault();
    const { usersPayload, profilesPayload } = getProfileFromForm();
    saveToFirestore(auth.currentUser, usersPayload, profilesPayload);
  });

  // Autosave on blur + Enter (use auth.currentUser)
  if (form) {
    Array.from(form.elements).forEach(el => {
      if (!el) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
        addOnce(el, 'blur', () => {
          const { usersPayload, profilesPayload } = getProfileFromForm();
          saveToFirestore(auth.currentUser, usersPayload, profilesPayload);
        });
        addOnce(el, 'keydown', (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const { usersPayload, profilesPayload } = getProfileFromForm();
            saveToFirestore(auth.currentUser, usersPayload, profilesPayload);
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
    // (your existing avatar upload code goes here; ensure it uses auth.currentUser)
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

}); // DOMContentLoaded
