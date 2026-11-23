import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'test/e2e',
  use: { baseURL: 'http://localhost:4173' },
  webServer: {
    command: 'npm run build && npm run prerender && npm run preview -- --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
});
