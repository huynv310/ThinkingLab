/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // API Python chạy local bằng: python api/chat.py
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
  test: { environment: 'jsdom' },
})
