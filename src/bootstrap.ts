type FirebaseWebConfig = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
};

const applyFirebaseConfig = (config: FirebaseWebConfig | null | undefined) => {
  if (
    !config ||
    typeof config.apiKey !== 'string' ||
    !config.apiKey.trim() ||
    typeof config.projectId !== 'string' ||
    !config.projectId.trim()
  ) {
    return false;
  }

  (window as Window & { __MORNAI_FIREBASE_CONFIG__?: FirebaseWebConfig }).__MORNAI_FIREBASE_CONFIG__ = config;
  return true;
};

const loadFirebaseConfig = async () => {
  if (typeof window === 'undefined') return;

  // Render can safely retrieve the public Firebase web config server-side.
  // This avoids cross-origin requests to Firebase Hosting's reserved init
  // endpoint, which intentionally does not expose CORS headers.
  try {
    const response = await fetch('/api/firebase-config', {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: AbortSignal.timeout(3000),
    });

    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const config = (await response.json()) as FirebaseWebConfig;
        if (applyFirebaseConfig(config)) return;
      }
    }
  } catch {
    // Continue to Firebase Hosting/build-time config below.
  }

  // This is only reachable when the frontend itself is hosted by Firebase.
  try {
    const response = await fetch('/__/firebase/init.json', {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: AbortSignal.timeout(2000),
    });

    if (!response.ok) return;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return;

    const config = (await response.json()) as FirebaseWebConfig;
    applyFirebaseConfig(config);
  } catch {
    // Render/local builds can fall back to Vite environment configuration.
  }
};

loadFirebaseConfig()
  .catch(() => undefined)
  .finally(() => import('./main.tsx'));
