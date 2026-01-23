import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.trycloudflare.com', 'localhost', '127.0.0.1'],
  },
  plugins: [react(), tailwind()],
})
