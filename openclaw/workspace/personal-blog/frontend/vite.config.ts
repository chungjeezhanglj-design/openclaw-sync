import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 1177,
    host: '::',  // 监听所有 IPv4 和 IPv6 地址
    allowedHosts: ['chungjee.cc.cd', 'localhost'],
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
    fs: {
      allow: ['..'],
    },
    proxy: {
      '/api': {
        target: 'http://[::1]:3000',
        changeOrigin: true,
        ws: true, // 支持 WebSocket 和 SSE 长连接
      },
      '/uploads': {
        target: 'http://[::1]:3000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 1177,
    host: '127.0.0.1',  // 只监听本地回环
    strictPort: true,
  },
})
