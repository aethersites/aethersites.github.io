// dashboard.js (cleaned/minimal edits)

// --- imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,         // moved here (was incorrectly imported inside function)
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// --- Firebase config ---
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

// --- DOM Ready ---
document.addEventListener('DOMContentLoaded', () => {

  // --- showOnboardingModalIfNeeded (unchanged logic, uses top-level updateDoc) ---
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

    if (!profile) {
      await setDoc(profileRef, { onboardingComplete: false, onboardingStartedAt: serverTimestamp() }, { merge: true });
    }

    // Build simple overlay
    const overlay = document.createElement('div');
    overlay.id = 'gp-onb-overlay';
    overlay.style = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,0.5);';

    overlay.innerHTML = `
      <div id="gp-onb-modal" role="dialog" aria-modal="true" aria-labelledby="gp-onb-title"
           style="width:min(900px,96%);max-height:92vh;overflow:auto;border-radius:12px;background:#fff;padding:20px;">
        <h2 id="gp-onb-title" style="margin:0 0 12px 0;">Welcome — quick setup</h2>
        <p style="margin:0 0 16px 0;color:#555;">A few simple steps to personalize your dashboard.</p>

        <label style="display:block;margin-bottom:8px;">
          Display name
          <input id="gp-onb-display-name" placeholder="Your name" style="width:100%;padding:8px;border-radius:6px;border:1px solid #e5e7eb;" />
        </label>

        <label style="display:block;margin-bottom:8px;">
          Diet
          <select id="gp-onb-diet" style="width:100%;padding:8px;border-radius:6px;border:1px solid #e5e7eb;">
            <option value="">Choose (optional)</option>
            <option value="none">None</option>
            <option value="vegetarian">Vegetarian</option>
            <option value="vegan">Vegan</option>
          </select>
        </label>

        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:18px;">
          <button id="gp-onb-skip" style="padding:8px 14px;border-radius:8px;border:1px solid #e5e7eb;background:transparent;">Skip</button>
          <button id="gp-onb-finish" style="padding:8px 14px;border-radius:8px;background:#10b981;color:#fff;border:none;">Finish</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const displayInput = document.getElementById('gp-onb-display-name');
    if (displayInput) displayInput.focus();

    // Skip behavior: mark onboardingComplete true so we don't nag again
    document.getElementById('gp-onb-skip').addEventListener('click', async () => {
      try {
        await updateDoc(profileRef, { onboardingComplete: true, onboardingCompletedAt: serverTimestamp() });
      } catch (err) {
        console.error('Failed to skip onboarding:', err);
      }
      document.body.removeChild(overlay);
    });

    // Finish: gather fields and persist
    document.getElementById('gp-onb-finish').addEventListener('click', async (e) => {
      e.preventDefault();
      const displayName = (document.getElementById('gp-onb-display-name')?.value || '').trim();
      const diet = document.getElementById('gp-onb-diet')?.value || '';

      const profilePatch = {
        onboardingComplete: true,
        onboardingCompletedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      if (displayName) profilePatch.displayName = displayName;
      if (diet) profilePatch.diet = diet;

      try {
        // update profile doc
        await updateDoc(profileRef, profilePatch);
        // optionally also update users/{uid} for display name
        if (displayName) {
          await setDoc(doc(db, 'users', uid), {
            name: { first: displayName.split(' ')[0] || '', last: displayName.split(' ').slice(1).join(' ') || '' }
          }, { merge: true });
        }
        document.body.removeChild(overlay);
        setTimeout(() => window.location.reload(), 250);
      } catch (err) {
        console.error('Failed to complete onboarding:', err);
        alert('Unable to save onboarding — try again.');
      }
    });
  } // end showOnboardingModalIfNeeded

  // --- DOM refs ---
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
