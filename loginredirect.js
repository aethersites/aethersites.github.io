// loginredirect.js
// Loads Firebase, checks auth state, and redirects to /login-form/ if not logged in

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";

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
