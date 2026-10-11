import { defineConfig, devices } from '@playwright/test'

// E2E giao diện: mọi request tới Supabase/API đều bị giả lập trong test (không cần tài khoản thật)
export default defineConfig({
  testDir: 'e2e',
  outputDir: 'e2e/.results',
  use: { baseURL: 'http://localhost:5173', locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true },
})
