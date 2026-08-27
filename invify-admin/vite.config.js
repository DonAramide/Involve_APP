import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar, transformAssetUrls } from '@quasar/vite-plugin'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      'src': fileURLToPath(new URL('./src', import.meta.url)),
      'components': fileURLToPath(new URL('./src/components', import.meta.url)),
      'layouts': fileURLToPath(new URL('./src/layouts', import.meta.url)),
      'pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
      'api': fileURLToPath(new URL('./src/api', import.meta.url)),
      'stores': fileURLToPath(new URL('./src/stores', import.meta.url)),
      'boot/axios': fileURLToPath(new URL('./src/api/index.js', import.meta.url)),
    }
  },
  plugins: [
    vue({
      template: { transformAssetUrls }
    }),
    quasar()
  ],
  server: {
    proxy: {
      '/api': {
        // Prefer IPv4 — `localhost` can resolve to ::1 on Windows while the
        // backend listens on 0.0.0.0 (IPv4), which surfaces as ECONNREFUSED.
        target: 'http://127.0.0.1:3004',
        changeOrigin: true
      },
      '/public': {
        target: 'http://127.0.0.1:3004',
        changeOrigin: true
      },
      '/auth': {
        target: 'http://127.0.0.1:3004',
        changeOrigin: true
      }
    }
  }
})
