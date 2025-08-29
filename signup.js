import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp, collection, addDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

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

// Minimal helper so you don't repeat yourself
async function createUserDocs(user) {
    // --- Create user doc in "users" collection ---
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email || "",
      name: { first: "", last: "" },
      phone: "",
      profilePicture: "",
      createdAt: serverTimestamp(),
      stripeCustomerId: "",
      subscriptionTier: "free",
      fullName: "",
      updatedAt: serverTimestamp(),
      address: "",
      avatarDataUrl: "",
      bio: "",
      dietTags: [],
      location: "",
      nutritionGoalsNote: "",
      preferredDelivery: "",
      units: "metric"
    });

    // --- Create profile doc in "profiles" collection ---
    await setDoc(doc(db, "profiles", user.uid), {
      nutritionGoals: {
        calories: 2000,
        protein: 50,
        carbs: 250,
        fats: 70
      },
      nutritionInfo: {
        allergies: [],
        dietaryType: ""
      },
      aboutMe: "",
      preferredUnits: "metric",
      defaultServingSize: 1,
      defaultServingUnit: "g",
      householdSize: 1,
      groceryLists: [],
      pantryItems: [],
      customIngredients: [],
      savedRecipes: [],
      spendingHistory: [],
      calorieHistory: [],
      aiSuggestionsEnabled: true,
      notificationsEnabled: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastSyncedAt: null,
      defaultCurrency: "USD"
    });

    // --- Subcollections: example data ---
    await setDoc(doc(db, "profiles", user.uid, "budgets", "2025-08"), {
      periodKey: "2025-08",
      category: "groceries",
      targetCents: 50000,
      warnThresholdPct: 80,
      lastUpdated: serverTimestamp()
    });

    await setDoc(doc(db, "profiles", user.uid, "stats_daily", "2025-08-29"), {
      dayKey: "2025-08-29",
      totalSpentCents: 1000,
      grocerySpentCents: 800,
      pantryAdjustCents: 200,
      eventCount: 2,
      lastUpdated: serverTimestamp()
    });

    await setDoc(doc(db, "profiles", user.uid, "stats_monthly", "2025-08"), {
      monthKey: "2025-08",
      totalSpentCents: 31000,
      grocerySpentCents: 25000,
      eventCount: 12,
      lastUpdated: serverTimestamp()
    });

    await addDoc(collection(db, "profiles", user.uid, "inventoryEvents"), {
      itemId: "item123",
      itemName: "Milk",
      action: "added",
      from: null,
      to: "fridge",
      delta: 1,
      quantityBefore: 0,
      quantityAfter: 1,
      priceCents: 0,
      currency: "USD",
      timestamp: serverTimestamp(),
      dayKey: "2025-08-29",
      monthKey: "2025-08",
      meta: { vendor: "StoreX", note: "Bought on sale" }
    });

    await addDoc(collection(db, "profiles", user.uid, "spending"), {
      date: serverTimestamp(),
      amountCents: 0,
      currency: "",
      vendor: "",
      items: [
        { itemId: "item123", name: "Milk", qty: 1, priceCents: 400, notes: "" },
        { itemId: "item456", name: "Bread", qty: 2, priceCents: 400, notes: "Whole wheat" }
      ]
    });
}

const signupForm = document.getElementById('signupForm');
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;

    // Clear previous errors
    document.getElementById('signupEmailError').textContent = '';
    document.getElementById('signupPasswordError').textContent = '';
    document.getElementById('signupEmailError').classList.remove('show');
    document.getElementById('signupPasswordError').classList.remove('show');

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await createUserDocs(user);

        document.getElementById('signupSuccessMessage').classList.add('show');
        setTimeout(() => window.location.href = '/dashboard/', 2000);
    } catch (error) {
        if (error.code && error.code.includes('email')) {
            document.getElementById('signupEmailError').textContent = error.message;
            document.getElementById('signupEmailError').classList.add('show');
        } else if (error.code && error.code.includes('password')) {
            document.getElementById('signupPasswordError').textContent = error.message;
            document.getElementById('signupPasswordError').classList.add('show');
        } else {
            document.getElementById('signupEmailError').textContent = error.message || String(error);
            document.getElementById('signupEmailError').classList.add('show');
        }
    }
});

// --- Google Sign In ---
const googleBtn = document.getElementById('googleButton');
if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
        document.getElementById('signupEmailError').textContent = '';
        document.getElementById('signupPasswordError').textContent = '';
        document.getElementById('signupEmailError').classList.remove('show');
        document.getElementById('signupPasswordError').classList.remove('show');
        try {
            const provider = new GoogleAuthProvider();
            const userCredential = await signInWithPopup(auth, provider);
            const user = userCredential.user;
            await createUserDocs(user);

            document.getElementById('signupSuccessMessage').classList.add('show');
            setTimeout(() => window.location.href = '/dashboard/', 2000);
        } catch (error) {
            document.getElementById('signupEmailError').textContent = error.message || String(error);
            document.getElementById('signupEmailError').classList.add('show');
        }
    });
}
