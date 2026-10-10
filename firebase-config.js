// ==========================================================================
// LifeLens - Firebase Configuration Module
// ==========================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// IMPORTANT:
// Replace these placeholder values with the actual Firebase
// configuration from your own Firebase project.
// Do not use fake or randomly generated credentials.
const firebaseConfig = {
  apiKey: "AIzaSyBvAFJaikcLWX0AvaiapRRUXaafq9zw9A4",
  authDomain: "life-lens-510917.firebaseapp.com",
  projectId: "life-lens-510917",
  storageBucket: "life-lens-510917.firebasestorage.app",
  messagingSenderId: "470228424574",
  appId: "1:470228424574:web:3a448a98473b1f330bc52f"
};

// Check if credentials are configured
const isConfigured = firebaseConfig.apiKey && firebaseConfig.projectId;

let app, auth, db;

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (err) {
    console.error("Firebase Initialization Error:", err);
  }
} else {
  console.warn("LifeLens: Firebase configuration placeholders detected. Please update js/firebase-config.js with real Firebase project credentials.");
}

export {
  app,
  auth,
  db,
  isConfigured,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot
};
