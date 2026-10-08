import { test, Page, Locator } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { REG, ORG, readCsv, loginAndGetOrigin, gotoStable, featureRecordIds, inferTheme, inferEnv, openTab } from './lib';

// Feature capture (dev-only): Badge/Pill fields, popover hover text + merge tokens, action buttons.
// For every style tab x feature record x bundle, screenshot the bundle, read every rendered indicator
// (label/icon/position/text color via the child component's public props, popover body/button/help by
// hovering) and compare with planning/expected.features.csv (built by scripts/build_expected_features.py).
//
// Read-only: hovering never changes data. Action BUTTONS are read but never clicked here (URL popups and
// the Flow Modal are a separate, explicit step) -- clicking could navigate or launch a flow.
//
// Output: output/<env>-<theme>/features/{shots/ (bundle shots), shots/popovers/ (indicator + open popover crops),
// features_report.csv, features_raw.json}. Reports MERGE by
// key, so a filtered run only touches the rows it captured (same rule as capture.spec.ts).
//
// Env filters (all optional): REGRESSION_ORG, REGRESSION_THEME, ONLY_STYLES=badge,pill,
// ONLY_RECORDS=FEAT-01, ONLY_BUNDLES=RF14,RF17, NO_HOVER=1 (skip popover reads).
//
// Page layout this depends on (regression/dev_only/flexipages/Account_Record_Page_Regression): tabs
// "Avatar" / "Badge" / "Pill", each holding BUNDLE_ORDER below, top to bottom. They live under the "More Tabs"
// overflow at 1600px wide, so tabs are opened through openTab().
const ENV = process.env.REGRESSION_ENV || inferEnv(ORG);
if (ENV !== 'dev') throw new Error(`features.spec.ts is dev-only (these bundles do not exist in prod); org=${ORG} resolved to env=${ENV}`);
const THEME = process.env.REGRESSION_THEME || inferTheme(ORG);
const OUT = path.join(__dirname, 'output', `${ENV}-${THEME}`, 'features');
const list = (v?: string) => (v || '').split(',').filter(Boolean);
const ONLY_STYLES = list(process.env.ONLY_STYLES), ONLY_RECORDS = list(process.env.ONLY_RECORDS), ONLY_BUNDLES = list(process.env.ONLY_BUNDLES);
const NO_HOVER = !!process.env.NO_HOVER;

const STYLE_TABS: Record<string, string> = { avatar: 'Avatar', badge: 'Badge', pill: 'Pill' };
const BUNDLE_ORDER = ['RF14_BadgePill_Acct', 'RF15_Popover_Acct', 'RF17_PopoverFallback_Acct', 'RF16_Actions_Acct', 'RF18_Dates_Acct'];
const prefix = (b: string) => b.split('_')[0];
const CONTAINER = '.ind-popover-container';

const EXPECTED_FILE = path.join(REG, 'planning', 'expected.features.csv');
if (!fs.existsSync(EXPECTED_FILE)) throw new Error(`${EXPECTED_FILE} missing. Run: python regression/scripts/build_expected_features.py`);
const expected = readCsv(EXPECTED_FILE);

// Item order within each bundle: primary placements use items.csv `order`; extra_bundles placements are numbered
// 1.. in items.csv order (mirrors build_feature_cmdt_csvs.py).
const itemOrder = new Map<string, number>();
{
  const counters: Record<string, number> = {};
  for (const it of readCsv(path.join(REG, 'planning', 'features', 'items.csv'))) {
    itemOrder.set(`${it.bundle}|${it.item_id}`, +it.order);
    for (const extra of (it.extra_bundles || '').split(';').filter(Boolean)) {
      counters[extra] = (counters[extra] || 0) + 1;
      itemOrder.set(`${extra}|${it.item_id}`, counters[extra]);
    }
  }
}

interface ExpInd { key: string; item_id: string; label: string; icon: string; pos: string; color: string; popover: string; body: string; button: string; help: string; basis: string }
function expectedFor(style: string, rec: string, bundle: string): ExpInd[] {
  const rows = expected.filter(r => r.style === style && r.record_id === rec && r.bundle === bundle)
    .sort((a, b) => (itemOrder.get(`${bundle}|${a.item_id}`) ?? 0) - (itemOrder.get(`${bundle}|${b.item_id}`) ?? 0));
  const out: ExpInd[] = [];
  for (const r of rows) {
    const n = +r.visible_count;
    const f = (col: string) => r[col].split('|');
    for (let i = 0; i < n; i++) {
      out.push({
        key: `${r.shot_id}#${i + 1}`, item_id: r.item_id, label: f('labels')[i] ?? '', icon: f('icons')[i] ?? '', pos: f('positions')[i] ?? '',
        color: f('text_colors')[i] ?? '', popover: f('popover')[i] ?? 'no', body: f('popover_bodies')[i] ?? '',
        button: f('button_labels')[i] ?? '', help: f('help_texts')[i] ?? '', basis: r.basis,
      });
    }
  }
  return out;
}

const BUNDLE_EL = 'c-indicator-bundle:visible, inds-indicator-bundle:visible';

/** Wait until the indicator count stops changing (wires resolve asynchronously) or reaches the expected count. */
async function settle(bundle: Locator, want: number) {
  let last = -1, same = 0;
  for (let i = 0; i < 40 && same < 4; i++) {
    const n = await bundle.locator(CONTAINER).count();
    if (n === want && same >= 1) return;
    same = n === last ? same + 1 : 0; last = n;
    await bundle.page().waitForTimeout(300);
  }
}

interface Actual { icon: string; label: string; pos: string; color: string; bg: string; popover: string; body: string; button: string; help: string }

async function readIndicator(page: Page, container: Locator, style: string, popoverShot: string): Promise<Actual> {
  let icon = '', label = '', pos = '', color = '', bg = '';
  if (style === 'avatar') {
    const av = await container.locator('lightning-avatar').first().evaluate((el: any) => {
      const q = (s: string) => el.querySelector(s) || el.shadowRoot?.querySelector(s) || null;
      const ic: any = q('lightning-icon');
      const abbr = q('abbr, .slds-avatar__initials');
      return { icon: ic ? (ic.iconName || ic.getAttribute('icon-name') || '') : '', initials: abbr?.textContent?.trim() || '', img: el.querySelectorAll('img').length + (el.shadowRoot?.querySelectorAll('img').length ?? 0) };
    }).catch(() => ({ icon: '', initials: '', img: 0 }));
    icon = av.img ? 'image' : av.initials ? `initials '${av.initials}'` : av.icon;
  } else {
    const child = container.locator(style === 'badge' ? 'c-indicator-bundle-badge' : 'c-indicator-bundle-pill').first();
    const p = await child.evaluate((el: any) => ({ text: el.indText, pillText: el.indBadgePillText, icon: el.indIcon, pos: el.indIconPosition, color: el.indTextColor, bg: el.indBackgroundColor })).catch(() => null);
    if (p) {
      // String(): props can come back as numbers (e.g. a NumberOfEmployees display value of 25)
      icon = String(p.icon ?? '');
      label = String((style === 'pill' ? p.pillText : p.text) ?? '');
      pos = style === 'badge' ? String(p.pos || 'start') : '';
      color = String(p.color ?? '');
      bg = String(p.bg ?? '');
    }
  }
  let popover = 'no', body = '', button = '', help = '';
  if (!NO_HOVER) {
    // Move the mouse to the container's centre instead of locator.hover(): hover() runs actionability checks and
    // stalls (30s each) whenever the previous popover still overlaps this target.
    await container.scrollIntoViewIfNeeded({ timeout: 5_000 });
    const box = await container.boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 2 });
    const pop = container.locator('.ind-popover');
    await pop.first().waitFor({ state: 'visible', timeout: 900 }).catch(() => {});
    if (await pop.count()) {
      popover = 'yes';
      // count()-guard each read: innerText() on a missing element waits for the whole test timeout.
      const bodyEl = pop.locator('.slds-popover__body'), btnEl = pop.locator('.slds-popover__footer button');
      body = (await bodyEl.count()) ? (await bodyEl.first().innerText({ timeout: 3_000 }).catch(() => '')).trim() : '';
      button = (await btnEl.count()) ? (await btnEl.first().innerText({ timeout: 3_000 }).catch(() => '')).trim() : '';
      help = (await pop.locator('lightning-helptext').count()) ? 'yes' : '';
      // Tight crop of the indicator + its open popover (page-level: the popover is an absolute overlay that a
      // bundle-element screenshot cannot include). Clamped to the viewport.
      const cb = await container.boundingBox(), pb = await pop.first().boundingBox();
      const vp = page.viewportSize() ?? { width: 1600, height: 1000 };
      if (cb && pb) {
        const x = Math.max(0, Math.min(cb.x, pb.x) - 12), y = Math.max(0, Math.min(cb.y, pb.y) - 12);
        const x2 = Math.min(vp.width, Math.max(cb.x + cb.width, pb.x + pb.width) + 12), y2 = Math.min(vp.height, Math.max(cb.y + cb.height, pb.y + pb.height) + 12);
        await page.screenshot({ path: popoverShot, clip: { x, y, width: x2 - x, height: y2 - y } }).catch(() => {});
      }
    }
    await page.mouse.move(2, 2);
    // let this popover close before the next target, or it can cover (and re-trigger) its neighbour
    await page.locator('.ind-popover').first().waitFor({ state: 'detached', timeout: 1_500 }).catch(() => {});
  }
  return { icon, label, pos, color, bg, popover, body, button, help };
}

const norm = (s: string) => (s ?? '').trim().toLowerCase();

function compare(style: string, e: ExpInd, a: Actual): string[] {
  const d: string[] = [];
  if (norm(e.icon) !== norm(a.icon)) d.push(`icon exp=${e.icon} act=${a.icon}`);
  if (style !== 'avatar') {
    if (e.label !== a.label) d.push(`label exp='${e.label}' act='${a.label}'`);
    if (norm(e.color) !== norm(a.color)) d.push(`text_color exp='${e.color}' act='${a.color}'`);
    if (style === 'badge' && norm(e.pos) !== norm(a.pos)) d.push(`position exp=${e.pos} act=${a.pos}`);
  }
  if (!NO_HOVER) {
    if (e.popover !== a.popover) d.push(`popover exp=${e.popover} act=${a.popover}`);
    else if (e.popover === 'yes') {
      if (e.body !== a.body) d.push(`popover_body exp='${e.body}' act='${a.body}'`);
      if (e.button !== a.button) d.push(`button exp='${e.button}' act='${a.button}'`);
      if (!!e.help !== !!a.help) d.push(`help_text exp=${e.help ? 'yes' : 'no'} act=${a.help ? 'yes' : 'no'}`);
    }
  }
  return d;
}

const H = ['key', 'style', 'record_id', 'bundle', 'item_id', 'result', 'basis', 'differences', 'exp_label', 'act_label', 'exp_icon', 'act_icon', 'exp_pos', 'act_pos', 'exp_color', 'act_color', 'act_bg', 'exp_popover', 'act_popover', 'exp_body', 'act_body', 'exp_button', 'act_button'];

test('features: style x record x bundle vs expected', async ({ page }) => {
  page.setDefaultTimeout(15_000);   // no action may wait for the whole test timeout
  const ids = featureRecordIds();
  fs.mkdirSync(path.join(OUT, 'shots', 'popovers'), { recursive: true });
  const origin = await loginAndGetOrigin(page);

  const reportFile = path.join(OUT, 'features_report.csv');
  const prior = new Map<string, string[]>(fs.existsSync(reportFile) ? readCsv(reportFile).map(r => [r.key, H.map(c => r[c] ?? '')]) : []);
  const rawFile = path.join(OUT, 'features_raw.json');
  const priorRaws = new Map<string, any>(fs.existsSync(rawFile) ? (JSON.parse(fs.readFileSync(rawFile, 'utf-8')) as any[]).map(r => [r.key, r]) : []);

  const records = Object.keys(ids).sort().filter(r => !ONLY_RECORDS.length || ONLY_RECORDS.includes(r));
  const styles = Object.keys(STYLE_TABS).filter(s => !ONLY_STYLES.length || ONLY_STYLES.includes(s));

  for (const rid of records) {
    console.log(`>> ${rid}: opening record`);
    await gotoStable(page, `${origin}/lightning/r/Account/${ids[rid].id}/view`);
    await page.getByRole('tab', { name: 'Details' }).waitFor({ timeout: 60_000 });
    for (const style of styles) {
      await openTab(page, STYLE_TABS[style]);
      await page.locator(BUNDLE_EL).first().waitFor({ timeout: 30_000 });
      // Icon sprites load lazily and a freshly created org is slow at it: a screenshot taken right after the DOM settles can show
      // coloured circles with NO glyph (seen on the first SLDS1 run in a new org). DOM reads were unaffected, but a pixel baseline
      // would enshrine the blank state. Wait ONCE per tab-open (Lightning never fully idles, so this usually spends the whole
      // timeout: doing it per bundle cost ~2 extra minutes per record and blew the run's time budget).
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
      await page.waitForTimeout(1_500);
      for (let bi = 0; bi < BUNDLE_ORDER.length; bi++) {
        const bundleName = BUNDLE_ORDER[bi];
        if (ONLY_BUNDLES.length && !ONLY_BUNDLES.includes(prefix(bundleName))) continue;
        const exp = expectedFor(style, rid, bundleName);
        const shotId = `${style}_${rid}_${prefix(bundleName)}`;
        try {
          const bundle = page.locator(BUNDLE_EL).nth(bi);
          await bundle.scrollIntoViewIfNeeded();
          await settle(bundle, exp.length);
          const containers = bundle.locator(CONTAINER);
          const n = await containers.count();
          await bundle.screenshot({ path: path.join(OUT, 'shots', `${shotId}.png`) });
          const mark = (e: ExpInd, result: string, diffs: string, a?: Actual) => {
            prior.set(e.key, [e.key, style, rid, bundleName, e.item_id, result, e.basis, diffs, e.label, a?.label ?? '', e.icon, a?.icon ?? '', e.pos, a?.pos ?? '', e.color, a?.color ?? '', a?.bg ?? '', e.popover, a?.popover ?? '', e.body, a?.body ?? '', e.button, a?.button ?? '']);
          };
          if (n !== exp.length) {
            for (const e of exp) mark(e, e.basis === 'spec' ? 'DIFF' : 'REVIEW', `bundle indicator count exp=${exp.length} act=${n}`);
            console.log(`DIFF  ${shotId}  indicator count ${exp.length}/${n}`);
            continue;
          }
          let pass = 0, review = 0, diff = 0;
          for (let i = 0; i < n; i++) {
            const e = exp[i];
            const a = await readIndicator(page, containers.nth(i), style, path.join(OUT, 'shots', 'popovers', `${e.key.replace('#', '_')}.png`));
            const diffs = compare(style, e, a);
            const result = diffs.length === 0 ? 'PASS' : (e.basis === 'spec' ? 'DIFF' : 'REVIEW');
            mark(e, result, diffs.join('; '), a);
            priorRaws.set(e.key, { key: e.key, actual: a });
            result === 'PASS' ? pass++ : result === 'REVIEW' ? review++ : diff++;
            if (result !== 'PASS') console.log(`  ${result}  ${e.key}  ${diffs.join('; ')}`);
          }
          console.log(`${diff ? 'DIFF' : review ? 'REVIEW' : 'PASS'}  ${shotId}  indicators=${n}  pass=${pass} review=${review} diff=${diff}`);
        } catch (err: any) {
          const msg = String(err.message || err).split('\n')[0];
          console.log(`ERROR  ${shotId}  ${msg}`);
          await page.screenshot({ path: path.join(OUT, 'shots', `ERROR_${shotId}.png`) }).catch(() => {});
        }
      }
    }
  }

  const rows = [...prior.values()].sort((a, b) => a[0].localeCompare(b[0]));
  fs.writeFileSync(reportFile, '﻿' + [H, ...rows].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'));
  fs.writeFileSync(rawFile, JSON.stringify([...priorRaws.values()], null, 1));
  const tally: Record<string, number> = {};
  for (const r of rows) tally[r[5]] = (tally[r[5]] || 0) + 1;
  console.log(`org=${ORG} env=${ENV} theme=${THEME}  ${JSON.stringify(tally)}  (${rows.length} rows)  report: ${reportFile}`);
});
