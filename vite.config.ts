import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    // Expose les variables préfixées `PUBLIC_` à `import.meta.env` (en plus
    // du préfixe `VITE_` par défaut). Indispensable pour que
    // `PUBLIC_API_URL` soit réellement lu par src/lib/api/http.ts au lieu
    // de retomber silencieusement sur le fallback `/api/v1/`.
    envPrefix: ['VITE_', 'PUBLIC_'],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      // Lucide + Motion + app code exceed 500 kB; split vendors to smaller chunks and avoid noise.
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('react-router')) return 'react-router';
            if (id.includes('react-dom')) return 'react-dom';
            if (id.includes('/react/')) return 'react-core';
            if (id.includes('motion') || id.includes('framer-motion')) return 'motion';
            return 'vendor';
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
  };
});
