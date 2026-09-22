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
  apiKey: hostingConfig?.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBDSpsFJ9Z0-7EXVLleO7MQgsYLhAZK8N8',
  authDomain: hostingConfig?.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'themorn-ai.firebaseapp.com',
  projectId: hostingConfig?.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || 'themorn-ai',
  storageBucket: hostingConfig?.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'themorn-ai.firebasestorage.app',
  messagingSenderId: hostingConfig?.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '753741589591',
  appId: hostingConfig?.appId || import.meta.env.VITE_FIREBASE_APP_ID || '1:753741589591:web:b7d75cc2eee68b4c920712',
  measurementId: hostingConfig?.measurementId || import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-QKMT76SRKH',
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
