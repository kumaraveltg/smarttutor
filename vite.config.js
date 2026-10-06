import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

optimizeDeps: { exclude: ['mathlive'] }

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
})
