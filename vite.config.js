import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/budget-app/',
  server: {
    port: 5173,
    host: true,
  },
})
