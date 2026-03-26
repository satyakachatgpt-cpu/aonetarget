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
            proxy.on('error', (err, req, res) => {
              console.log('[proxy error]', req.url, err.message);
            });
          }
        },
        '/uploads': {
          target: backendUrl,
          changeOrigin: true,
        },
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
        "@assets": path.resolve(__dirname, "../attached_assets"),
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

