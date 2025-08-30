import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

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

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
// getAnalytics(app); // Optional

const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
  console.log("Auth state changed. User is:", user); // Debugging!
  if (!user) {
    if (!window.location.pathname.startsWith("/login-form")) {
      window.location.replace("/login-form/");
    }
  } else {
    window.currentUser = user;
  }
});
