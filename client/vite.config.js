import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite config — KhanNetra DGMS client
 *
 * URL strategy:
 *   Development  → Vite dev server proxies /api → http://localhost:5000
 *                  (no CORS issue, no hardcoded IP in code)
 *   Production   → Set VITE_API_URL in client/.env.production if the API
 *                  lives on a different origin, e.g.:
 *                    VITE_API_URL=https://api.khannetra.yourdomain.in
 *                  If API and frontend share the same origin (recommended),
 *                  leave VITE_API_URL empty — relative /api/v1 paths work.
 */
export default defineConfig(({ mode }) => {
  // Load .env / .env.development / .env.production for this mode
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],

    server: {
      port: 3000,
      proxy: {
        // In dev all /api calls go to the Express backend
        '/api': {
          target:       env.VITE_BACKEND_URL || 'http://localhost:5000',
          changeOrigin: true,
        },
        '/uploads': {
          target:       env.VITE_BACKEND_URL || 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },

    resolve: { alias: { '@': '/src' } },

    // Expose VITE_* vars to client code via import.meta.env
    envPrefix: 'VITE_',
  };
});
