// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase Console'dan olingan o'zingizning kalitlaringiz:
const firebaseConfig = {
  apiKey: "AIzaSyAUENSaPRqvn1K4IUxJR1yifHUMQddYRPI",
  authDomain: "online-market-dbb67.firebaseapp.com",
  projectId: "online-market-dbb67",
  storageBucket: "online-market-dbb67.firebasestorage.app",
  messagingSenderId: "456480988810",
  appId: "1:456480988810:web:6cae4e55359140b09b9773",
  measurementId: "G-8HMLNQ1MJK"
};

// Firebase-ni ishga tushiramiz
const app = initializeApp(firebaseConfig);

// Firestore ma'lumotlar bazasini eksport qilamiz
export const db = getFirestore(app);