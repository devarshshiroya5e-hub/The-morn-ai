const loadFirebaseHostingConfig = async () => {
  if (typeof window === 'undefined') return;

  try {
    const response = await fetch('/__/firebase/init.json', {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return;

    const config = await response.json();
    if (typeof config?.apiKey !== 'string' || typeof config?.projectId !== 'string') return;

    (window as Window & { __MORNAI_FIREBASE_CONFIG__?: unknown }).__MORNAI_FIREBASE_CONFIG__ = config;
  } catch {
    // Non-Firebase hosts and local development fall back to build-time config.
  }
};

loadFirebaseHostingConfig()
  .catch(() => undefined)
  .finally(() => import('./main.tsx'));
