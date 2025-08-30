// loginredirect.js
// Loads Firebase, checks auth state, and redirects to /login-form/ if not logged in

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "redacted", // <-- REPLACE with your real config
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "your-messagingSenderId",
  appId: "your-appId",
  measurementId: "your-measurementId"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
getAnalytics(app);

const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
  if (!user) {
    // Not logged in, redirect to login form
    window.location.replace("/login-form/");
  } else {
    // Logged in, make user available globally
    window.currentUser = user;
    // Optionally, you can fire a custom event for other scripts to listen for:
    // document.dispatchEvent(new CustomEvent('user-logged-in', { detail: user }));
  }
});
