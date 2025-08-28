// /js/firebasedata.js
// Firestore User/Profile Loader — now with config+API key support!
// Usage: import loader from './js/firebasedata.js'
// Exposes: loader.ready (Promise), loader.onReady(cb), loader.onUpdate(cb),
// loader.getProfile(uid), loader.setProfileField(uid, field, value), loader.setProfileFields(uid, updates),
// loader.subscribeToProfile(uid), loader.bindInput(inputEl, uid, field, opts), loader.init(configOrApp, opts)
// loader.currentUser, loader.onAuth(cb)

import {
  initializeApp,
  getApps
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
  query,
  orderBy,
  updateDoc,
  limit as limitFn,
  startAfter
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const DEFAULT_OPTIONS = {
  usersCollection: 'users',
  profilesCollection: 'profiles',
  realtime: true,
  autoFetch: true,
  orderByField: null,
  pollForAppTimeoutMs: 4000,
  pollIntervalMs: 150,
  pageSize: 100 // used if you use fetchPage
};

function noop() {}
function isFunction(v) { return typeof v === 'function'; }
function shallowClone(obj) { return obj ? { ...obj } : obj; }

function debounce(fn, wait) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

class FirebaseDataLoader {
  constructor(options = {}) {
    this.opts = { ...DEFAULT_OPTIONS, ...options };
    this.db = null;
    this.users = new Map();
    this.profiles = new Map();

    // Auth state
    this.currentUser = null;
    this._authListeners = new Set();

    // per-collection realtime unsubs
    this._unsubs = [];
    // per-doc unsubs (uid -> unsub)
    this._perDocUnsubs = new Map();
    // subscribers
    this._listeners = new Set();

    this._isInitialized = false;

    this._ready = new Promise((resolve, reject) => {
      this._readyResolve = resolve;
      this._readyReject = reject;
    });

    // Try auto-init if window.FirebaseConfig exists (for legacy or config-in-page)
    if (typeof window !== 'undefined' && window.FirebaseConfig) {
      Promise.resolve().then(() => this.init(window.FirebaseConfig).catch(err => this._readyReject(err)));
    } else if (typeof window !== 'undefined' && window.app) {
      Promise.resolve().then(() => this.init(window.app).catch(err => this._readyReject(err)));
    } else if (this.opts.pollForAppTimeoutMs > 0) {
      const start = Date.now();
      this._autoInitPollTimer = setInterval(() => {
        if (typeof window !== 'undefined' && window.FirebaseConfig) {
          clearInterval(this._autoInitPollTimer);
          this.init(window.FirebaseConfig).catch(err => this._readyReject(err));
        } else if (typeof window !== 'undefined' && window.app) {
          clearInterval(this._autoInitPollTimer);
          this.init(window.app).catch(err => this._readyReject(err));
        } else if (Date.now() - start > this.opts.pollForAppTimeoutMs) {
          clearInterval(this._autoInitPollTimer);
          console.warn('FirebaseDataLoader: No config/app found within poll timeout; call loader.init(config/app) manually when ready.');
          this._readyResolve();
        }
      }, this.opts.pollIntervalMs);
    } else {
      this._readyResolve();
    }
  }

  // Promise for ready
  get ready() { return this._ready; }
  onReady(fn) { this._ready.then(() => { try { fn(); } catch (e) { console.error(e); } }); }

  /**
   * Accepts either a Firebase config object (with apiKey etc.) or a FirebaseApp instance.
   * Can be called multiple times with new options.
   */
  async init(configOrApp, opts = {}) {
    if (!configOrApp) throw new Error('init(configOrApp) requires a Firebase config object or app instance');
    if (this._isInitialized) {
      this.opts = { ...this.opts, ...opts };
      return;
    }
    try {
      this.opts = { ...this.opts, ...opts };
      let app;
      if (typeof configOrApp === 'object' && configOrApp.apiKey) {
        // If config object, initialize app if not already done
        if (getApps().length) {
          app = getApps()[0];
        } else {
          app = initializeApp(configOrApp);
        }
      } else {
        app = configOrApp; // Already an app
      }
      this.app = app;
      this.db = getFirestore(app);

      // Setup auth
      try {
        this.auth = getAuth(app);
        onAuthStateChanged(this.auth, user => {
          this.currentUser = user;
          this._authListeners.forEach(fn => { try { fn(user); } catch (e) { console.error(e); } });
          if (user && this.opts.autoSubscribeCurrentUser !== false) {
            try { this.subscribeToProfile(user.uid); } catch (e) { /* ignore */ }
          }
        });
      } catch (err) {
        console.warn('Could not attach auth listener', err?.message || err);
      }

      this._isInitialized = true;
      if (this.opts.autoFetch) await this.fetchAll().catch(err => console.error('fetchAll failed', err));
      if (this.opts.realtime) this._startRealtime();

      this._readyResolve();
    } catch (err) {
      this._readyReject(err);
      throw err;
    }
  }

  /**
   * Event subscription for current user changes (auth state).
   */
  onAuth(fn) {
    if (!isFunction(fn)) throw new TypeError('onAuth expects a function');
    this._authListeners.add(fn);
    try { fn(this.currentUser); } catch (e) { /* ignore */ }
    return () => this._authListeners.delete(fn);
  }

  _docToObj(docSnap) {
    const data = docSnap.data ? docSnap.data() : null;
    return { id: docSnap.id, ...(data || {}) };
  }

  _notify(change = null) {
    const usersObj = Object.fromEntries(this.users);
    const profilesObj = Object.fromEntries(this.profiles);
    const payload = { users: usersObj, profiles: profilesObj, change };
    this._listeners.forEach(fn => { try { fn(payload); } catch (err) { console.error('listener error', err); } });
  }

  _makeQuery(colName) {
    const colRef = collection(this.db, colName);
    if (this.opts.orderByField) return query(colRef, orderBy(this.opts.orderByField));
    return colRef;
  }

  async fetchAll() {
    if (!this._isInitialized) throw new Error('Not initialized');
    try {
      const usersSnap = await getDocs(this._makeQuery(this.opts.usersCollection));
      usersSnap.forEach(docSnap => this.users.set(docSnap.id, this._docToObj(docSnap)));
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
    try {
      const profilesSnap = await getDocs(this._makeQuery(this.opts.profilesCollection));
      profilesSnap.forEach(docSnap => this.profiles.set(docSnap.id, this._docToObj(docSnap)));
    } catch (err) {
      console.error('Failed to fetch profiles:', err);
    }
    this._notify({ type: 'initialFetch', timestamp: Date.now() });
    return { users: this.getAllUsers(), profiles: this.getAllProfiles() };
  }

  async fetchDocument(collectionName, id) {
    if (!this._isInitialized) throw new Error('Not initialized');
    const docRef = doc(this.db, collectionName, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return this._docToObj(snap);
  }

  getUser(uid) { return this.users.get(uid) ?? null; }
  getProfile(uid) { return this.profiles.get(uid) ?? null; }
  getAllUsers() { return Object.fromEntries(this.users); }
  getAllProfiles() { return Object.fromEntries(this.profiles); }

  onUpdate(callback) {
    if (!isFunction(callback)) throw new TypeError('onUpdate expects a function');
    this._listeners.add(callback);
    try { callback({ users: this.getAllUsers(), profiles: this.getAllProfiles(), change: { type: 'subscribe' } }); } catch (e) { /* ignore */ }
    return () => this._listeners.delete(callback);
  }

  _startRealtime() {
    if (!this._isInitialized) return;
    if (this._unsubs.length) return; // already started

    const addListener = (colName, targetMap, label) => {
      const q = this.opts.orderByField ? query(collection(this.db, colName), orderBy(this.opts.orderByField)) : collection(this.db, colName);
      const unsub = onSnapshot(q, snapshot => {
        snapshot.docChanges().forEach(change => {
          const id = change.doc.id;
          const obj = this._docToObj(change.doc);
          if (change.type === 'added' || change.type === 'modified') {
            targetMap.set(id, obj);
          } else if (change.type === 'removed') {
            targetMap.delete(id);
          }
        });
        this._notify({ type: 'realtime', collection: label, time: Date.now(), size: snapshot.size });
      }, err => {
        console.error(`Realtime listener error for ${label}`, err);
      });
      this._unsubs.push(unsub);
    };

    addListener(this.opts.usersCollection, this.users, 'users');
    addListener(this.opts.profilesCollection, this.profiles, 'profiles');
  }

  stopRealtime() {
    while (this._unsubs.length) {
      const unsub = this._unsubs.pop();
      try { unsub(); } catch (e) { /* ignore */ }
    }
    for (const [uid, unsub] of this._perDocUnsubs) {
      try { unsub(); } catch (e) { /* ignore */ }
    }
    this._perDocUnsubs.clear();
  }

  subscribeToProfile(uid) {
    if (!this._isInitialized) throw new Error('Not initialized');
    if (!uid) throw new Error('subscribeToProfile requires a uid');
    if (this._perDocUnsubs.has(uid)) return () => { const u = this._perDocUnsubs.get(uid); if (u) u(); };

    const docRef = doc(this.db, this.opts.profilesCollection, uid);
    const unsub = onSnapshot(docRef, snap => {
      if (!snap.exists()) {
        this.profiles.delete(uid);
      } else {
        this.profiles.set(uid, this._docToObj(snap));
      }
      this._notify({ type: 'profileDoc', uid, time: Date.now() });
    }, err => {
      console.error('profile subscribe error', err);
    });

    this._perDocUnsubs.set(uid, unsub);
    return () => {
      const u = this._perDocUnsubs.get(uid);
      if (u) { try { u(); } catch (e) { /* ignore */ } }
      this._perDocUnsubs.delete(uid);
    };
  }

  async setProfileField(uid, field, value) {
    if (!this._isInitialized) throw new Error('Not initialized');
    const ref = doc(this.db, this.opts.profilesCollection, uid);
    try {
      await updateDoc(ref, { [field]: value });
    } catch (err) {
      console.error(`Error updating profile field ${field} for uid=${uid}:`, err);
      throw err;
    }
  }

  async setProfileFields(uid, updates = {}) {
    if (!this._isInitialized) throw new Error('Not initialized');
    if (!updates || typeof updates !== 'object') throw new TypeError('updates must be an object');
    const ref = doc(this.db, this.opts.profilesCollection, uid);
    try {
      await updateDoc(ref, updates);
    } catch (err) {
      console.error(`Error updating profile fields for uid=${uid}:`, err);
      throw err;
    }
  }

  /**
   * Enhanced: Bind an input element to a profile field with optimistic update + debounce + error indicator.
   * Returns an unbind function.
   */
  bindInput(inputEl, uid, field, opts = {}) {
    if (!inputEl || !uid || !field) throw new Error('bindInput requires inputEl, uid, field');
    const debounceMs = opts.debounceMs ?? 700;
    const flushOn = opts.flushOn ?? ['change'];
    const errorClass = opts.errorClass ?? 'firebase-error';

    const updateInput = () => {
      const profile = this.getProfile(uid);
      const val = profile ? (profile[field] ?? '') : '';
      if (inputEl.value !== String(val)) inputEl.value = val;
    };

    const unsubUpdate = this.onUpdate(() => updateInput());
    updateInput();

    const save = async (value) => {
      const p = this.getProfile(uid) || { id: uid };
      this.profiles.set(uid, { ...p, [field]: value });
      this._notify({ type: 'localOptimistic', uid, field, value });
      try {
        await this.setProfileField(uid, field, value);
        inputEl.classList.remove(errorClass);
      } catch (err) {
        inputEl.classList.add(errorClass);
        this.fetchDocument(this.opts.profilesCollection, uid).then(doc => {
          if (doc) { this.profiles.set(uid, doc); this._notify({ type: 'recovered', uid }); }
        }).catch(console.error);
      }
    };

    const debouncedSave = debounce(save, debounceMs);

    const onInput = (e) => {
      const newVal = e.target.value;
      debouncedSave(newVal);
    };

    inputEl.addEventListener('input', onInput);
    flushOn.forEach(ev =>
      inputEl.addEventListener(ev, () => debouncedSave(inputEl.value))
    );

    return () => {
      inputEl.removeEventListener('input', onInput);
      flushOn.forEach(ev =>
        inputEl.removeEventListener(ev, () => debouncedSave(inputEl.value))
      );
      unsubUpdate();
    };
  }

  async fetchPage(collectionName = this.opts.profilesCollection, pageSize = this.opts.pageSize, afterDoc = null) {
    if (!this._isInitialized) throw new Error('Not initialized');
    try {
      const colRef = collection(this.db, collectionName);
      let q = this.opts.orderByField ? query(colRef, orderBy(this.opts.orderByField), limitFn(pageSize)) : query(colRef, limitFn(pageSize));
      if (afterDoc) q = query(q, startAfter(afterDoc));
      const snap = await getDocs(q);
      const items = [];
      let last = null;
      snap.forEach(d => { items.push(this._docToObj(d)); last = d; });
      return { items, lastDoc: last };
    } catch (err) {
      console.error('fetchPage error', err);
      throw err;
    }
  }
}

const loader = new FirebaseDataLoader();
// expose globally for backwards compatibility
if (typeof window !== 'undefined') window.FirebaseDataLoader = loader;
export default loader;


