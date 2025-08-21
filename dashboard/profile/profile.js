// /dashboard/profile/profile.js
<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
  const analytics = getAnalytics(app);
</script>


// ==== DOM REFS ====
const profileInput = document.getElementById('profile-picture');
const profilePreview = document.getElementById('profile-preview');
const uploadStatus = document.getElementById('upload-status');
const saveBtn = document.getElementById('save-btn');
const logoutBtn = document.getElementById('logout-btn');

// preview local selection
profileInput.addEventListener('change', () => {
  const file = profileInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = e => profilePreview.src = e.target.result;
    reader.readAsDataURL(file);
  }
});

// watch auth state, load profile
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // not logged in -> redirect to login
    window.location.href = "/login.html";
    return;
  }

  // show user email
  document.getElementById('email').value = user.email;

  // load Firestore profile doc under users/{uid}
  const docRef = doc(db, "users", user.uid);
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById('name').value = data.name ?? "";
      document.getElementById('phone').value = data.phone ?? "";
      document.getElementById('card-number').value = data.cardNumber ?? "";
      document.getElementById('expiry').value = data.expiry ?? "";
      document.getElementById('cvc').value = data.cvc ?? "";
      document.getElementById('calories').value = data.calories ?? "";
      document.getElementById('protein').value = data.protein ?? "";
      document.getElementById('carbs').value = data.carbs ?? "";
      document.getElementById('fats').value = data.fats ?? "";
      if (data.profilePictureUrl) {
        profilePreview.src = data.profilePictureUrl;
      }
    } else {
      // doc doesn't exist — create a minimal doc to be safe
      await setDoc(docRef, {
        email: user.email,
        createdAt: serverTimestamp()
      }, { merge: true });
    }
  } catch (err) {
    console.error("Error loading profile:", err);
  }
});

// helper: upload image to Firebase Storage and return download URL
async function uploadProfileImage(uid, file) {
  if (!file) return null;
  const path = `profiles/${uid}/profile.${file.name.split('.').pop()}`; // keep original ext
  const ref = storageRef(storage, path);
  const uploadTask = uploadBytesResumable(ref, file);

  return new Promise((resolve, reject) => {
    uploadTask.on('state_changed',
      (snapshot) => {
        // progress
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        uploadStatus.textContent = `Uploading image: ${pct}%`;
      },
      (error) => {
        console.error("Upload failed:", error);
        uploadStatus.textContent = "Image upload failed.";
        reject(error);
      },
      async () => {
        // success
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          uploadStatus.textContent = "Upload complete.";
          resolve(downloadURL);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

// save profile handler
saveBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return alert("You must be logged in to save your profile.");

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    const uid = user.uid;
    const file = profileInput.files[0];
    let profilePictureUrl = null;

    if (file) {
      try {
        profilePictureUrl = await uploadProfileImage(uid, file);
      } catch (uploadErr) {
        console.error("Profile image upload error:", uploadErr);
        // continue — we still allow saving other fields even if image fails
      }
    }

    const userData = {
      name: document.getElementById('name').value || "",
      phone: document.getElementById('phone').value || "",
      cardNumber: document.getElementById('card-number').value || "",
      expiry: document.getElementById('expiry').value || "",
      cvc: document.getElementById('cvc').value || "",
      calories: parseNumberOrNull(document.getElementById('calories').value),
      protein: parseNumberOrNull(document.getElementById('protein').value),
      carbs: parseNumberOrNull(document.getElementById('carbs').value),
      fats: parseNumberOrNull(document.getElementById('fats').value),
      updatedAt: serverTimestamp()
    };

    if (profilePictureUrl) {
      userData.profilePictureUrl = profilePictureUrl;
    }

    await setDoc(doc(db, "users", uid), userData, { merge: true });
    alert("Profile saved successfully!");
  } catch (err) {
    console.error("Error saving profile:", err);
    alert("An error occurred while saving your profile.");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Profile";
    setTimeout(() => uploadStatus.textContent = "", 2000);
  }
});

function parseNumberOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// logout
logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = "/login.html";
});
