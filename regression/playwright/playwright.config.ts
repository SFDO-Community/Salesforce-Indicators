import { defineConfig } from '@playwright/test';

// Regression capture runs headed on purpose so a person can watch it. One worker, fixed viewport, fixed
// locale/timezone/scale so screenshots are comparable run to run. Theme is whatever the org is set to
// (SLDS1 / SLDS2 / SLDS2 dark are separate baseline sets; the theme switch is manual for now).
export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.ts/,
  timeout: 15 * 60 * 1000,
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  outputDir: './output/pw-artifacts',
  use: {
    headless: false,
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
    locale: 'en-US',
    timezoneId: 'UTC',
    colorScheme: 'light',
    launchOptions: { slowMo: 60, args: ['--force-device-scale-factor=1'] },
  },
});
