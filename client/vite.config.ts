import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const backendUrl = 'http://127.0.0.1:5000';

  return {
    plugins: [react()],

    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: false,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          configure: (proxy) => {
            const bootTime = Date.now();
            proxy.on('error', (err: any, req, res) => {
              // Suppress connection errors during the first 10 seconds of startup (expected race condition)
              if (err.code === 'ECONNREFUSED' && (Date.now() - bootTime) < 10000) {
                return;
              }
              console.log('[proxy error]', req.url, err.message);
            });
          }
        },
        '/uploads': {
          target: backendUrl,
          changeOrigin: true,
        },
        // '/attach-assist' removed: Vite serves these directly from public/ during dev
        '/attached_assets': {
          target: backendUrl,
          changeOrigin: true,
        },
      }

    },

    preview: {
      host: "0.0.0.0",
      port: 4173,  // Changed from 5000 to avoid conflict with backend server
    },

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@assets": path.resolve(__dirname, "../attach-assist"),
      },
    },

    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },

    build: {
      outDir: "dist",
      sourcemap: false,
      target: 'es2020',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            charts: ['recharts'],
          },
        },
      },
      chunkSizeWarningLimit: 500,
    },
  };
});

