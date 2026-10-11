import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import * as yaml from 'js-yaml';
import { locators } from './salesforce/locators';

// Drives the download-as-json flow described in steps.yaml, one step at a
// time, and saves a screenshot per step (named by slug) to shots/. The
// concrete Playwright actions live here; steps.yaml is the source of truth
// for step order, slugs, and which steps get a shot — see SKILL.md.

const STEPS_YAML_PATH = path.join(__dirname, 'steps.yaml');
const SHOTS_DIR = path.join(__dirname, 'shots');
const TARGET_ORG = process.env.CAPTURE_ORG ?? 'inds_scratch_20260930';

interface Step {
  slug: string;
  action: string;
  target: string;
  wait_for: string;
  shot: boolean;
  narration: string;
  conditional?: boolean;
}

function loadSteps(): Step[] {
  const doc = yaml.load(fs.readFileSync(STEPS_YAML_PATH, 'utf8')) as { steps: Step[] };
  return doc.steps;
}

function getFrontdoorUrl(targetOrg: string): string {
  const out = execFileSync(
    process.platform === 'win32' ? 'sf.cmd' : 'sf',
    ['org', 'open', '--target-org', targetOrg, '--url-only', '--json'],
    {
      encoding: 'utf8',
      shell: process.platform === 'win32',
      // Force plain output: under the test runner sf CLI otherwise emits
      // ANSI color codes even with --json, which breaks JSON.parse.
      env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
    },
  );
  // sf CLI sometimes prepends an "update available" warning line to stdout
  // even with --json; the JSON payload itself always starts at the first '{'.
  const jsonStart = out.indexOf('{');
  const parsed = JSON.parse(out.slice(jsonStart));
  return parsed.result.url as string;
}

async function waitForDomStable(page: Page) {
  // Some Lightning/LWC icons (e.g. the "Indicator Settings" card icon) are
  // inline SVGs whose glyph is resolved from an async data fetch rather than
  // an <img> load — they paint a placeholder first, then swap to the real
  // icon once the component's own data resolves. There's no single generic
  // DOM signal for "that fetch is done," so instead poll document.body's
  // serialized markup until two reads 150ms apart are identical, meaning
  // nothing is still re-rendering.
  let previous: string | null = null;
  for (let i = 0; i < 20; i++) {
    const current = await page.evaluate(() => document.body.innerHTML.length + ':' + document.body.innerHTML);
    if (current === previous) return;
    previous = current;
    await page.waitForTimeout(150);
  }
  throw new Error('waitForDomStable: DOM never settled after 20 polls');
}

async function shoot(page: Page, slug: string) {
  await waitForDomStable(page);
  // animations: 'disabled' finishes all CSS transitions/animations (modal
  // fade-in, the Salesforce cloud logo's idle shimmer, etc.) before the
  // screenshot is taken — without it, two consecutive runs of this spec
  // produce visibly different frames depending on exactly when the capture
  // lands mid-animation.
  await page.screenshot({ path: path.join(SHOTS_DIR, `${slug}.png`), animations: 'disabled' });
}

test.describe('download-as-json', () => {
  const steps = loadSteps();
  const bySlug = new Map(steps.map((s) => [s.slug, s]));

  test('export an indicator bundle as a JSON recipe', async ({ page }) => {
    fs.mkdirSync(SHOTS_DIR, { recursive: true });

    // Auth: get a fresh frontdoor URL from the sf CLI and start from it.
    // Never script the login form (MFA blocks it).
    await page.goto(getFrontdoorUrl(TARGET_ORG));
    await page.goto('https://' + new URL(page.url()).host + '/lightning/page/home');

    // --- open-app-launcher ---
    if (bySlug.has('open-app-launcher')) {
      await locators.appLauncher.icon(page).click();
      // The waffle icon's colored/"open" look is driven by its own
      // aria-expanded="true" attribute selector — wait for it explicitly so
      // the icon has its final look before we screenshot.
      await expect(locators.appLauncher.icon(page)).toHaveAttribute('aria-expanded', 'true');
      await expect(locators.appLauncher.searchBox(page)).toBeVisible();
      // The Apps list icons load asynchronously (icon sprite <img> requests);
      // a screenshot taken immediately can catch one mid-load as a text/color
      // placeholder instead of its final icon, causing a layout shift.
      // waitForLoadState('networkidle') never resolves here — Lightning
      // keeps background polling/websocket traffic alive indefinitely — so
      // instead wait for every <img> inside the Apps listbox to finish
      // loading (naturalWidth > 0). Uses a Locator (not document.querySelector)
      // because the App Launcher markup lives inside LWC shadow roots that
      // plain DOM queries from page.evaluate can't see into.
      await expect
        .poll(() =>
          page
            .getByRole('listbox', { name: 'Apps' })
            .locator('img')
            .evaluateAll(
              (imgs) =>
                // imgs.every() is vacuously true on an empty array, so this
                // must also require the list to actually be populated —
                // otherwise the poll succeeds before the Apps list has
                // rendered any icons at all.
                imgs.length > 0 &&
                imgs.every((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0),
            ),
        )
        .toBe(true);
      if (bySlug.get('open-app-launcher')!.shot) await shoot(page, 'open-app-launcher');
    }

    // --- search-indicators-setup ---
    if (bySlug.has('search-indicators-setup')) {
      await locators.appLauncher.searchBox(page).click();
      await page.keyboard.type('Indicators Setup');
      await expect(locators.appLauncher.indicatorsSetupResult(page)).toBeVisible();
      if (bySlug.get('search-indicators-setup')!.shot) await shoot(page, 'search-indicators-setup');
    }

    // --- select-indicators-setup ---
    if (bySlug.has('select-indicators-setup')) {
      await locators.appLauncher.indicatorsSetupResult(page).click();
      await expect(locators.indicatorsSetup.bundlePicklist(page)).toBeVisible();
      if (bySlug.get('select-indicators-setup')!.shot) await shoot(page, 'select-indicators-setup');
    }

    // --- select-bundle ---
    if (bySlug.has('select-bundle')) {
      await locators.indicatorsSetup.bundlePicklist(page).click();
      await expect(locators.indicatorsSetup.accountCompanyInfoOption(page)).toBeVisible();
      if (bySlug.get('select-bundle')!.shot) await shoot(page, 'select-bundle');
      await locators.indicatorsSetup.accountCompanyInfoOption(page).click();
    }

    // --- bundle-details-loaded ---
    if (bySlug.has('bundle-details-loaded')) {
      // The Export button in the detail panel header only renders once the
      // bundle (and its items) have finished loading — used as the proxy
      // "spinner has stopped" signal since the panel title is a slotted web
      // component title we can't reliably string-match in the a11y tree.
      await expect(locators.bundleDetailPanel.exportButton(page)).toBeVisible();
      if (bySlug.get('bundle-details-loaded')!.shot) await shoot(page, 'bundle-details-loaded');
    }

    // --- open-export-modal ---
    if (bySlug.has('open-export-modal')) {
      await locators.bundleDetailPanel.exportButton(page).click();
      await expect(locators.exportModal.heading(page)).toBeVisible();
      if (bySlug.get('open-export-modal')!.shot) await shoot(page, 'open-export-modal');
    }

    // --- confirm-export-options --- (defaults: nothing to change)
    if (bySlug.has('confirm-export-options')) {
      await expect(locators.exportModal.exportAsJsonRadioLabel(page)).toBeVisible();
      if (bySlug.get('confirm-export-options')!.shot) await shoot(page, 'confirm-export-options');
    }

    // --- export-items-only-conditional --- (documented, then reset)
    if (bySlug.has('export-items-only-conditional')) {
      await locators.exportModal.exportItemsOnlyCheckboxLabel(page).click();
      if (bySlug.get('export-items-only-conditional')!.shot) {
        await shoot(page, 'export-items-only-conditional');
      }
      await locators.exportModal.exportItemsOnlyCheckboxLabel(page).click(); // reset
    }

    // --- export-as-csv-conditional --- (documented, then reset)
    if (bySlug.has('export-as-csv-conditional')) {
      await locators.exportModal.exportAsCsvRadioLabel(page).click();
      if (bySlug.get('export-as-csv-conditional')!.shot) {
        await shoot(page, 'export-as-csv-conditional');
      }
      await locators.exportModal.exportAsJsonRadioLabel(page).click(); // reset to default
    }

    // --- click-export ---
    if (bySlug.has('click-export')) {
      const downloadPromise = page.waitForEvent('download');
      await locators.exportModal.exportButton(page).click();
      await downloadPromise;
      await expect(locators.exportModal.heading(page)).toBeHidden();
      if (bySlug.get('click-export')!.shot) await shoot(page, 'click-export');
    }
  });
});
