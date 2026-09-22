import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

// Firebase Web configuration is not a server secret. It identifies the Firebase
// project; authorization is enforced by Firebase Auth + Firestore/Storage rules.
// Environment variables can override these values in local/production builds,
// but the fallback keeps the hosted frontend bootable when Vite env injection
// is not configured.
const hostingConfig = typeof window !== 'undefined'
  ? (window as Window & {
      __MORNAI_FIREBASE_CONFIG__?: {
        apiKey?: string;
        authDomain?: string;
        projectId?: string;
        storageBucket?: string;
        messagingSenderId?: string;
        appId?: string;
        measurementId?: string;
      };
    }).__MORNAI_FIREBASE_CONFIG__
  : undefined;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || hostingConfig?.apiKey || 'AIzaSyBDSpsFJ9Z0-7EXVLleO7MQgsYLhAZK8N8',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || hostingConfig?.authDomain || 'themorn-ai.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || hostingConfig?.projectId || 'themorn-ai',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || hostingConfig?.storageBucket || 'themorn-ai.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || hostingConfig?.messagingSenderId || '753741589591',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || hostingConfig?.appId || '1:753741589591:web:b7d75cc2eee68b4c920712',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || hostingConfig?.measurementId || 'G-QKMT76SRKH',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY;
export const appCheck = typeof window !== 'undefined' && recaptchaSiteKey
  ? initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    })
  : null;

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = typeof window === 'undefined'
  ? null
  : isSupported().then((supported) => supported ? getAnalytics(app) : null);
