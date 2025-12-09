/**
 * Firebase Configuration and Initialization
 */

const firebaseConfig = {
  apiKey: "AIzaSyDXXOPgM1GrMz3kVvEytbcV4C2kTPmccDY",
  authDomain: "billingsoft-6393e.firebaseapp.com",
  databaseURL: "https://billingsoft-6393e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "billingsoft-6393e",
  storageBucket: "billingsoft-6393e.firebasestorage.app",
  messagingSenderId: "611108978980",
  appId: "1:611108978980:web:4f544041f591052206f3b1",
  measurementId: "G-HZB4NRXEQ8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence for Firestore (updated method)
try {
  db.enablePersistence({ synchronizeTabs: true });
} catch (err) {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence not available in this browser');
  }
}

// Export for use in app
window.firebaseAuth = auth;
window.firebaseDB = db;

console.log('Firebase initialized successfully');

/**
 * FirebaseDB - Wrapper class for Firestore operations
 */
const FirebaseDB = {
  // Products operations
  products: {
    async getAll() {
      const snapshot = await db.collection('products').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async add(product) {
      const docRef = await db.collection('products').add(product);
      return docRef.id;
    },

    async update(id, updates) {
      await db.collection('products').doc(id).update(updates);
    },

    async delete(id) {
      await db.collection('products').doc(id).delete();
    },

    async get(id) {
      const doc = await db.collection('products').doc(id).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    }
  },

  // Bills operations
  bills: {
    async getAll() {
      const snapshot = await db.collection('bills').orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async add(bill) {
      const docRef = await db.collection('bills').add(bill);
      return docRef.id;
    },

    async get(id) {
      const doc = await db.collection('bills').doc(id).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    }
  },

  // Users operations
  users: {
    async getAll() {
      const snapshot = await db.collection('users').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async save(userId, userData) {
      await db.collection('users').doc(userId).set(userData, { merge: true });
    },

    async get(userId) {
      const doc = await db.collection('users').doc(userId).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    },

    async update(userId, updates) {
      await db.collection('users').doc(userId).update(updates);
    },

    async delete(userId) {
      await db.collection('users').doc(userId).delete();
    }
  },

  // Shop settings operations
  shop: {
    async get() {
      const doc = await db.collection('shop').doc('settings').get();
      if (doc.exists) {
        return doc.data();
      }
      return {
        name: 'My Store',
        address: '',
        phone: '',
        email: '',
        gstNumber: ''
      };
    },

    async save(settings) {
      await db.collection('shop').doc('settings').set(settings, { merge: true });
    }
  }
};

// Export FirebaseDB to window
window.FirebaseDB = FirebaseDB;

console.log('FirebaseDB wrapper initialized');
