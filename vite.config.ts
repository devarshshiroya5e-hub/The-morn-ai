import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    sourcemap: false,
    reportCompressedSize: false,
    minify: true,
    cssMinify: true,
    target: 'es2020',
    rollupOptions: {
      output: {
        // Keep stable, high-cost libraries out of the application entry chunk.
        // Route all Firebase subpackages together to avoid split internal modules.
        manualChunks(id) {
          if (!id.includes('/node_modules/')) return;
          if (/\/node_modules\/(react|react-dom|scheduler|use-sync-external-store)\//.test(id)) {
            return 'vendor-react';
          }
          // The storage SDK is used only inside the lazy startup-registration
          // flow. Keep it separate so normal landing-page visits do not fetch it.
          if (id.includes('/node_modules/firebase/storage/') || id.includes('/node_modules/@firebase/storage/')) {
            return 'vendor-firebase-storage';
          }
          if (id.includes('/node_modules/firebase/') || id.includes('/node_modules/@firebase/')) {
            return 'vendor-firebase';
          }
          if (/\/node_modules\/(motion|motion-dom|motion-utils|framer-motion|@motionone)\//.test(id)) {
            return 'vendor-motion';
          }
          if (id.includes('/node_modules/lucide-react/')) {
            return 'vendor-icons';
          }
        },
      },
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
}));