import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const backendUrl = 'http://127.0.0.1:5000';

  return {
    plugins: [
      react(),
      // NOTE: PWA standalone mode (URL bar hidden) only works on HTTPS with real domain.
      // Test on https://aonetarget.in after deployment, not on local IP.
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'script',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,otf}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          navigateFallbackAllowlist: [/^\//],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }
              }
            },
            {
              urlPattern: /^https:\/\/aonetarget\.in\/api\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                networkTimeoutSeconds: 10
              }
            }
          ]
        },
        manifest: {
          short_name: "AONE Target",
          name: "AONE TARGET INSTITUTE",
          description: "Aone Target Institute - Premium Educational Platform for NEET, IIT, JEE, NDA Preparation",
          categories: ["education"],
          lang: "en",
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "portrait",
          theme_color: "#1A237E",
          background_color: "#1A237E",
          prefer_related_applications: false,
          icons: [
            { src: "/pwa-192x192.png", type: "image/png", sizes: "192x192", purpose: "any" },
            { src: "/pwa-512x512.png", type: "image/png", sizes: "512x512", purpose: "any" },
            { src: "/pwa-512x512.png", type: "image/png", sizes: "512x512", purpose: "maskable" }
          ],
          screenshots: [
            {
              src: "/screenshot-mobile.png",
              sizes: "720x1280",
              type: "image/png",
              form_factor: "narrow",
              label: "AONE Target Home"
            },
            {
              src: "/screenshot-desktop.png",
              sizes: "1280x720",
              type: "image/png",
              form_factor: "wide",
              label: "AONE Target Dashboard"
            }
          ]
        },
        devOptions: { enabled: true }
      })
    ],

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
              // Suppress connection errors during the first 30 seconds of startup (expected race condition)
              if (err.code === 'ECONNREFUSED' && (Date.now() - bootTime) < 30000) {
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
      "__APP_VERSION__": JSON.stringify(Date.now().toString()),
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

