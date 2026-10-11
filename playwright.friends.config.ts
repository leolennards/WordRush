import { defineConfig, devices } from '@playwright/test';

// Two-player tests against the local Firebase emulators.
// Run with `npm run test:e2e:friends` (starts the emulators for you).
export default defineConfig({
  testDir: './e2e-friends',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4174', trace: 'retain-on-failure', ...devices['Desktop Chrome'] },
  webServer: {
    command:
      'VITE_FIREBASE_EMULATOR=true npx vite build --outDir dist-e2e-friends && npx vite preview --outDir dist-e2e-friends --port 4174 --strictPort',
    url: 'http://localhost:4174',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
