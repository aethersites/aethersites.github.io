// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCOHC_OvQ4onPkhLvHzZEPazmY6PRcxjnw",
    authDomain: "goodplates-7ae36.firebaseapp.com",
    projectId: "goodplates-7ae36",
    storageBucket: "goodplates-7ae36.firebasestorage.app",
    messagingSenderId: "541149626283",
    appId: "1:541149626283:web:928888f0b42cda49b7dcee",
    measurementId: "G-HKMSHM726J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Utility: Fetch profile from Firestore
async function fetchUserProfile(uid) {
  const userDoc = await getDoc(doc(db, "users", uid));
  if (!userDoc.exists()) throw new Error("User not found");
  const data = userDoc.data();
  console.log("Fetched user profile:", data); // Debug log
  return data; // Should include { subscriptionTier: "pro" | "premium" | "free", ... }
}

// UI: Remove pro badges and upgrade button for pro/premium users
function updateProUI(user, tier) {
  const subscriptionTier = (tier || user?.subscriptionTier || "").toLowerCase();
  console.log("updateProUI called with tier:", subscriptionTier); // Debug log
  const allowedTiers = ["pro", "premium"];
  if (allowedTiers.includes(subscriptionTier)) {
    document.querySelectorAll('.pro-badge').forEach(badge => badge.remove());
    document.querySelectorAll('.upgrade-btn-main').forEach(btn => btn.remove());
  }
}

// UI: Redirect if not logged in
function redirectIfNotLoggedIn(user, redirectUrl = '/login-form') {
  if (!user || !(user.uid || user.id || user.email)) {
    window.location.href = redirectUrl;
  }
}

// Main: Listen for auth changes, fetch profile, and update UI
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const profile = await fetchUserProfile(user.uid);
      updateProUI(profile); // Use profile.subscriptionTier!
      // You can also use additional profile data here as needed
    } catch (err) {
      console.error("Failed to load user profile:", err);
    }
  }
  redirectIfNotLoggedIn(user);
});

// Optionally, expose for debugging
window.updateProUI = updateProUI;
window.redirectIfNotLoggedIn = redirectIfNotLoggedIn;
