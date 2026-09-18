import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBDSpsFJ9Z0-7EXVLleO7MQgsYLhAZKxN8',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'themorn-ai.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'themorn-ai',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'themorn-ai.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '753741589591',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:753741589591:web:b7d75cc2eee68b4c920712',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-QKMT76SRKH'
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
export const db = getFirestore(app);
export const analytics = typeof window === 'undefined'
  ? null
  : isSupported().then((supported) => supported ? getAnalytics(app) : null);
