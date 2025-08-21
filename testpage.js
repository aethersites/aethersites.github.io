<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
  import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

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
  const db = getFirestore(app);

  (async () => {
    try {
      const t0 = performance.now();
      const snap = await getDoc(doc(db, "users", "testDoc"));
      console.log("getDoc success", snap.exists() ? snap.data() : "no doc", "t=", performance.now()-t0);
    } catch (e) {
      console.error("getDoc error", e);
    }
  })();
</script>
