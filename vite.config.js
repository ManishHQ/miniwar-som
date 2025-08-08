import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    target: 'esnext'
  },
  optimizeDeps: {
    exclude: ['@base-org/account'],
    esbuildOptions: {
      target: 'esnext'
    }
  }
})
