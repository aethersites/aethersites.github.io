// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "redacted", // <-- replace with your actual key
  authDomain: "redacted",
  projectId: "redacted",
  storageBucket: "redacted",
  messagingSenderId: "redacted",
  appId: "redacted"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Utility: Fetch profile from your backend (you must implement this API endpoint)
async function fetchUserProfile(uid) {
  const response = await fetch(`/api/user/${uid}`);
  if (!response.ok) throw new Error("Failed to fetch user profile");
  return await response.json(); // Should include { subscriptionTier: "pro" | "premium" | "free", ... }
}

// UI: Remove pro badges and upgrade button for pro/premium users
function updateProUI(user, tier) {
  const subscriptionTier = (tier || user?.subscriptionTier || "").toLowerCase();
  const allowedTiers = ["pro", "premium"];
  if (allowedTiers.includes(subscriptionTier)) {
    document.querySelectorAll('.pro-badge').forEach(badge => badge.remove());
    document.querySelectorAll('.upgrade-btn-main').forEach(btn => btn.remove());
  }
}

// UI: Redirect if not logged in
function redirectIfNotLoggedIn(user, redirectUrl = '/login') {
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
