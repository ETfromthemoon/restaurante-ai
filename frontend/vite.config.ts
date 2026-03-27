import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',

      // Archivos estáticos a pre-cachear (app shell)
      includeAssets: ['icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png'],

      // ─── Web App Manifest ─────────────────────────────────────────────────
      manifest: {
        name: 'Restaurante AI',
        short_name: 'RestIA',
        description: 'Sistema de gestión de restaurante con inteligencia artificial',
        theme_color: '#E74C3C',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'es',
        categories: ['food', 'business', 'productivity'],

        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],

        // Accesos directos (aparecen al mantener presionado el ícono en Android)
        shortcuts: [
          {
            name: 'Mapa de Mesas',
            short_name: 'Mesas',
            description: 'Ver todas las mesas del restaurante',
            url: '/mesas',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Vista Cocina',
            short_name: 'Cocina',
            description: 'Cola de pedidos de la cocina',
            url: '/cocina',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'Panel del gerente',
            url: '/gerente',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }],
          },
        ],
      },

      // ─── Workbox — estrategias de caché ──────────────────────────────────
      workbox: {
        // Precaché del app shell (generado automáticamente por Vite)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

        runtimeCaching: [
          // API: Network First (siempre intenta red, cae en caché si falla)
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 minutos
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Menú e imágenes: Cache First (cambian poco)
          {
            urlPattern: /^https?:\/\/.*\/api\/menu/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'menu-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 30, // 30 minutos
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Fuentes y assets externos: Cache First
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 año
              },
            },
          },
        ],
      },
    }),
  ],

  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
