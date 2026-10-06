import { test, Page, Locator } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { REG, ORG, readCsv, loginAndGetOrigin, gotoStable, featureRecordIds, inferTheme, inferEnv, openTab } from './lib';

// Feature ACTION click-through (dev-only, OPT-IN): actually clicks action buttons.
//   ACTIONS=1 npx playwright test features.actions.spec.ts
// Without ACTIONS=1 every test here is skipped, so a normal capture run can never click anything.
//
// What is safe and why:
//  * URL actions open the target in a new tab. Requests to the target hosts (yahoo.com) are intercepted and answered
//    with a stub page, so nothing leaves the machine and the URL we read is the one the component asked for.
//  * The Flow Modal runs regression/dev_only/flows/Regression_Feature_Display, a display-only screen flow with NO
//    DML. We read the modal and close it with the header X; we never press Finish.
//
// Reads: planning/expected.features.csv (button label + resolved URL per indicator).
// Writes: output/<env>-<theme>/features/actions_report.csv (merged by key) and shots/actions/*.png.
//
// Env: REGRESSION_ORG, REGRESSION_THEME, ONLY_ITEMS=F16_01,F16_07
const ENV = process.env.REGRESSION_ENV || inferEnv(ORG);
if (ENV !== 'dev') throw new Error(`features.actions.spec.ts is dev-only; org=${ORG} resolved to env=${ENV}`);
const THEME = process.env.REGRESSION_THEME || inferTheme(ORG);
const OUT = path.join(__dirname, 'output', `${ENV}-${THEME}`, 'features');
const ONLY_ITEMS = (process.env.ONLY_ITEMS || '').split(',').filter(Boolean);
const BUNDLE_EL = 'c-indicator-bundle:visible, inds-indicator-bundle:visible';
const CONTAINER = '.ind-popover-container';
const RF16_INDEX = 3;   // 4th bundle on each style tab (RF14, RF15, RF17, RF16)
const STUB_HOSTS = /(^|\.)yahoo\.com$/;

const expected = readCsv(path.join(REG, 'planning', 'expected.features.csv'));
const itemsCsv = readCsv(path.join(REG, 'planning', 'features', 'items.csv'));
const rf16Order = itemsCsv.filter(i => i.bundle === 'RF16_Actions_Acct').sort((a, b) => +a.order - +b.order).map(i => i.item_id);

// Which checks run. style x record x item x mode. URL actions: popover-button on every style for the headline item,
// everything else on avatar only (the popover and click wiring are shared across styles).
interface Case { style: string; rec: string; item: string; mode: 'popover-button' | 'indicator-click' | 'flow-modal' }
const CASES: Case[] = [
  ...['avatar', 'badge', 'pill'].map(style => ({ style, rec: 'FEAT-01', item: 'F16_01', mode: 'popover-button' as const })),
  { style: 'avatar', rec: 'FEAT-01', item: 'F16_02', mode: 'popover-button' },
  { style: 'avatar', rec: 'FEAT-01', item: 'F16_02', mode: 'indicator-click' },   // no Confirm Required: indicator click fires
  { style: 'avatar', rec: 'FEAT-01', item: 'F16_04', mode: 'indicator-click' },   // Confirm Required: indicator click must NOT fire
  { style: 'avatar', rec: 'FEAT-01', item: 'F16_04', mode: 'popover-button' },    // ...but the popover button does
  { style: 'avatar', rec: 'FEAT-02', item: 'F16_05', mode: 'popover-button' },    // false-state action ON: button fires
  ...['avatar', 'badge', 'pill'].map(style => ({ style, rec: 'FEAT-01', item: 'F16_07', mode: 'flow-modal' as const })),
].filter(c => !ONLY_ITEMS.length || ONLY_ITEMS.includes(c.item));

const H = ['key', 'style', 'record_id', 'item_id', 'mode', 'result', 'expectation', 'actual', 'error'];

function expRow(c: Case) {
  const r = expected.find(e => e.style === c.style && e.record_id === c.rec && e.bundle === 'RF16_Actions_Acct' && e.item_id === c.item);
  if (!r) throw new Error(`no expected row for ${c.style}/${c.rec}/${c.item}`);
  return r;
}

async function hoverCenter(page: Page, target: Locator) {
  await target.scrollIntoViewIfNeeded({ timeout: 5_000 });
  const b = await target.boundingBox();
  if (!b) throw new Error('no bounding box');
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 2 });
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

test.describe('features: action click-through (opt-in)', () => {
  test.skip(!process.env.ACTIONS, 'opt-in: set ACTIONS=1 (this spec CLICKS action buttons)');

  test('actions', async ({ page, context }) => {
    page.setDefaultTimeout(15_000);
    fs.mkdirSync(path.join(OUT, 'shots', 'actions'), { recursive: true });
    // Answer yahoo.com with a stub so the popup keeps the URL the component requested and no real traffic occurs.
    await context.route(url => STUB_HOSTS.test(new URL(url).hostname), r =>
      r.fulfill({ status: 200, contentType: 'text/html', body: '<title>stub</title><p>stubbed by features.actions.spec.ts</p>' }));

    const ids = featureRecordIds();
    const origin = await loginAndGetOrigin(page);
    const reportFile = path.join(OUT, 'actions_report.csv');
    const prior = new Map<string, string[]>(fs.existsSync(reportFile) ? readCsv(reportFile).map(r => [r.key, H.map(c => r[c] ?? '')]) : []);

    let currentKey = '';
    for (const c of CASES) {
      const key = `${c.style}_${c.rec}_${c.item}_${c.mode}`;
      currentKey = key;
      const exp = expRow(c);
      const wantUrl = exp.action_urls, wantButton = exp.button_labels;
      let result = 'PASS', expectation = '', actual = '', error = '';
      try {
        await gotoStable(page, `${origin}/lightning/r/Account/${ids[c.rec].id}/view`);
        await page.getByRole('tab', { name: 'Details' }).waitFor({ timeout: 60_000 });
        await openTab(page, { avatar: 'Avatar', badge: 'Badge', pill: 'Pill' }[c.style]!);
        await page.locator(BUNDLE_EL).first().waitFor({ timeout: 30_000 });
        const bundle = page.locator(BUNDLE_EL).nth(RF16_INDEX);
        await bundle.scrollIntoViewIfNeeded();
        // wait for the bundle's indicators to render (visible ones only; the blank record shows fewer)
        await bundle.locator(CONTAINER).first().waitFor({ timeout: 20_000 });
        await page.waitForTimeout(800);

        // Locate THIS item's container: RF16 renders only visible indicators in item order, so index by the number of
        // earlier RF16 items that are visible for this record/style.
        const visibleBefore = rf16Order.slice(0, rf16Order.indexOf(c.item))
          .filter(id => +(expected.find(e => e.style === c.style && e.record_id === c.rec && e.bundle === 'RF16_Actions_Acct' && e.item_id === id)?.visible_count ?? 0) > 0)
          .reduce((n, id) => n + +expected.find(e => e.style === c.style && e.record_id === c.rec && e.bundle === 'RF16_Actions_Acct' && e.item_id === id)!.visible_count, 0);
        const container = bundle.locator(CONTAINER).nth(visibleBefore);

        const pos = await hoverCenter(page, container);
        const pop = container.locator('.ind-popover');
        await pop.first().waitFor({ state: 'visible', timeout: 1500 }).catch(() => {});

        if (c.mode === 'flow-modal') {
          expectation = 'modal "Indicator Flow Launcher" opens and shows the account name; closes via X';
          await pop.locator('.slds-popover__footer button').first().click();
          const modal = page.locator('lightning-modal, c-flow-modal, section[role="dialog"].slds-modal').first();
          await modal.waitFor({ state: 'visible', timeout: 15_000 });
          // the flow loads asynchronously: wait for its text, not a fixed delay
          await page.getByText(/Flow action successfully performed/).first().waitFor({ timeout: 20_000 });
          const text = (await page.getByText(/Flow action successfully performed/).first().innerText()).replace(/\s+/g, ' ').trim();
          const title = await page.getByText('Indicator Flow Launcher').first().isVisible().catch(() => false);
          actual = `title=${title} text='${text}'`;
          await page.screenshot({ path: path.join(OUT, 'shots', 'actions', `${key}.png`) });
          const accountName = (await page.locator('records-highlights2, .entityNameTitle, lightning-formatted-text').first().innerText().catch(() => '')).trim();
          const wantName = c.rec === 'FEAT-01' ? 'Feature Full' : c.rec === 'FEAT-02' ? 'Feature Blank' : 'Feature Cold';
          if (!title || !text.includes(wantName)) { result = 'DIFF'; error = `expected title + '${wantName}' in modal text`; }
          await page.getByRole('button', { name: /^close$/i }).first().click({ timeout: 5_000 })
            .catch(async () => { await page.keyboard.press('Escape'); });
          await modal.waitFor({ state: 'hidden', timeout: 8_000 }).catch(() => { if (result === 'PASS') { result = 'DIFF'; error = 'modal did not close'; } });
          void accountName;
        } else {
          const shouldFire = !(c.mode === 'indicator-click' && exp.confirm_required === 'true');
          expectation = c.mode === 'indicator-click'
            ? (shouldFire ? `indicator click opens ${wantUrl}` : 'indicator click does NOT open anything (Confirm Required)')
            : `popover button '${wantButton}' opens ${wantUrl}`;
          const popupP = context.waitForEvent('page', { timeout: shouldFire || c.mode === 'popover-button' ? 8_000 : 2_500 }).catch(() => null);
          if (c.mode === 'popover-button') {
            const btn = pop.locator('.slds-popover__footer button').first();
            const label = (await btn.innerText({ timeout: 3_000 })).trim();
            if (label !== wantButton) { result = 'DIFF'; error = `button label exp='${wantButton}' act='${label}'`; }
            await btn.click();
          } else {
            await page.mouse.click(pos.x, pos.y);
          }
          const popup = await popupP;
          if (popup) {
            await popup.waitForURL(u => u.toString() !== 'about:blank', { timeout: 8_000, waitUntil: 'commit' }).catch(() => {});
            actual = popup.url();
            await popup.close();
          } else {
            actual = '(no new tab)';
          }
          if (shouldFire) {
            if (actual.replace(/\/$/, '') !== wantUrl.replace(/\/$/, '')) { result = 'DIFF'; error = (error ? error + '; ' : '') + `url exp=${wantUrl} act=${actual}`; }
          } else if (popup) { result = 'DIFF'; error = `Confirm Required indicator click opened ${actual}`; }
        }
      } catch (e: any) {
        result = 'ERROR'; error = String(e.message || e).split('\n')[0];
        await page.screenshot({ path: path.join(OUT, 'shots', 'actions', `ERROR_${key}.png`) }).catch(() => {});
      } finally {
        await page.mouse.move(2, 2).catch(() => {});
      }
      prior.set(key, [key, c.style, c.rec, c.item, c.mode, result, expectation, actual, error]);
      console.log(`${result}  ${key}  ${actual}${error ? '   <- ' + error : ''}`);
    }
    void currentKey;
    const rows = [...prior.values()].sort((a, b) => a[0].localeCompare(b[0]));
    fs.writeFileSync(reportFile, '﻿' + [H, ...rows].map(r => r.map(x => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'));
    const tally: Record<string, number> = {};
    for (const r of rows) tally[r[5]] = (tally[r[5]] || 0) + 1;
    console.log(`org=${ORG} env=${ENV} theme=${THEME}  ${JSON.stringify(tally)}  report: ${reportFile}`);
  });
});
