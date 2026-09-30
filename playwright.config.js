import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:5173', viewport: { width: 1280, height: 720 } },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: true, timeout: 60_000 },
    { command: 'npm run build && npm run preview', url: 'http://127.0.0.1:4173', reuseExistingServer: true, timeout: 120_000 },
  ],
});
