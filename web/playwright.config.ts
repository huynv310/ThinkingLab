import { defineConfig, devices } from '@playwright/test'

// E2E giao diện: mọi request tới Supabase/API đều bị giả lập trong test (không cần tài khoản thật)
export default defineConfig({
  testDir: 'e2e',
  outputDir: 'e2e/.results',
  workers: 2, // máy dev RAM hạn chế
  use: { baseURL: 'http://localhost:4173', locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  // Chạy trên bản build production (ổn định hơn dev server, sát với bản deploy)
  webServer: { command: 'npx vite build && npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: false },
})
