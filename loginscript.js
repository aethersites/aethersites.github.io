/* Safe & improved Soft Minimalism Login Form JS
   - Safer getReturnUrl (prevents protocol-relative/external redirects)
   - Null-checks everywhere
   - Single redirect after successful sign-in
   - Keyboard + pointer accessibility for password toggle
   - Social sign-ins use getReturnUrl()
*/

function getReturnUrl() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");
  // Prefer validated "next" param (resolve relative -> check same-origin)
  if (next) {
    try {
      const resolved = new URL(next, location.origin); // will throw on invalid
      if (resolved.origin === location.origin) {
        // Return path+search+hash (keeps it relative to current origin)
        return resolved.pathname + resolved.search + resolved.hash;
      }
    } catch (err) {
      // ignore and fall through to referrer fallback
    }
  }

  // Fallback: use referrer if same-origin
  try {
    if (document.referrer) {
      const ref = new URL(document.referrer);
      if (ref.origin === location.origin) return ref.pathname + ref.search + ref.hash;
    }
  } catch (err) {
    // ignore
  }
  return "/dashboard/";
}

class SoftMinimalismLoginForm {
  constructor() {
    // grab main form early and abort safely if not present
    this.form = document.getElementById('loginForm');
    if (!this.form) {
      console.warn('SoftMinimalismLoginForm: #loginForm not found; aborting initialization.');
      return;
    }

    // cache major fields (may be null-checked before use)
    this.emailInput = document.getElementById('email');
    this.passwordInput = document.getElementById('password');
    this.passwordToggle = document.getElementById('passwordToggle');
    this.submitButton = this.form.querySelector('.comfort-button');
    this.successMessage = document.getElementById('successMessage');
    this.socialButtons = Array.from(document.querySelectorAll('.social-soft'));

    // small cache for elements referenced on show/hide
    this._comfortSocial = document.querySelector('.comfort-social');
    this._comfortSignup = document.querySelector('.comfort-signup');
    this._gentleDivider = document.querySelector('.gentle-divider');

    this.init();
  }

  init() {
    this.bindEvents();
    this.setupPasswordToggle();
    this.setupGentleEffects();
  }

  bindEvents() {
    // Form submit
    if (this.form) this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    // Inputs: graceful if they don't exist
    if (this.emailInput) {
      this.emailInput.addEventListener('blur', () => this.validateEmail());
      this.emailInput.addEventListener('input', () => this.clearError('email'));
      this.emailInput.setAttribute('placeholder', ' ');
    }
    if (this.passwordInput) {
      this.passwordInput.addEventListener('blur', () => this.validatePassword());
      this.passwordInput.addEventListener('input', () => this.clearError('password'));
      this.passwordInput.setAttribute('placeholder', ' ');
    }

    // Pointer accessibility for click effects
    this.addGentleClickEffects();
  }

  setupPasswordToggle() {
    if (!this.passwordToggle || !this.passwordInput) return;

    const toggleFn = () => {
      const newType = this.passwordInput.type === 'password' ? 'text' : 'password';
      this.passwordInput.type = newType;
      this.passwordToggle.classList.toggle('toggle-active', newType === 'text');
      this.passwordToggle.setAttribute('aria-pressed', String(newType === 'text'));
      this.triggerGentleRipple(this.passwordToggle);
    };

    this.passwordToggle.addEventListener('click', toggleFn);

    // Keyboard support (Enter & Space)
    this.passwordToggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleFn();
      }
    });
  }

  setupGentleEffects() {
    [this.emailInput, this.passwordInput].forEach(input => {
      if (!input) return;
      const container = input.closest('.field-container');
      input.addEventListener('focus', (e) => {
        if (container) this.triggerSoftFocus(container);
      });
      input.addEventListener('blur', (e) => {
        if (container) this.releaseSoftFocus(container);
      });
    });
  }

  triggerSoftFocus(container) {
    // Add subtle glow animation
    if (!container) return;
    container.style.transition = 'all 0.26s ease';
    container.style.transform = 'translateY(-1px)';
  }

  releaseSoftFocus(container) {
    if (!container) return;
    container.style.transform = 'translateY(0)';
  }

  triggerGentleRipple(element) {
    if (!element) return;
    // small visual feedback; use rAF-friendly style changes
    element.style.transform = 'scale(0.95)';
    requestAnimationFrame(() => {
      setTimeout(() => element.style.transform = 'scale(1)', 120);
    });
  }

  addGentleClickEffects() {
    const interactiveElements = Array.from(document.querySelectorAll('.comfort-button, .social-soft, .gentle-checkbox'));
    if (!interactiveElements.length) return;

    interactiveElements.forEach(element => {
      // pointer events (covers mouse + touch + pen)
      element.addEventListener('pointerdown', () => element.style.transform = 'scale(0.98)');
      element.addEventListener('pointerup', () => element.style.transform = 'scale(1)');
      element.addEventListener('pointercancel', () => element.style.transform = 'scale(1)');
      element.addEventListener('mouseleave', () => element.style.transform = 'scale(1)');
    });
  }

  validateEmail() {
    if (!this.emailInput) return false;
    const email = this.emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      this.showError('email', 'Please enter your email address');
      return false;
    }
    if (!emailRegex.test(email)) {
      this.showError('email', 'Please enter a valid email address');
      return false;
    }
    this.clearError('email');
    return true;
  }

  validatePassword() {
    if (!this.passwordInput) return false;
    const password = this.passwordInput.value;

    if (!password) {
      this.showError('password', 'Please enter your password');
      return false;
    }
    if (password.length < 6) {
      this.showError('password', 'Password must be at least 6 characters');
      return false;
    }
    this.clearError('password');
    return true;
  }

  showError(field, message) {
    const inputEl = document.getElementById(field);
    const softField = inputEl ? inputEl.closest('.soft-field') : null;
    const errorElement = document.getElementById(`${field}Error`);

    if (softField) softField.classList.add('error');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.add('show');
    }

    if (softField) this.triggerGentleShake(softField);
  }

  clearError(field) {
    const inputEl = document.getElementById(field);
    const softField = inputEl ? inputEl.closest('.soft-field') : null;
    const errorElement = document.getElementById(`${field}Error`);

    if (softField) softField.classList.remove('error');
    if (errorElement) {
      errorElement.classList.remove('show');
      // Clear text after small delay for transition smoothness
      setTimeout(() => { errorElement.textContent = ''; }, 300);
    }
  }

  triggerGentleShake(element) {
    if (!element) return;
    // Use short transform-based shake
    element.style.transition = 'transform 0.12s ease';
    element.style.transform = 'translateX(6px)';
    setTimeout(() => element.style.transform = 'translateX(-6px)', 100);
    setTimeout(() => element.style.transform = 'translateX(0)', 200);
  }

  async handleSubmit(e) {
    e.preventDefault();
    if (!this.form) return;

    const isEmailValid = this.validateEmail();
    const isPasswordValid = this.validatePassword();
    if (!isEmailValid || !isPasswordValid) return;

    this.setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        this.emailInput.value.trim(),
        this.passwordInput.value
      );

      // show success animation (no redirect inside showGentleSuccess)
      this.showGentleSuccess();

      // Single redirect after animation completes (use getReturnUrl)
      const returnUrl = getReturnUrl();
      setTimeout(() => { window.location.href = returnUrl; }, 3000);

    } catch (error) {
      // optionally map specific firebase error codes to messages
      console.error('Sign in failed', error);
      this.showError('password', 'Sign in failed. Please check credentials and try again.');
    } finally {
      this.setLoading(false);
    }
  }

  setLoading(loading) {
    if (this.submitButton) {
      this.submitButton.classList.toggle('loading', loading);
      this.submitButton.disabled = loading;
    }

    this.socialButtons.forEach(button => {
      button.style.pointerEvents = loading ? 'none' : 'auto';
      button.style.opacity = loading ? '0.5' : '1';
    });
  }

  showGentleSuccess() {
    if (this.form) {
      this.form.style.transition = 'all 0.35s ease';
      this.form.style.transform = 'scale(0.95)';
      this.form.style.opacity = '0';
      this.form.style.filter = 'blur(1px)';
    }

    // hide optional pieces if they exist
    if (this._comfortSocial) this._comfortSocial.style.display = 'none';
    if (this._comfortSignup) this._comfortSignup.style.display = 'none';
    if (this._gentleDivider) this._gentleDivider.style.display = 'none';

    if (this.successMessage) {
      // show success message without immediately redirecting
      this.successMessage.classList.add('show');
    }
    this.triggerSuccessGlow();
  }

  triggerSuccessGlow() {
    const card = document.querySelector('.soft-card');
    if (!card) return;
    const originalShadow = card.style.boxShadow || '';
    card.style.boxShadow = `
      0 20px 40px rgba(240, 206, 170, 0.22),
      0 8px 24px rgba(240, 206, 170, 0.14),
      inset 0 1px 0 rgba(255, 255, 255, 0.8)
    `;
    setTimeout(() => { card.style.boxShadow = originalShadow; }, 2000);
  }
}

// Firebase initialization (unchanged, but ensure rules and server validation)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

// Your Firebase config (ok to expose client config; secure sensitive operations server-side)
const firebaseConfig = {
  apiKey: "AIzaSyCOHC_OvQ4onPkhLvHzZEPazmY6PRcxjnw",
  authDomain: "goodplates-7ae36.firebaseapp.com",
  projectId: "goodplates-7ae36",
  storageBucket: "goodplates-7ae36.appspot.com", // check your bucket domain if needed
  messagingSenderId: "541149626283",
  appId: "1:541149626283:web:928888f0b42cda49b7dcee",
  measurementId: "G-HKMSHM726J"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

// Social login buttons: use getReturnUrl for destination
document.getElementById("googleButton")?.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log("Google login:", result.user.email);
    window.location.href = getReturnUrl();
  } catch (err) {
    console.error(err);
  }
});

document.getElementById("facebookButton")?.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, facebookProvider);
    console.log("Facebook login:", result.user.email);
    window.location.href = getReturnUrl();
  } catch (err) {
    console.error(err);
  }
});

// Auth state listener (protect dashboard)
onAuthStateChanged(auth, user => {
  if (user) {
    console.log("Logged in:", user.email);
  } else {
    console.log("Not logged in");
    // Example protection: if on dashboard route, redirect to index
    if (window.location.pathname.includes("dashboard")) {
      window.location.href = "index.html";
    }
  }
});

// Logout button (safe-guard existence)
document.getElementById("logout")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch (err) {
    console.error('Sign out failed', err);
  }
});

// Initialize the soft form when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SoftMinimalismLoginForm();
});
