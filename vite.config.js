import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// פיתוח מקומי בלבד: מעביר את /api/sheet ישירות לגיליון (GAS_URL / GAS_KEY מ-.env.local), בלי התחברות.
function sheetDevProxy(env) {
  return {
    name: 'sheet-dev-proxy',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/sheet', async (req, res) => {
        let body = ''
        for await (const chunk of req) body += chunk
        const { action, params } = JSON.parse(body || '{}')
        res.setHeader('Content-Type', 'application/json')
        if (action === 'applePayLink') return res.end(JSON.stringify({ ok: true, data: { url: 'https://budget-deploy-six.vercel.app/api/applepay?u=...&t=...' } }))
        const r = await fetch(env.GAS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: env.GAS_KEY, action, params: { ...(params || {}), email: 'orih166@gmail.com' } }),
        })
        res.end(await r.text())
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  plugins: [
    env.GAS_URL && env.VITE_SHEET_DEV === '1' && sheetDevProxy(env),
    react({ fastRefresh: false }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'כלכלת בית',
        short_name: 'כלכלת בית',
        description: 'ניהול פינאנסי פרימיום למשפחה',
        theme_color: '#F7F5EC',
        background_color: '#F7F5EC',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        lang: 'he',
        dir: 'rtl',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        globIgnores: ['**/Gemini_*.png'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        importScripts: ['push-sw.js'],
        navigateFallbackDenylist: [/^\/api\//],
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
  }
})
