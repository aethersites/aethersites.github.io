import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// --- Firebase config ---
const firebaseConfig = {apiKey: "AIzaSyCOHC_OvQ4onPkhLvHzZEPazmY6PRcxjnw",
    authDomain: "goodplates-7ae36.firebaseapp.com",
    projectId: "goodplates-7ae36",
    storageBucket: "goodplates-7ae36.firebasestorage.app",
    messagingSenderId: "541149626283",
    appId: "1:541149626283:web:928888f0b42cda49b7dcee",
    measurementId: "G-HKMSHM726J"
  };


const app = initializeApp(firebaseConfig);

// export the initialized instances so every other module reuses them
export const auth = getAuth(app);
export const db = getFirestore(app);

// (Optional) export other helpers if you want:
// export { signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";



// --- DOM Ready ---
document.addEventListener('DOMContentLoaded', () => {
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

    loggedAs.textContent = "Signed in as " + (user.displayName || user.email);
    loginBtn.style.display = "none";
    logoutBtn.style.display = "";
    previewName.textContent = user.displayName || user.email || "—";
    previewEmail.textContent = user.email || "";

    loadProfile(user);

    // Save on form submit
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const { usersPayload, profilesPayload } = getProfileFromForm();
      saveToFirestore(user, usersPayload, profilesPayload);
    });

    // Autosave on blur + Enter
    Array.from(form.elements).forEach(el => {
      if (!el) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
        el.addEventListener('blur', () => {
          const { usersPayload, profilesPayload } = getProfileFromForm();
          saveToFirestore(user, usersPayload, profilesPayload);
        });
        el.addEventListener('keydown', (e) => {
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
    form.addEventListener('input', () => {
      clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(() => {
        const { usersPayload, profilesPayload } = getProfileFromForm();
        saveToFirestore(user, usersPayload, profilesPayload);
      }, 1200);
    });

    // Avatar upload
    avatarInput?.addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      if (!f.type.startsWith('image/')) {
        alert('Please upload an image');
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        const img = document.querySelector('#avatarPreview img');
        if (img) img.src = reader.result;
        const urlInput = document.getElementById('profilePictureUrl');
        if (urlInput) urlInput.value = reader.result;
        const { usersPayload, profilesPayload } = getProfileFromForm();
        await saveToFirestore(auth.currentUser, usersPayload, profilesPayload);
      };
      reader.readAsDataURL(f);
    });

    // Avatar removal
    removeAvatarBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      const img = document.querySelector('#avatarPreview img');
      if (img) img.src = 'https://i.pravatar.cc/300?img=5';
      const urlInput = document.getElementById('profilePictureUrl');
      if (urlInput) urlInput.value = '';
      const { usersPayload, profilesPayload } = getProfileFromForm();
      saveToFirestore(user, usersPayload, profilesPayload);
    });

    // Logout
    logoutBtn.addEventListener('click', async () => {
      await signOut(auth);
      window.location.href = "/login-form/";
    });
  });

  // Go to login page
  loginBtn.addEventListener('click', () => {
    window.location.href = "/login-form/";
  });
});
