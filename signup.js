import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
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
        // Create user and get UID
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Unified user/profile object for both collections (single source of truth)
        const baseUserData = {
            uid: user.uid,
            email: user.email || "",
            name: { first: "", last: "" },
            fullName: "",
            phone: "",
            profilePicture: "",
            createdAt: serverTimestamp(),
            updatedAt: new Date().toISOString(),
            stripeCustomerId: "",
            subscriptionTier: "free",
            address: "",
            avatarDataUrl: "",
            bio: "",
            dietTags: [],
            location: "",
            nutritionGoals: {
                calories: 2000,
                protein: 50,
                carbs: 250,
                fats: 70
            },
            nutritionGoalsString: "", // compatibility as string
            preferredDelivery: "",
            units: "metric"
        };

        const baseProfileData = {
            // Account basics
            aboutMe: "",
            aiSuggestionsEnabled: true,
            notificationsEnabled: true,
            lastSyncedAt: null,
            defaultCurrency: "USD",
            preferredUnits: "metric",
            defaultServingSize: 1,
            defaultServingUnit: "g",
            
            // Nutrition
            nutritionGoals: baseUserData.nutritionGoals,
            nutritionInfo: {
                allergies: [],
                dietaryType: ""
            },
            calorieHistory: [],
            
            // Household
            householdSize: 1,
            
            // Food Data
            groceryLists: [],
            pantryItems: [],
            customIngredients: [],
            
            // Recipes
            savedRecipes: [],
            
            // Financial
            spendingHistory: [],
            
            // User info mirror fields (for convenience/consistency)
            fullName: baseUserData.fullName,
            phone: baseUserData.phone,
            profilePicture: baseUserData.profilePicture,
            updatedAt: baseUserData.updatedAt,
            stripeCustomerId: baseUserData.stripeCustomerId,
            subscriptionTier: baseUserData.subscriptionTier,
            address: baseUserData.address,
            avatarDataUrl: baseUserData.avatarDataUrl,
            bio: baseUserData.bio,
            dietTags: baseUserData.dietTags,
            location: baseUserData.location,
            nutritionGoalsString: baseUserData.nutritionGoalsString,
            preferredDelivery: baseUserData.preferredDelivery,
            units: baseUserData.units
        };

        // Write both docs simultaneously with all fields
        await Promise.all([
            setDoc(doc(db, "users", user.uid), baseUserData, { merge: true }),
            setDoc(doc(db, "profiles", user.uid), baseProfileData, { merge: true })
        ]);

        // Success message and redirect
        document.getElementById('signupSuccessMessage').classList.add('show');
        setTimeout(() => window.location.href = '/dashboard/', 2000);
    } catch (error) {
        // Auth & Firestore error handling
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
