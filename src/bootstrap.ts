type FirebaseWebConfig = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
};

const loadFirebaseHostingConfig = async () => {
  if (typeof window === 'undefined') return;

  // Only use the Firebase Hosting reserved endpoint when the app itself is
  // running on Firebase Hosting. Cross-origin requests to another Firebase
  // Hosting project are intentionally avoided because init.json does not
  // provide CORS headers.
  try {
    const response = await fetch('/__/firebase/init.json', {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: AbortSignal.timeout(2500),
    });

    if (!response.ok) return;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return;

    const config = (await response.json()) as FirebaseWebConfig;
    if (
      typeof config?.apiKey === 'string' &&
      config.apiKey.trim() &&
      typeof config?.projectId === 'string' &&
      config.projectId.trim()
    ) {
      (window as Window & { __MORNAI_FIREBASE_CONFIG__?: FirebaseWebConfig }).__MORNAI_FIREBASE_CONFIG__ = config;
    }
  } catch {
    // Render and other non-Firebase hosts use Vite environment configuration.
  }
};

loadFirebaseHostingConfig()
  .catch(() => undefined)
  .finally(() => import('./main.tsx'));
