const FIREBASE_HOSTING_ORIGIN = 'https://themorn-ai.firebaseapp.com';

type FirebaseWebConfig = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
};

const setConfig = (config: FirebaseWebConfig | null | undefined) => {
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

const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-mornai-firebase-src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') resolve();
      else {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.dataset.mornaiFirebaseSrc = src;
    script.addEventListener(
      'load',
      () => {
        script.dataset.loaded = 'true';
        resolve();
      },
      { once: true },
    );
    script.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
    document.head.appendChild(script);
  });

const loadFirebaseHostingConfig = async () => {
  if (typeof window === 'undefined') return;

  const candidateOrigins = Array.from(
    new Set([window.location.origin, FIREBASE_HOSTING_ORIGIN, 'https://themorn-ai.web.app']),
  );

  for (const origin of candidateOrigins) {
    try {
      const response = await fetch(`${origin}/__/firebase/init.json`, {
        cache: 'no-store',
        credentials: origin === window.location.origin ? 'same-origin' : 'omit',
        signal: AbortSignal.timeout(4000),
      });

      if (!response.ok) continue;

      const config = (await response.json()) as FirebaseWebConfig;
      if (setConfig(config)) return;
    } catch {
      // Try the next Firebase Hosting origin or build-time environment config.
    }
  }

  // Firebase Hosting's reserved init script can expose the active project's
  // configuration even when the frontend itself is served from Render or
  // another non-Firebase host. It uses the legacy v8 reserved SDK only for
  // bootstrap; the app itself continues using the bundled modular SDK.
  for (const origin of [FIREBASE_HOSTING_ORIGIN, 'https://themorn-ai.web.app']) {
    try {
      const firebaseNamespace = (window as Window & {
        firebase?: {
          apps?: Array<{ options?: FirebaseWebConfig }>;
          app?: () => { options?: FirebaseWebConfig };
        };
      }).firebase;

      if (!firebaseNamespace) {
        await loadScript(`${origin}/__/firebase/8.10.1/firebase-app.js`);
      }

      await loadScript(`${origin}/__/firebase/init.js`);

      const runtimeFirebase = (window as Window & {
        firebase?: {
          apps?: Array<{ options?: FirebaseWebConfig }>;
          app?: () => { options?: FirebaseWebConfig };
        };
      }).firebase;

      const config =
        runtimeFirebase?.apps?.[0]?.options ||
        runtimeFirebase?.app?.()?.options;

      if (setConfig(config)) return;
    } catch {
      // Continue to the next Firebase Hosting origin.
    }
  }
};

loadFirebaseHostingConfig()
  .catch(() => undefined)
  .finally(() => import('./main.tsx'));
