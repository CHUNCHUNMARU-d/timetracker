/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    css: false,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'Cronometraje de Carreras',
        short_name: 'Cronometraje',
        description: 'App offline para cronometraje de eventos de triatlón y duatlón',
        theme_color: '#08090B',
        background_color: '#08090B',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        categories: ['sports', 'utilities', 'productivity'],
        lang: 'es',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // If new asset types ship in /public or /dist (e.g. webp, avif, json),
        // append them here or first offline load will 404.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-shell',
              networkTimeoutSeconds: 3,
            },
          },
          {
            urlPattern: /^https:\/\/api\.emailjs\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'emailjs',
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ],
})
