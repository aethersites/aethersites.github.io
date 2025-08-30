<!-- auth + firestore (inline) -->
<script type="module">
  import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
  import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
  import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    arrayUnion
  } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

  const firebaseConfig = {
    // <-- REPLACE with your Firebase config
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    // ...
  };

  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  // expose for non-module scripts
  window.db = db;
  window.__fireHelpers = { doc, getDoc, setDoc, updateDoc, arrayUnion };

  onAuthStateChanged(auth, async (user) => {
    console.log("Auth state changed. User is:", user);

    if (!user) {
      // Not logged in: redirect as your original app did
      if (!window.location.pathname.startsWith("/login-form")) {
        window.location.replace("/login-form/");
        return;
      } else {
        window.currentUser = null;
        window.savedRecipes = new Set();
        document.dispatchEvent(new CustomEvent("user-ready", { detail: { user: null } }));
        return;
      }
    }

    window.currentUser = user;

    try {
      const profileRef = doc(db, "profiles", user.uid);
      const snap = await getDoc(profileRef);
      if (!snap.exists()) {
        await setDoc(profileRef, { savedRecipes: [] }, { merge: true });
        window.savedRecipes = new Set();
      } else {
        const data = snap.data() || {};
        const arr = Array.isArray(data.savedRecipes) ? data.savedRecipes : [];
        window.savedRecipes = new Set(arr.map(String));
      }

      // helper to add a saved recipe
      window.addSavedRecipe = async (recipeId) => {
        const rid = String(recipeId);
        if (window.savedRecipes && window.savedRecipes.has(rid)) return true;
        await updateDoc(profileRef, { savedRecipes: arrayUnion(rid) });
        window.savedRecipes.add(rid);
        return true;
      };
    } catch (err) {
      console.error("Error loading profile:", err);
      window.savedRecipes = new Set();
      window.addSavedRecipe = async () => { throw new Error("Firestore unavailable"); };
    }

    document.dispatchEvent(new CustomEvent("user-ready", { detail: { user } }));
  });
</script>
