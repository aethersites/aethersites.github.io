import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
// <-- Add Firestore import right after the auth import
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

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
// <-- Initialize Firestore here
const db = getFirestore(app);

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
        // capture the user credential so we have the created user's UID
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // --- Create user doc in "users" collection ---
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email || "",
          name: { first: "", last: "" },
          phone: "",
          profilePicture: "",
          createdAt: serverTimestamp(),
          stripeCustomerId: "",
          subscriptionTier: "free"
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
          defaultServingSize: 100,      // number
          defaultServingUnit: "g",      // optional but recommended
          householdSize: 1,

          groceryLists: [],
          pantryItems: [],
          customIngredients: [],
          savedRecipes: [],
          spendingHistory: [],
          calorieHistory: [],
          aiSuggestionsEnabled: true,
          notificationsEnabled: true
        });

        // Only show success + redirect after Firestore writes succeed
        document.getElementById('signupSuccessMessage').classList.add('show');
        setTimeout(() => window.location.href = '/dashboard/', 2000);
    } catch (error) {
        // This catch will handle both auth and Firestore errors
        if (error.code && error.code.includes('email')) {
            document.getElementById('signupEmailError').textContent = error.message;
            document.getElementById('signupEmailError').classList.add('show');
        } else if (error.code && error.code.includes('password')) {
            document.getElementById('signupPasswordError').textContent = error.message;
            document.getElementById('signupPasswordError').classList.add('show');
        } else {
            // generic error fallback
            document.getElementById('signupEmailError').textContent = error.message || String(error);
            document.getElementById('signupEmailError').classList.add('show');
        }
    }
});
