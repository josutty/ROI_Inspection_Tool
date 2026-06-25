import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [react(), basicSsl()],
  optimizeDeps: {
    exclude: ['@techstark/opencv-js']
  },
  server: {
    https: true,
    host: true,
    port: 5173,
    proxy: {
      '/process': {
        // target: 'http://192.168.83.101:8000',
        target: 'http://10.42.0.1:8000',
        changeOrigin: true
      },
      '/analyse': {
        // target: 'http://192.168.83.101:8000',
        target: 'http://10.42.0.1:8081',
        changeOrigin: true
      }
    }
  }
})