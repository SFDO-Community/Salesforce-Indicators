import { test, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { REG, ORG, readCsv, loginAndGetOrigin, gotoStable, inferTheme } from './lib';

// Key capture: the Indicators Setup page shows a bundle's key inline (no modal, no inner scroll) once a bundle is
// chosen in its selector. Captures one image + one text file per bundle to output/<theme>/keys/<shot_id>.png|txt.
// The text is the diffable record; the image is the visual baseline. Read-only.
//
// Setup page path: inds__Indicators_Setup when the package is installed (regression_prod); Indicators_Setup when
// the source is deployed (regression_dev). Override with SETUP_PAGE. ONLY_BUNDLES=RB01,RB06 limits the run.
// Bundles not on the record pages (status not-on-page) are included: their keys show configuration only.
const THEME = process.env.REGRESSION_THEME || inferTheme(ORG);
const SETUP_PAGE = process.env.SETUP_PAGE || (ORG.endsWith('_dev') ? 'Indicators_Setup' : 'inds__Indicators_Setup');
const OUT = path.join(__dirname, 'output', THEME, 'keys');
const code = (b: string) => b.split('_')[0];
const only = (process.env.ONLY_BUNDLES || '').split(',').filter(Boolean);
const keyRows = readCsv(path.join(REG, 'planning', 'screenshot_matrix.csv')).filter(r => r.kind === 'key' && (!only.length || only.includes(code(r.bundle))));

async function chooseBundle(page: Page, bundle: string) {
  const trigger = page.locator('lightning-combobox').first().getByRole('combobox');
  for (let i = 0; i < 3; i++) {                       // the dropdown renders its options only while open
    await trigger.click();
    await page.waitForTimeout(600);
    if ((await trigger.getAttribute('aria-expanded')) === 'true') break;
  }
  await page.getByRole('option', { name: bundle, exact: true }).click({ timeout: 15_000 });
}

test('keys: one per bundle from the Indicators Setup page', async ({ page }) => {
  fs.mkdirSync(OUT, { recursive: true });
  const origin = await loginAndGetOrigin(page);
  await gotoStable(page, `${origin}/lightning/n/${SETUP_PAGE}`);
  await page.locator('lightning-combobox').first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(3000);
  // Fixed page chrome (utility bar, global header) gets stitched into tall element screenshots; hide it, keeping layout.
  await page.addStyleTag({ content: '.oneUtilityBar, .utilityBar, .slds-utility-bar_container, .forceUtilityBar, .oneGlobalNav, .slds-global-header_container { visibility: hidden !important; }' });

  const report: string[][] = [['shot_id', 'bundle', 'result', 'text_chars', 'error']];
  for (const row of keyRows) {
    try {
      await chooseBundle(page, row.bundle);
      const key = page.locator('*:is(inds-key, c-key)').first();
      await key.waitFor({ timeout: 20_000 });
      let last = -1, same = 0;                          // wait for the key text to stop changing
      for (let i = 0; i < 30 && same < 3; i++) {
        const n = (await key.innerText()).length;
        same = n === last ? same + 1 : 0; last = n;
        await page.waitForTimeout(400);
      }
      const text = (await key.innerText()).split(String.fromCharCode(13)).join('');
      if (!text.includes(row.bundle) && !text.includes(row.card_title)) throw new Error('key does not show the selected bundle');
      await page.mouse.move(1, 1);                     // park the pointer so no hover highlight lands in the baseline
      await page.waitForTimeout(300);
      await key.screenshot({ path: path.join(OUT, `${row.shot_id}.png`) });
      fs.writeFileSync(path.join(OUT, `${row.shot_id}.txt`), text);
      report.push([row.shot_id, row.bundle, 'CAPTURED', String(text.length), '']);
      console.log(`CAPTURED  ${row.shot_id}  (${text.length} chars)`);
    } catch (e: any) {
      const msg = String(e.message || e).split('\n')[0];
      report.push([row.shot_id, row.bundle, 'ERROR', '', msg]);
      console.log(`ERROR  ${row.shot_id}  ${msg}`);
      await page.screenshot({ path: path.join(OUT, `ERROR_${row.shot_id}.png`) }).catch(() => {});
      await page.keyboard.press('Escape').catch(() => {});
    }
  }
  const csv = report.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  fs.writeFileSync(path.join(OUT, 'keys_report.csv'), '﻿' + csv);
});
