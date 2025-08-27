// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
// If you want analytics, you can import it too:
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";

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
// const analytics = getAnalytics(app); // Optional

// Initialize Firebase Auth
const auth = getAuth(app);

// Your UI functions (copy these from your HTML, or import if using modules)
function redirectIfNotLoggedIn(user, redirectUrl = '/login') {
  if (!user || !(user.uid || user.id || user.email)) {
    window.location.href = redirectUrl;
  }
}

function updateProUI(user, tier) {
  const subscriptionTier = (tier || user?.subscriptionTier || "").toLowerCase();
  const allowedTiers = ["pro", "premium"];
  if (allowedTiers.includes(subscriptionTier)) {
    document.querySelectorAll('.pro-badge').forEach(badge => badge.remove());
    document.querySelectorAll('.upgrade-btn-main').forEach(btn => btn.remove());
  }
}

// Listen for auth changes and run your UI logic when user is available
onAuthStateChanged(auth, (user) => {
  // You may want to fetch Firestore user profile data here to get subscriptionTier!
  // For demo, assumes user.subscriptionTier exists (custom claims or added after login)
  // If you store subscriptionTier in Firestore, you need to fetch it here.

  // Example: If you store subscriptionTier in Firestore
  // If not, just use user object as-is
  updateProUI(user);
  redirectIfNotLoggedIn(user);
});

// Optionally, you can expose your functions for global usage if needed
window.updateProUI = updateProUI;
window.redirectIfNotLoggedIn = redirectIfNotLoggedIn;
