import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages saytı alt qovluqda açılır: https://<user>.github.io/elva-laventa/
// Ona görə build zamanı BASE_PATH veririk. Lokalda və Vercel-də isə kök "/" qalır.
const base = process.env.BASE_PATH || '/'

// https://vitejs.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
})
