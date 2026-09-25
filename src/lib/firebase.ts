import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
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

const isUsableConfigValue = (value: unknown) =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  !/^(YOUR_|MY_|your-|your_|<|>)|\.\.\.$/i.test(value.trim());

const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const firebaseConfig = {
  apiKey: isUsableConfigValue(hostingConfig?.apiKey)
    ? hostingConfig!.apiKey
    : envConfig.apiKey,
  authDomain: isUsableConfigValue(hostingConfig?.authDomain)
    ? hostingConfig!.authDomain
    : envConfig.authDomain || 'themorn-ai.firebaseapp.com',
  projectId: isUsableConfigValue(hostingConfig?.projectId)
    ? hostingConfig!.projectId
    : envConfig.projectId || 'themorn-ai',
  storageBucket: isUsableConfigValue(hostingConfig?.storageBucket)
    ? hostingConfig!.storageBucket
    : envConfig.storageBucket || 'themorn-ai.firebasestorage.app',
  messagingSenderId: isUsableConfigValue(hostingConfig?.messagingSenderId)
    ? hostingConfig!.messagingSenderId
    : envConfig.messagingSenderId || '753741589591',
  appId: isUsableConfigValue(hostingConfig?.appId)
    ? hostingConfig!.appId
    : envConfig.appId || '1:753741589591:web:b7d75cc2eee68b4c920712',
  measurementId: isUsableConfigValue(hostingConfig?.measurementId)
    ? hostingConfig!.measurementId
    : envConfig.measurementId || 'G-QKMT76SRKH',
};

if (!isUsableConfigValue(firebaseConfig.apiKey)) {
  throw new Error(
    'MornAI Firebase is missing a valid Web API key. Deploy through Firebase Hosting or set VITE_FIREBASE_API_KEY to the API key from Firebase Console → Project settings → Your apps → Web app.'
  );
}

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
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
});
export const storage = getStorage(app);
export const analytics = typeof window === 'undefined'
  ? null
  : isSupported().then((supported) => supported ? getAnalytics(app) : null);
