// /logout.js

import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

// Get the Firebase Auth instance
const auth = getAuth();

// Wait for the auth state to be ready before signing out
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in, sign them out
    signOut(auth)
      .then(() => {
        console.log("User signed out successfully.");
        // Optionally: show confirmation or redirect after sign-out
        // Example: Redirect to homepage after 2 seconds
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      })
      .catch((error) => {
        console.error("Sign-out error:", error);
      });
  } else {
    // User is already signed out, optionally redirect immediately
    console.log("No user signed in.");
    setTimeout(() => {
      window.location.href = "/";
    }, 2000);
  }
});
