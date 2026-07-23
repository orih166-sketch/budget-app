import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react({ fastRefresh: false }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'כלכלת בית',
        short_name: 'כלכלת בית',
        description: 'ניהול פינאנסי פרימיום למשפחה',
        theme_color: '#1a1830',
        background_color: '#1a1830',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        lang: 'he',
        dir: 'rtl',
        icons: [
          { src: '/icon.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        globIgnores: ['**/Gemini_*.png'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  base: '/',
  server: {
    port: 5173,
    host: true,
    hmr: {
      host: 'localhost',
      port: 5173,
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
})
