import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // The `@` -> src alias used to be provided by @base44/vite-plugin; declared
    // here now that the plugin is removed.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
