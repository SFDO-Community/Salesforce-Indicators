import { defineConfig } from '@playwright/test';

// Capture environment is fixed: 1440x900 viewport, light theme, notifications
// suppressed by using a scratch/dev org with no pending approvals. Don't
// change this without saying so (see steps.yaml / SKILL.md).
//
// testMatch covers both the original single-flow proof of concept
// (capture.spec.ts) and per-regression-area specs added under Phase 3 of
// catalog/README.md's plan (capture/<area>.spec.ts, one per
// catalog/<area>.yaml file that has been automated).
//
// snapshotPathTemplate sends every `toHaveScreenshot()` baseline to
// capture/shots/<slug>.png — deliberately NOT Playwright's default
// `<test file>-snapshots/` layout, and deliberately without the default
// `{-platform}` suffix. For a `diffable` regression scenario, this file IS
// both the VRT baseline and the frame the documentation-video pipeline can
// reuse — see catalog/schema/scenario-schema.md's `automation` field and
// documentation-capture-from-steps/SKILL.md's regression-catalog section.
// A single `await expect(page).toHaveScreenshot('<slug>.png', ...)` call
// both writes this file (on first run / --update-snapshots) and compares
// against it (on every later run) — there is no separate manual
// `page.screenshot()` call for diffable scenarios, so there's only ever one
// file per slug, never two that can drift apart.
//
// Dropping the platform suffix means a baseline captured on Windows is
// compared as-is on a Linux CI runner. If that proves too noisy in practice,
// the fix is running capture in the same OS/environment used to author the
// baseline (e.g. a container), not reintroducing per-platform baseline
// files — see the "flag, don't block" CI posture in the implementation plan.
export default defineConfig({
  testDir: __dirname,
  testMatch: /[a-z-]+\.spec\.ts/,
  snapshotPathTemplate: '{testDir}/shots/{arg}{ext}',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    },
  },
  use: {
    viewport: { width: 1440, height: 900 },
    colorScheme: 'light',
    acceptDownloads: true,
    trace: 'off',
  },
});
