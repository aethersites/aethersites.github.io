// signup.js (fixed)
// === Import Firebase v10 (matches your grocery.js) ===
import { initializeApp, getApps, getApp } 
  from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } 
  from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, serverTimestamp, collection, addDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/* ---------- FIREBASE CONFIG (keep your keys here) ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyCOHC_OvQ4onPkhLvHzZEPazmY6PRcxjnw",
  authDomain: "goodplates-7ae36.firebaseapp.com",
  projectId: "goodplates-7ae36",
  storageBucket: "goodplates-7ae36.firebasestorage.app",
  messagingSenderId: "541149626283",
  appId: "1:541149626283:web:928888f0b42cda49b7dcee",
  measurementId: "G-HKMSHM726J"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Create the initial user/profile documents + example subdocs.
 * This function is idempotent: it will not overwrite existing documents.
 */
async function createUserDocs(user) {
  if (!user || !user.uid) throw new Error('Invalid user object');

  const uid = user.uid;
  const usersRef = doc(db, "users", uid);
  const profilesRef = doc(db, "profiles", uid);

  // Build the users document exactly as the structure you provided.
  // We use serverTimestamp() for createdAt/updatedAt to keep Firestore timestamp types.
  const usersDoc = {
    uid: uid,
    email: user.email || "",
    name: { first: "", last: "" },
    fullName: user.displayName || "",
    phone: "",
    profilePicture: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    stripeCustomerId: "",
    subscriptionTier: "free",
    address: "",
    avatarDataUrl: "",
    bio: "",
    dietTags: [],
    location: "",
    nutritionGoals: "",           // as per your example (empty string)
    preferredDelivery: "",
    units: "metric"
  };

  // Build the profiles document matching your spec
  const profilesDoc = {
    aboutMe: "",
    aiSuggestionsEnabled: false,
    notificationsEnabled: false,
    lastSyncedAt: null,
    defaultCurrency: "USD",
    preferredUnits: "metric",
    defaultServingSize: 0,
    defaultServingUnit: "",
    householdSize: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),

    nutritionGoals: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0
    },

    nutritionInfo: {
      allergies: [],
      dietaryType: ""
    },

    calorieHistory: [
      {
        // example entry as in your sample
        date: "2025-08-30T00:00:00Z",
        caloriesConsumed: 0
      }
    ],

    groceryLists: [
      {
        id: "list-1",
        name: "",
        createdAt: "2025-08-31T12:00:00Z",
        updatedAt: "2025-08-31T12:00:00Z",
        currency: "USD",
        items: [
          { name: "", quantity: 0, price: 0.0, priceCents: 0 }
        ]
      }
    ],

    pantryItems: [
      {
        id: "pantry-1",
        name: "",
        quantity: 0,
        price: 0.0,
        priceCents: 0,
        createdAt: "2025-08-31T12:00:00Z",
        updatedAt: "2025-08-31T12:00:00Z",
        expirationDate: null,
        currency: "USD"
      }
    ],

    customIngredients: [
      { name: "", quantity: 0, price: 0.0, calories: 0 }
    ],

    savedRecipes: [],
    spendingHistory: [
      { date: "2025-08-31T12:00:00Z", amount: 0 }
    ]
  };

  try {
    // only write users doc if it doesn't exist (avoid overwriting)
    const userSnap = await getDoc(usersRef);
    if (!userSnap.exists()) {
      await setDoc(usersRef, usersDoc);
      console.log("Created users doc for", uid);
    } else {
      console.log("users doc already exists for", uid);
    }
  } catch (err) {
    console.error("Failed to create users doc:", err);
  }

  try {
    // only write profiles doc if it doesn't exist
    const profileSnap = await getDoc(profilesRef);
    if (!profileSnap.exists()) {
      await setDoc(profilesRef, profilesDoc);
      console.log("Created profiles doc for", uid);
    } else {
      console.log("profiles doc already exists for", uid);
    }
  } catch (err) {
    console.error("Failed to create profiles doc:", err);
  }

  // Create example subcollection documents (safe: they use deterministic IDs you showed).
  // If you don't want these example docs present, remove these setDoc calls.
  try {
    await setDoc(doc(db, "profiles", uid, "budgets", "2025-08"), {
      periodKey: "2025-08",
      category: "",
      targetCents: 0,
      warnThresholdPct: 0,
      lastUpdated: null
    });
  } catch (err) {
    console.error("Failed to create budgets subdoc:", err);
  }

  try {
    await setDoc(doc(db, "profiles", uid, "stats_daily", "2025-08-29"), {
      dayKey: "2025-08-29",
      totalSpentCents: 0,
      grocerySpentCents: 0,
      pantryAdjustCents: 0,
      eventCount: 0,
      lastUpdated: null
    });
  } catch (err) {
    console.error("Failed to create stats_daily subdoc:", err);
  }

  try {
    await setDoc(doc(db, "profiles", uid, "stats_monthly", "2025-08"), {
      monthKey: "2025-08",
      totalSpentCents: 0,
      grocerySpentCents: 0,
      eventCount: 0,
      lastUpdated: null
    });
  } catch (err) {
    console.error("Failed to create stats_monthly subdoc:", err);
  }

  // inventoryEvents: example auto-id entry
  try {
    await addDoc(collection(db, "profiles", uid, "inventoryEvents"), {
      itemId: "",
      itemName: "",
      action: "",
      from: null,
      to: null,
      delta: 0,
      quantityBefore: 0,
      quantityAfter: 0,
      priceCents: 0,
      currency: "USD",
      timestamp: serverTimestamp(),
      dayKey: "2025-08-31",
      monthKey: "2025-08",
      meta: { vendor: "", note: "" }
    });
  } catch (err) {
    console.error("Failed to create inventoryEvents example:", err);
  }

  // spending: example auto-id entry
  try {
    await addDoc(collection(db, "profiles", uid, "spending"), {
      date: serverTimestamp(),
      amountCents: 0,
      currency: "USD",
      vendor: "",
      items: [
        { itemId: "", name: "", qty: 0, priceCents: 0, notes: "" }
      ]
    });
  } catch (err) {
    console.error("Failed to create spending example:", err);
  }
}

/* --------------------------
   Form handling (signup page)
   -------------------------- */
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailEl = document.getElementById('signupEmail');
    const pwEl = document.getElementById('signupPassword');
    const email = emailEl ? emailEl.value.trim() : "";
    const password = pwEl ? pwEl.value : "";

    // clear UI errors (if any)
    const emailErr = document.getElementById('signupEmailError');
    const pwErr = document.getElementById('signupPasswordError');
    if (emailErr) { emailErr.textContent = ''; emailErr.classList.remove('show'); }
    if (pwErr) { pwErr.textContent = ''; pwErr.classList.remove('show'); }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // create user/profile docs (idempotent)
      await createUserDocs(user);

      // show success and redirect to dashboard
      const successEl = document.getElementById('signupSuccessMessage');
      if (successEl) successEl.classList.add('show');
      // short delay for UX; if you prefer immediate redirect, remove setTimeout
      setTimeout(() => window.location.href = '/dashboard/', 1200);
    } catch (error) {
      const msg = error && error.message ? error.message : String(error);
      if (error && error.code && error.code.includes('email')) {
        if (emailErr) { emailErr.textContent = msg; emailErr.classList.add('show'); }
      } else if (error && error.code && error.code.includes('weak-password') || (error && error.code && error.code.includes('password'))) {
        if (pwErr) { pwErr.textContent = msg; pwErr.classList.add('show'); }
      } else {
        if (emailErr) { emailErr.textContent = msg; emailErr.classList.add('show'); }
      }
      console.error('Signup error:', error);
    }
  });
}

/* --------------------------
   Google Sign-in button
   -------------------------- */
const googleBtn = document.getElementById('googleButton');
if (googleBtn) {
  googleBtn.addEventListener('click', async () => {
    // clear UI errors (if any)
    const emailErr = document.getElementById('signupEmailError');
    const pwErr = document.getElementById('signupPasswordError');
    if (emailErr) { emailErr.textContent = ''; emailErr.classList.remove('show'); }
    if (pwErr) { pwErr.textContent = ''; pwErr.classList.remove('show'); }

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Ensure user/profile docs exist (idempotent)
      await createUserDocs(user);

      const successEl = document.getElementById('signupSuccessMessage');
      if (successEl) successEl.classList.add('show');
      setTimeout(() => window.location.href = '/dashboard/', 1200);
    } catch (error) {
      const emailErrEl = document.getElementById('signupEmailError');
      if (emailErrEl) {
        emailErrEl.textContent = error && error.message ? error.message : String(error);
        emailErrEl.classList.add('show');
      }
      console.error('Google sign-in error:', error);
    }
  });
}
