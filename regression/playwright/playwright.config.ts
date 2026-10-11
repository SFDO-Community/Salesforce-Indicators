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
  // Pixel baselines (features.pixels.spec.ts) live beside the other captures, in the gitignored output folder, one folder per <env>-<theme>.
  // They are machine-specific (font rendering), so they are regenerated per release and per machine, not committed.
  snapshotPathTemplate: '{testDir}/output/baselines/{arg}{ext}',
  // An ABSOLUTE tolerance, not a ratio: a ratio of 0.5% of a ~110,000px bundle shot would hide a whole glyph changing colour (~200px), the very bug class these baselines exist for.
  expect: { toHaveScreenshot: { animations: 'disabled', maxDiffPixels: 40 } },
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
