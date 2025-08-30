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
  email: "",
  name: { first: "", last: "" },
  phone: "",
  profilePicture: "",
  createdAt: serverTimestamp(),
  stripeCustomerId: "",
  subscriptionTier: "",
  fullName: "",
  updatedAt: serverTimestamp(),
  address: "",
  avatarDataUrl: "",
  bio: "",
  dietTags: [],
  location: "",
  nutritionGoalsNote: "",
  preferredDelivery: "",
  units: ""
});

// --- Create profile doc in "profiles" collection ---
await setDoc(doc(db, "profiles", user.uid), {
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
  aboutMe: "",
  preferredUnits: "",
  defaultServingSize: 0,
  defaultServingUnit: "",
  householdSize: 0,
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
  defaultCurrency: ""
});

// --- Subcollections: example data ---
await setDoc(doc(db, "profiles", user.uid, "budgets", "2025-08"), {
  periodKey: "",
  category: "",
  targetCents: 0,
  warnThresholdPct: 0,
  lastUpdated: serverTimestamp()
});

await setDoc(doc(db, "profiles", user.uid, "stats_daily", "2025-08-29"), {
  dayKey: "",
  totalSpentCents: 0,
  grocerySpentCents: 0,
  pantryAdjustCents: 0,
  eventCount: 0,
  lastUpdated: serverTimestamp()
});

await setDoc(doc(db, "profiles", user.uid, "stats_monthly", "2025-08"), {
  monthKey: "",
  totalSpentCents: 0,
  grocerySpentCents: 0,
  eventCount: 0,
  lastUpdated: serverTimestamp()
});

await addDoc(collection(db, "profiles", user.uid, "inventoryEvents"), {
  itemId: "",
  itemName: "",
  action: "",
  from: null,
  to: "",
  delta: 0,
  quantityBefore: 0,
  quantityAfter: 0,
  priceCents: 0,
  currency: "",
  timestamp: serverTimestamp(),
  dayKey: "",
  monthKey: "",
  meta: { vendor: "", note: "" }
});

await addDoc(collection(db, "profiles", user.uid, "spending"), {
  date: serverTimestamp(),
  amountCents: 0,
  currency: "",
  vendor: "",
  items: [
    { itemId: "", name: "", qty: 0, priceCents: 0, notes: "" },
    { itemId: "", name: "", qty: 0, priceCents: 0, notes: "" }
  ]
});

// --- Subcollections: recipe example data ---
await setDoc(doc(db, "recipes", "abc123"), {
  title: "",
  image: "",
  tags: [],
  rating: 0,
  cookTime: 0,
  nutrition: { calories: 0, kcal: 0 },
  servings: 0,
  ingredients: [],
  steps: [],
  cuisine: "",
  mealtype: "",
  updatedAt: serverTimestamp()
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
