import { test, expect, Page } from '@playwright/test';
import { ORG, loginAndGetOrigin, gotoStable, featureRecordIds, inferTheme, inferEnv, openTab } from './lib';

// Pixel baselines (dev-only, read-only) for the shots whose point is COLOUR or LAYOUT, which the DOM checks cannot see:
//   * RF14 on the Avatar / Badge / Pill tabs for FEAT-01 (values) and FEAT-02 (blank: the inverse chips)   -> 6 shots
//   * the card header icons RF19a-d (Lightning Card title) and RF19a,b (Dynamic Forms title) on FEAT-01   -> 6 shots
//   * the Key modal for RF19b (background only) and RF19c (foreground only)                               -> 2 shots
// 14 shots per theme. Everything else is covered by features.spec.ts (content) and features.cards.spec.ts (colour variables).
//
// Baselines are stored under output/baselines/<env>-<theme>/ (gitignored: rendering depends on the machine's fonts, so they are
// regenerated per release and per machine). First run on a theme writes them; later runs compare (maxDiffPixels in playwright.config.ts).
//   write/refresh:  REGRESSION_ORG=<alias> npx playwright test features.pixels.spec.ts --update-snapshots=all
//   compare:        REGRESSION_ORG=<alias> npx playwright test features.pixels.spec.ts
// Prove it can fail: compare one theme's org against ANOTHER theme's baselines with REGRESSION_THEME=<other theme>.
// Assertions are SOFT: one run reports every differing shot, not just the first. Env: REGRESSION_ORG, REGRESSION_THEME (default inferred from the alias).
const ENV = process.env.REGRESSION_ENV || inferEnv(ORG);
if (ENV !== 'dev') throw new Error(`features.pixels.spec.ts is dev-only; org=${ORG} resolved to env=${ENV}`);
const THEME = process.env.REGRESSION_THEME || inferTheme(ORG);
const BUNDLE_EL = 'c-indicator-bundle:visible, inds-indicator-bundle:visible';
const snap = (name: string) => [`${ENV}-${THEME}`, `${name}.png`];

async function settleTab(page: Page) {
  await page.locator(BUNDLE_EL).first().waitFor({ timeout: 30_000 });
  // Icon sprites load late on a fresh org: wait for the network once per tab-open, then park the mouse so no hover state is captured.
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
  await page.waitForTimeout(1_500);
  await page.mouse.move(2, 2);
}

test('pixel baselines: colour and layout shots', async ({ page }) => {
  page.setDefaultTimeout(20_000);
  const ids = featureRecordIds('Account');
  if (!ids['FEAT-01'] || !ids['FEAT-02']) throw new Error(`Feature accounts FEAT-01/FEAT-02 not found in ${ORG}: is the dataset loaded? Use --org <alias>, not a default org.`);
  const origin = await loginAndGetOrigin(page);

  // ---- RF14 on the three style tabs, for the valued and the blank record
  for (const rid of ['FEAT-01', 'FEAT-02']) {
    await gotoStable(page, `${origin}/lightning/r/Account/${ids[rid].id}/view`);
    await page.getByRole('tab', { name: 'Details' }).waitFor({ timeout: 60_000 });
    for (const [style, tab] of [['avatar', 'Avatar'], ['badge', 'Badge'], ['pill', 'Pill']]) {
      await openTab(page, tab);
      await settleTab(page);
      const rf14 = page.locator(BUNDLE_EL).nth(0);               // RF14 is the first bundle on each style tab
      await rf14.scrollIntoViewIfNeeded();
      await expect.soft(rf14).toHaveScreenshot(snap(`rf14_${style}_${rid}`));
    }
  }

  // ---- RF19 cards on the Cards tab (FEAT-01), and the Key for two of them
  await gotoStable(page, `${origin}/lightning/r/Account/${ids['FEAT-01'].id}/view`);
  await page.getByRole('tab', { name: 'Details' }).waitFor({ timeout: 60_000 });
  await openTab(page, 'Cards');
  await settleTab(page);
  const cards = [['RF19a_LC', 0], ['RF19b_LC', 1], ['RF19c_LC', 2], ['RF19d_LC', 3], ['RF19a_DF', 4], ['RF19b_DF', 5]] as const;
  for (const [name, i] of cards) {
    const b = page.locator(BUNDLE_EL).nth(i);
    await b.scrollIntoViewIfNeeded();
    await page.mouse.move(2, 2);
    await expect.soft(b).toHaveScreenshot(snap(`card_${name}`));
  }
  for (const [name, i] of [['RF19b', 1], ['RF19c', 2]] as const) {
    const b = page.locator(BUNDLE_EL).nth(i);
    await b.scrollIntoViewIfNeeded();
    await b.locator('button[title="Indicator Value Key"]').first().click();
    const dlg = page.locator('section[role="dialog"]').first();
    await dlg.waitFor({ state: 'visible', timeout: 15_000 });
    await dlg.locator('lightning-icon.cardIcon').first().waitFor({ timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(1_000);
    await page.mouse.move(2, 2);
    // Only the modal's white box. The dialog and its container span the viewport, so shooting either also captures the dimmed page behind it (unrelated
    // bundles, the nav bar): clip to the union of the modal's own header, body and footer instead.
    const parts = [];
    for (const sel of ['.slds-modal__header', '.slds-modal__content', '.slds-modal__footer']) {
      const bb = await dlg.locator(sel).first().boundingBox().catch(() => null);
      if (bb) parts.push(bb);
    }
    if (!parts.length) throw new Error('Key modal header/body/footer not found: the modal markup changed');
    const x0 = Math.min(...parts.map(b => b.x)), y0 = Math.min(...parts.map(b => b.y));
    const x1 = Math.max(...parts.map(b => b.x + b.width)), y1 = Math.max(...parts.map(b => b.y + b.height));
    await expect.soft(page).toHaveScreenshot(snap(`key_${name}`), { clip: { x: Math.round(x0), y: Math.round(y0), width: Math.round(x1 - x0), height: Math.round(y1 - y0) } });
    await page.getByRole('button', { name: 'Cancel and close' }).first().click().catch(() => page.keyboard.press('Escape'));
    await dlg.waitFor({ state: 'hidden', timeout: 8_000 }).catch(() => {});
  }
});
