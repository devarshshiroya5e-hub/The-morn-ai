const loadFirebaseHostingConfig = async () => {
  if (typeof window === 'undefined') return;

  const hasBuildConfig = Boolean(import.meta.env.VITE_FIREBASE_API_KEY);
  const isFirebaseHosting =
    window.location.hostname.endsWith('.web.app') ||
    window.location.hostname.endsWith('.firebaseapp.com');

  if (hasBuildConfig || !isFirebaseHosting) return;

  try {
    const response = await fetch('/__/firebase/init.json', {
      cache: 'no-store',
      credentials: 'same-origin',
    });

    if (!response.ok) return;

    const config = await response.json();
    (window as Window & { __MORNAI_FIREBASE_CONFIG__?: unknown }).__MORNAI_FIREBASE_CONFIG__ = config;
  } catch {
    // Fall back to the local/build configuration path when Firebase Hosting
    // reserved configuration is unavailable.
  }
};

await loadFirebaseHostingConfig();
await import('./main.tsx');
