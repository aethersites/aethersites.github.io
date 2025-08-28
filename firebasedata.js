// /js/firebasedata.js
// Polished ES module loader for Firestore users & profiles.
// Usage: import loader from './js/firebasedata.js'
// Exposes: loader.ready (Promise), loader.onReady(cb), loader.onUpdate(cb), loader.getProfile(uid), loader.setProfileField(uid, field, value)

import {
  getFirestore,
  collection,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
  query,
  orderBy,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const DEFAULT_OPTIONS = {
  usersCollection: 'users',
  profilesCollection: 'profiles',
  realtime: true,
  autoFetch: true,
  orderByField: null,
  pollForAppTimeoutMs: 4000,
  pollIntervalMs: 150
};

class FirebaseDataLoader {
  constructor(options = {}) {
    this.opts = { ...DEFAULT_OPTIONS, ...options };
    this.db = null;
    this.users = new Map();
    this.profiles = new Map();
    this._listeners = new Set();
    this._unsubs = [];
    this._isInitialized = false;

    this._ready = new Promise((resolve, reject) => {
      this._readyResolve = resolve;
      this._readyReject = reject;
    });

    // Prefer window.app, but allow manual init for flexibility
    if (typeof window !== 'undefined' && window.app) {
      this.init(window.app).catch(err => this._readyReject(err));
    } else if (this.opts.pollForAppTimeoutMs > 0) {
      const start = Date.now();
      this._autoInitPollTimer = setInterval(() => {
        if (typeof window !== 'undefined' && window.app) {
          clearInterval(this._autoInitPollTimer);
          this.init(window.app).catch(err => this._readyReject(err));
        } else if (Date.now() - start > this.opts.pollForAppTimeoutMs) {
          clearInterval(this._autoInitPollTimer);
          console.warn('FirebaseDataLoader: window.app not found within poll timeout; call loader.init(app) manually when ready.');
          this._readyResolve();
        }
      }, this.opts.pollIntervalMs);
    } else {
      this._readyResolve();
    }
  }

  get ready() { return this._ready; }

  onReady(fn) {
    this._ready.then(() => { try { fn(); } catch (e) { console.error(e); } });
  }

  async init(app, opts = {}) {
    if (!app) throw new Error('init(app) requires a Firebase app instance');
    if (this._isInitialized) {
      this.opts = { ...this.opts, ...opts };
      return;
    }
    try {
      this.opts = { ...this.opts, ...opts };
      this.db = getFirestore(app);
      this._isInitialized = true;

      if (this.opts.autoFetch) await this.fetchAll().catch(console.error);
      if (this.opts.realtime) this._startRealtime();
      this._readyResolve();
    } catch (err) {
      this._readyReject(err);
      throw err;
    }
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
    if (this.opts.orderByField) {
      return query(colRef, orderBy(this.opts.orderByField));
    }
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

  _startRealtime() {
    if (!this._isInitialized) return;
    if (this._unsubs.length) return;

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
    if (typeof callback !== 'function') throw new TypeError('onUpdate expects a function');
    this._listeners.add(callback);
    try { callback({ users: this.getAllUsers(), profiles: this.getAllProfiles(), change: { type: 'subscribe' } }); } catch (e) { /* ignore */ }
    return () => this._listeners.delete(callback);
  }

  // Helper: Update a single field in profiles
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
}

const loader = new FirebaseDataLoader();
window.FirebaseDataLoader = loader;
export default loader;
