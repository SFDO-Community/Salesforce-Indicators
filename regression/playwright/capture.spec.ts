import { test, Page, Locator } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { REG, ORG, readCsv, loginAndGetOrigin, gotoStable, recordIds, normalizeExpected, Avatar, inferTheme, inferEnv } from './lib';

// Regression capture: for every active bundle x record in planning/screenshot_matrix.csv, screenshot the
// bundle element, read what actually rendered, and compare with planning/expected.csv. Read-only: no data in
// the org is changed. Writes output/<theme>/capture_report.csv. Keys are captured separately by keys.spec.ts.
//
// Env filters (all optional): REGRESSION_ORG, REGRESSION_THEME (default: inferred from ORG alias --
// see inferTheme in lib.ts), REGRESSION_ENV, ONLY_BUNDLES=RB01,RB06, ONLY_RECORDS=ACC-01,
// ONLY_OBJECT=Account|Contact.
//
// Hover: this org version exposes hover text as the avatar's alternative-text, so it is checked as an
// attribute on every bundle shot. The separate 'hover' rows in the matrix (popover screenshots) are skipped
// here; they apply only to the popover version of the component.
//
// Expected file: regression/data/prod_only/* only ever deploys to a prod-shaped org (released package, no
// validation rules), so an org built via the regression_dev flow is missing those items entirely -- scoring
// it against the full expected.csv would show spurious DIFFs on RB01/RB02c (fewer avatars than predicted),
// not real regressions. REGRESSION_ENV picks the matching file: 'prod' (default, or inferred when ORG does
// NOT end in '_dev') reads planning/expected.csv; 'dev' (default when ORG ends in '_dev') reads
// planning/expected.dev.csv, built by `python regression/scripts/build_expected.py --env dev`.
const THEME = process.env.REGRESSION_THEME || inferTheme(ORG);
const ENV = process.env.REGRESSION_ENV || inferEnv(ORG);
const list = (v?: string) => (v || '').split(',').filter(Boolean);
const ONLY_BUNDLES = list(process.env.ONLY_BUNDLES), ONLY_RECORDS = list(process.env.ONLY_RECORDS);
// output/<env>-<theme>/ -- NOT output/<theme>/. Confirmed 2026-10-05: inferTheme alone collapses e.g.
// regression_prod_slds2 and regression_dev_slds2 to the same 'slds2' folder, so a dev capture run
// silently overwrote the earlier prod_slds2 screenshots in place -- lost human-comparison baselines with
// no warning. Keep env in the path so prod and dev can never collide again.
const OUT = path.join(__dirname, 'output', `${ENV}-${THEME}`);
const code = (b: string) => b.split('_')[0];
const natural = (a: string, b: string) => code(a).localeCompare(code(b), undefined, { numeric: true });

const matrix = readCsv(path.join(REG, 'planning', 'screenshot_matrix.csv')).filter(r => r.status === 'active');
const EXPECTED_FILE = path.join(REG, 'planning', ENV === 'dev' ? 'expected.dev.csv' : 'expected.csv');
if (!fs.existsSync(EXPECTED_FILE)) {
  throw new Error(`${EXPECTED_FILE} does not exist. Run: python regression/scripts/build_expected.py --env ${ENV}`);
}
console.log(`env=${ENV} (org=${ORG}) -> reading ${path.basename(EXPECTED_FILE)}`);
const expected = readCsv(EXPECTED_FILE);

async function readAvatars(bundle: Locator): Promise<Avatar[]> {
  const raws: any[] = await bundle.locator('lightning-avatar').evaluateAll((els: Element[]) => {
    const q = (el: Element, sel: string) => el.querySelector(sel) || (el as any).shadowRoot?.querySelector(sel) || null;
    return els.map((el: any) => {
      const icon: any = q(el, 'lightning-icon');
      const abbr = q(el, 'abbr, .slds-avatar__initials');
      return {
        initials: el.initials, src: el.src, fallback: el.fallbackIconName, alt: el.alternativeText, variant: el.variant,
        imgCount: el.querySelectorAll('img').length + ((el as any).shadowRoot?.querySelectorAll('img').length ?? 0),
        initialsText: abbr?.textContent?.trim() || '', iconName: icon ? (icon.iconName || icon.getAttribute('icon-name')) : '',
        html: el.outerHTML.slice(0, 700),
      };
    });
  });
  return raws.map(raw => {
    let descriptor = 'empty slot';
    if (raw.imgCount > 0) descriptor = 'image';
    else if (raw.initialsText) descriptor = `initials '${raw.initialsText}'`;
    else if (raw.iconName) descriptor = `icon ${raw.iconName}`;
    return { descriptor, alt: raw.alt ?? '', raw };
  });
}

/** Wait until the avatar count stops changing (wires resolve asynchronously). */
async function settle(bundle: Locator) {
  let last = -1, same = 0;
  for (let i = 0; i < 40 && same < 4; i++) {
    const n = await bundle.locator('lightning-avatar').count();
    same = n === last ? same + 1 : 0; last = n;
    await bundle.page().waitForTimeout(300);
  }
}

async function openTab(page: Page, title: string) {
  await page.getByRole('tab', { name: title, exact: true }).click();
}

function bundleAt(page: Page, tabBundles: string[], bundle: string): Locator {
  return page.locator('*:is(inds-indicator-bundle, c-indicator-bundle):visible').nth(tabBundles.indexOf(bundle));
}

test('capture: bundle shots vs expected', async ({ page }) => {
  const ids = recordIds();
  fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
  const origin = await loginAndGetOrigin(page);

  const H = ['shot_id', 'kind', 'result', 'expected_visible', 'actual_visible', 'expected_empty_slots', 'actual_empty_slots', 'hover_ok', 'expected', 'actual', 'actual_alt_text', 'basis_of_expected', 'error'];
  // Merge into any existing report/raw-JSON rather than overwrite -- a filtered run (ONLY_BUNDLES etc.)
  // must only touch the rows it actually captured. Confirmed 2026-10-05: the old unconditional overwrite
  // let a 2-row subset spot-check silently wipe a complete 116-row report down to 2 rows. Shots this run
  // doesn't touch keep whatever they already had.
  const reportFile = path.join(OUT, 'capture_report.csv');
  const prior = new Map<string, string[]>(
    fs.existsSync(reportFile) ? readCsv(reportFile).map(r => [r.shot_id, H.map(c => r[c] ?? '')]) : []
  );
  const rawFile = path.join(OUT, 'capture_raw.json');
  const priorRaws = new Map<string, any>(
    fs.existsSync(rawFile) ? (JSON.parse(fs.readFileSync(rawFile, 'utf-8')) as any[]).map(r => [r.shot, r]) : []
  );
  const skipped = matrix.filter(r => r.kind === 'hover').length;

  for (const sobject of ['Account', 'Contact']) {
    if (process.env.ONLY_OBJECT && process.env.ONLY_OBJECT !== sobject) continue;
    const rows = matrix.filter(r => r.sobject === sobject && r.kind !== 'hover' && (!ONLY_BUNDLES.length || ONLY_BUNDLES.includes(code(r.bundle))));
    const recIds = [...new Set(rows.filter(r => r.kind === 'bundle').map(r => r.record_id))].filter(r => !ONLY_RECORDS.length || ONLY_RECORDS.includes(r));
    const tabs = [...new Set(rows.map(r => r.page_tab))];

    for (const rid of recIds) {
      console.log(`>> ${rid}: opening record`);
      await gotoStable(page, `${origin}/lightning/r/${sobject}/${ids[rid].id}/view`);
      await page.getByRole('tab', { name: 'Details' }).waitFor({ timeout: 60_000 });
      for (const tab of tabs) {
        const tabBundles = [...new Set(matrix.filter(r => r.sobject === sobject && r.kind === 'bundle' && r.page_tab === tab).map(r => r.bundle))].sort(natural);
        await openTab(page, tab);
        await page.locator('*:is(inds-indicator-bundle, c-indicator-bundle):visible').first().waitFor({ timeout: 30_000 });
        for (const b of tabBundles) {
          if (ONLY_BUNDLES.length && !ONLY_BUNDLES.includes(code(b))) continue;
          const shot = rows.find(r => r.kind === 'bundle' && r.bundle === b && r.record_id === rid);
          if (!shot) continue;
          const bundle = bundleAt(page, tabBundles, b);
          try {
            await bundle.scrollIntoViewIfNeeded();
            await settle(bundle);
            const actual = await readAvatars(bundle);
            await bundle.screenshot({ path: path.join(OUT, 'shots', `${shot.shot_id}.png`) });
            const exp = expected.filter(e => e.bundle === b && e.record_id === rid).sort((x, y) => +x.item_order - +y.item_order);
            const expAll = exp.flatMap(e => e.expected_avatars === 'none' ? [] : e.expected_avatars.split(' | ')).map(normalizeExpected)
              .map(x => x.startsWith('empty slot') ? 'empty slot' : x);
            const errored = exp.some(e => e.level_fired === 'error');
            const actAll = actual.map(a => a.descriptor);
            const expVis = expAll.filter(x => x !== 'empty slot'), actVis = actAll.filter(x => x !== 'empty slot');
            const visOk = errored || JSON.stringify(expVis) === JSON.stringify(actVis);
            const slotOk = errored || expAll.length === actAll.length;
            const expHovers = exp.flatMap(e => e.expected_hover ? e.expected_hover.split(' | ') : []);
            const alts = actual.map(a => a.alt);
            const hoverOk = expHovers.every(h => alts.includes(h));
            const basis = [...new Set(exp.map(e => e.basis).filter(x => x !== 'spec'))].join('+') || 'spec';
            const result = visOk && slotOk && hoverOk ? 'PASS' : (basis !== 'spec' ? 'KNOWN' : 'DIFF');
            prior.set(shot.shot_id, [shot.shot_id, 'bundle', result, String(expVis.length), String(actVis.length), String(expAll.length - expVis.length),
              String(actAll.length - actVis.length), hoverOk ? 'Y' : 'N', expAll.join(' ; '), actAll.join(' ; '), alts.join(' ; '), basis, '']);
            priorRaws.set(shot.shot_id, { shot: shot.shot_id, avatars: actual.map(a => a.raw) });
            console.log(`${result}  ${shot.shot_id}  visible ${expVis.length}/${actVis.length}  empty slots ${expAll.length - expVis.length}/${actAll.length - actVis.length}${hoverOk ? '' : '  HOVER'}`);
          } catch (e: any) {
            const msg = String(e.message || e).split('\n')[0];
            prior.set(shot.shot_id, [shot.shot_id, 'bundle', 'ERROR', '', '', '', '', '', '', '', '', '', msg]);
            console.log(`ERROR  ${shot.shot_id}  ${msg}`);
            await page.screenshot({ path: path.join(OUT, 'shots', `ERROR_${shot.shot_id}.png`) }).catch(() => {});
          }
        }
      }
    }
  }
  const mergedRows = [...prior.values()].sort((a, b) => a[0].localeCompare(b[0]));
  const csv = [H, ...mergedRows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  fs.writeFileSync(reportFile, '﻿' + csv);
  fs.writeFileSync(rawFile, JSON.stringify([...priorRaws.values()], null, 1));
  const tally: Record<string, number> = {};
  for (const r of mergedRows) tally[r[2]] = (tally[r[2]] || 0) + 1;
  console.log(`org=${ORG} theme=${THEME}  ${JSON.stringify(tally)}  (${skipped} popover hover rows skipped; ${mergedRows.length} total rows in report)  report: ${reportFile}`);
});
