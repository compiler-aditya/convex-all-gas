import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        // The app.
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        // Design iteration against fixtures, with no Convex or auth. Kept as a
        // separate entry so the components can be worked on without the app
        // booting, and without the app ever booting into mock data.
        preview: fileURLToPath(new URL('./preview.html', import.meta.url)),
      },
    },
  },
})
