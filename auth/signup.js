// /auth/signup.js
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
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Create a minimal user document in Firestore so profile page can read defaults
        // You can extend this with more defaults as needed
        await setDoc(doc(db, "users", user.uid), {
            email: user.email,
            createdAt: serverTimestamp(),
            // optional defaults:
            name: "",
            phone: "",
            profilePictureUrl: "",
            cardNumber: "",
            expiry: "",
            cvc: "",
            calories: null,
            protein: null,
            carbs: null,
            fats: null
        }, { merge: true });

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
            document.getElementById('signupEmailError').textContent = error.message;
            document.getElementById('signupEmailError').classList.add('show');
        }
    }
});
