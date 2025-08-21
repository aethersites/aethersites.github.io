import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

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

const app = initializeApp(firebaseConfig);
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

  function getProfileFromForm() {
    // Build user doc patch and profiles doc patch
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
    // userDoc from users/{uid}, profileDoc from profiles/{uid}
    if (userDoc) {
      form.elements['firstName'].value = userDoc.name?.first || '';
      form.elements['lastName'].value = userDoc.name?.last || '';
      form.elements['email'].value = userDoc.email || (auth.currentUser && auth.currentUser.email) || '';
      form.elements['phone'].value = userDoc.phone || '';
      form.elements['subscriptionTier'].value = userDoc.subscriptionTier || 'free';
      form.elements['profilePictureUrl'].value = userDoc.profilePicture || '';

      // preview avatar
      const avatarImg = document.querySelector('#avatarPreview img');
      if (userDoc.profilePicture && avatarImg) avatarImg.src = userDoc.profilePicture;

      // createdAt display (do not overwrite createdAt in DB)
      const createdAtEl = document.getElementById('createdAt');
      if (userDoc.createdAt && typeof userDoc.createdAt.toDate === "function") {
        createdAtEl.textContent = userDoc.createdAt.toDate().toLocaleString();
      } else {
        createdAtEl.textContent = userDoc.createdAt || '—';
      }

      // stripe id display
      document.getElementById('stripeCustomerId').textContent = userDoc.stripeCustomerId || '—';
    } else {
      // clear user fields if doc doesn't exist
      form.elements['firstName'].value = '';
      form.elements['lastName'].value = '';
      form.elements['email'].value = auth.currentUser?.email || '';
      form.elements['phone'].value = '';
      form.elements['subscriptionTier'].value = 'free';
      form.elements['profilePictureUrl'].value = '';
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
      // write users doc (merge so we don't clobber createdAt or other fields)
      await setDoc(doc(db, "users", user.uid), usersPayload, { merge: true });
      // write profiles doc (merge)
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
      // show not-signed-in overlay / block interactions (as your original flow)
      const notSignedIn = document.getElementById('notSignedInModal');
      if (notSignedIn) notSignedIn.style.display = "flex";
      const mainEl = document.querySelector('.main');
      if (mainEl) mainEl.style.filter = "blur(3px)";
      const profileFormEl = document.getElementById('profileForm');
      if (profileFormEl) profileFormEl.style.pointerEvents = "none";

      const lightboxLoginBtn = document.getElementById('lightboxLoginBtn');
      if (lightboxLoginBtn) lightboxLoginBtn.onclick = function() {
        window.location.href = "/login-form/";
      };
      return;
    }

    // logged in UI adjustments
    loggedAs.textContent = "Signed in as " + (user.displayName || user.email);
    loginBtn.style.display = "none";
    logoutBtn.style.display = "";
    previewName.textContent = user.displayName || user.email || "—";
    previewEmail.textContent = user.email || "";

    // load profile data
    loadProfile(user);

    // Save on form submit
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const { usersPayload, profilesPayload } = getProfileFromForm();
      saveToFirestore(user, usersPayload, profilesPayload);
    });

    // blur autosave + Enter behavior
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

    // debounced input autosave
    let autosaveTimer;
    form.addEventListener('input', () => {
      clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(() => {
        const { usersPayload, profilesPayload } = getProfileFromForm();
        saveToFirestore(user, usersPayload, profilesPayload);
      }, 1200);
    });

    // avatar file -> set preview and save the data URL into profilePicture (minimal approach)
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
        // also populate the profilePictureUrl input if present
        const urlInput = document.getElementById('profilePictureUrl');
        if (urlInput) urlInput.value = reader.result;
        const { usersPayload, profilesPayload } = getProfileFromForm();
        await saveToFirestore(auth.currentUser, usersPayload, profilesPayload);
      };
      reader.readAsDataURL(f);
    });

    // remove avatar -> reset preview and save empty string
    removeAvatarBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      const img = document.querySelector('#avatarPreview img');
      if (img) img.src = 'https://i.pravatar.cc/300?img=5';
      const urlInput = document.getElementById('profilePictureUrl');
      if (urlInput) urlInput.value = '';
      const { usersPayload, profilesPayload } = getProfileFromForm();
      saveToFirestore(user, usersPayload, profilesPayload);
    });

    // logout flow
    logoutBtn.addEventListener('click', async () => {
      await signOut(auth);
      window.location.href = "/login-form/";
    });
  });

  // goto login
  loginBtn.addEventListener('click', () => {
    window.location.href = "/login-form/";
  });
});
