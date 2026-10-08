import { test } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { REG, ORG, readCsv, loginAndGetOrigin, gotoStable, inferTheme, inferEnv, openTab } from './lib';

// Date-extension feature test (dev-only, read-only): RF18_Dates_Acct on Test_Date__c.
//
// Why a separate spec with a COMPUTED oracle: the records' dates are "load day + offset" (CumulusCI anchor_date), so a
// static expected CSV would go stale the day after the dataset loads. Instead this spec reads each record's actual
// Test_Date__c, works out "today" the way the platform does (a SOQL `= TODAY` query), and applies the documented
// operator table to a small date calculator written HERE, independent of DateUtility.cls and the LWC.
//
//   Operator        match when (d = the record's date, [start, end) = the literal's range)
//   Equals          start <= d < end          Does Not Equal   NOT Equals
//   Before Start    d < start                 After End        d >= end
//   Before End      d < end                   After Start      d >= start
//
// Expected rendering (badge style): extension matched -> label 'Match' + icon standard:key_dates;
// otherwise the item default -> label 'Other' + icon standard:today.
//
// Guard: if no record has Test_Date__c = TODAY the dataset is stale (loaded on an earlier day) -> the run is SKIPPED
// with instructions rather than reporting false DIFFs. Caveat: near midnight the org user's timezone and the machine
// that loaded the data can disagree about "today"; avoid running within an hour or two of local midnight.
//
// Env: REGRESSION_ORG, REGRESSION_THEME, ONLY_RECORDS=FDATE-08, ONLY_ITEMS=F18_01,F18_07, ONLY_STYLES=badge,avatar
const ENV = process.env.REGRESSION_ENV || inferEnv(ORG);
if (ENV !== 'dev') throw new Error(`features.dates.spec.ts is dev-only; org=${ORG} resolved to env=${ENV}`);
const THEME = process.env.REGRESSION_THEME || inferTheme(ORG);
const OUT = path.join(__dirname, 'output', `${ENV}-${THEME}`, 'features');
const list = (v?: string) => (v || '').split(',').filter(Boolean);
const ONLY_RECORDS = list(process.env.ONLY_RECORDS), ONLY_ITEMS = list(process.env.ONLY_ITEMS);
const STYLES = list(process.env.ONLY_STYLES).length ? list(process.env.ONLY_STYLES) : ['badge'];
const STYLE_TABS: Record<string, string> = { avatar: 'Avatar', badge: 'Badge', pill: 'Pill' };
const BUNDLE_EL = 'c-indicator-bundle:visible, inds-indicator-bundle:visible';
const RF18_INDEX = 4;   // 5th bundle on each style tab (RF14, RF15, RF17, RF16, RF18)

function sfQuery(soql: string): any[] {
  const raw = execSync(`sf data query -q "${soql}" --target-org ${ORG} --json`, { encoding: 'utf-8', env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } });
  return JSON.parse(raw.slice(raw.indexOf('{'))).result.records;
}

// ---- independent date calculator (UTC epoch days; no timezone arithmetic) ----
const day = (iso: string) => Math.floor(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000);
const ymd = (y: number, m: number, d: number) => Math.floor(Date.UTC(y, m, d) / 86400000);   // m is 0-based; overflow rolls over
function range(token: string, today: number): [number, number] {
  const t = new Date(today * 86400000), y = t.getUTCFullYear(), m = t.getUTCMonth();
  switch (token.toUpperCase().replace(/_/g, ' ')) {
    case 'TODAY': return [today, today + 1];
    case 'LAST MONTH': return [ymd(y, m - 1, 1), ymd(y, m, 1)];
    case 'THIS MONTH': return [ymd(y, m, 1), ymd(y, m + 1, 1)];
    case 'NEXT 30 DAYS': return [today + 1, today + 31];      // "custom field filter" interpretation: starts tomorrow
    case 'THIS YEAR': return [ymd(y, 0, 1), ymd(y + 1, 0, 1)];
  }
  throw new Error(`calculator does not know token '${token}'`);
}
function matches(op: string, d: number, [start, end]: [number, number]): boolean {
  switch (op) {
    case 'Equals': return d >= start && d < end;
    case 'Does Not Equal': return !(d >= start && d < end);
    case 'Before Start': return d < start;
    case 'After End': return d >= end;
    case 'Before End': return d < end;
    case 'After Start': return d >= start;
  }
  throw new Error(`calculator does not know operator '${op}'`);
}

const items = readCsv(path.join(REG, 'planning', 'features', 'items.csv')).filter(i => i.bundle === 'RF18_Dates_Acct').sort((a, b) => +a.order - +b.order);
const exts = readCsv(path.join(REG, 'planning', 'features', 'extensions.csv'));
const H = ['key', 'style', 'record_id', 'record_date', 'item_id', 'operator', 'token', 'result', 'exp_label', 'act_label', 'exp_icon', 'act_icon', 'error'];

test('features: date operators vs computed expectation', async ({ page }) => {
  page.setDefaultTimeout(15_000);
  fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });

  const recs = sfQuery("SELECT Id, Name, Site, Test_Date__c FROM Account WHERE Name LIKE 'Feature Date %' ORDER BY Site");
  if (!recs.length) throw new Error("No 'Feature Date %' Accounts. Load them: cci task run load_dataset --mapping datasets/features_dates/features_dates.mapping.yml --sql_path datasets/features_dates/features_dates.dataset.sql --org <org>");
  const todayRows = sfQuery("SELECT Site, Test_Date__c FROM Account WHERE Name LIKE 'Feature Date %' AND Test_Date__c = TODAY");
  if (!todayRows.length) {
    console.log(`SKIPPED: no Feature Date record has Test_Date__c = TODAY, so the dataset is stale (loaded on an earlier day) or the org timezone disagrees. Delete the 'Feature Date %' Accounts and reload datasets/features_dates.`);
    test.skip(true, 'stale date dataset');
    return;
  }
  const today = day(todayRows[0].Test_Date__c);
  console.log(`today (org user, via SOQL TODAY) = ${todayRows[0].Test_Date__c}  (record ${todayRows[0].Site})`);

  const origin = await loginAndGetOrigin(page);
  const reportFile = path.join(OUT, 'dates_report.csv');
  const prior = new Map<string, string[]>(fs.existsSync(reportFile) ? readCsv(reportFile).map(r => [r.key, H.map(c => r[c] ?? '')]) : []);

  for (const rec of recs.filter(r => !ONLY_RECORDS.length || ONLY_RECORDS.includes(r.Site))) {
    const d = day(rec.Test_Date__c);
    await gotoStable(page, `${origin}/lightning/r/Account/${rec.Id}/view`);
    await page.getByRole('tab', { name: 'Details' }).waitFor({ timeout: 60_000 });
    for (const style of STYLES) {
      await openTab(page, STYLE_TABS[style]);
      await page.locator(BUNDLE_EL).first().waitFor({ timeout: 30_000 });
      const bundle = page.locator(BUNDLE_EL).nth(RF18_INDEX);
      await bundle.scrollIntoViewIfNeeded();
      const containers = bundle.locator('.ind-popover-container');
      for (let i = 0; i < 40 && (await containers.count()) < items.length; i++) await page.waitForTimeout(300);
      const n = await containers.count();
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});   // let lazily loaded icon sprites paint (see features.spec.ts)
      await page.waitForTimeout(1_000);
      await bundle.screenshot({ path: path.join(OUT, 'shots', `${style}_${rec.Site}_RF18.png`) });
      let pass = 0, diff = 0;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (ONLY_ITEMS.length && !ONLY_ITEMS.includes(it.item_id)) continue;
        const ext = exts.find(e => e.item_id === it.item_id)!;
        const key = `${style}_${rec.Site}_${it.item_id}`;
        const hit = matches(ext.operator, d, range(ext.text, today));
        const expLabel = hit ? 'Match' : 'Other', expIcon = hit ? 'standard:key_dates' : 'standard:today';
        let actLabel = '', actIcon = '', error = '';
        if (n !== items.length) error = `indicator count exp=${items.length} act=${n}`;
        else {
          const child = containers.nth(i).locator(style === 'pill' ? 'c-indicator-bundle-pill' : style === 'badge' ? 'c-indicator-bundle-badge' : 'c-indicator-bundle-item').first();
          const p = await child.evaluate((el: any) => ({ text: el.indText, pill: el.indBadgePillText, icon: el.indIcon })).catch(() => null);
          if (p) { actLabel = String((style === 'pill' ? p.pill : p.text) ?? ''); actIcon = String(p.icon ?? ''); }
        }
        const labelOk = style === 'avatar' || actLabel === expLabel;
        const ok = !error && labelOk && actIcon === expIcon;
        const result = ok ? 'PASS' : 'DIFF';
        ok ? pass++ : diff++;
        prior.set(key, [key, style, rec.Site, rec.Test_Date__c, it.item_id, ext.operator, ext.text, result, expLabel, actLabel, expIcon, actIcon, error]);
        if (!ok) console.log(`  DIFF  ${key}  ${ext.operator} ${ext.text}  date=${rec.Test_Date__c}  exp='${expLabel}'/${expIcon}  act='${actLabel}'/${actIcon} ${error}`);
      }
      console.log(`${diff ? 'DIFF' : 'PASS'}  ${style}_${rec.Site} (${rec.Test_Date__c})  pass=${pass} diff=${diff}`);
    }
  }
  const rows = [...prior.values()].sort((a, b) => a[0].localeCompare(b[0]));
  fs.writeFileSync(reportFile, '﻿' + [H, ...rows].map(r => r.map(x => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'));
  const tally: Record<string, number> = {};
  for (const r of rows) tally[r[7]] = (tally[r[7]] || 0) + 1;
  console.log(`org=${ORG} env=${ENV} theme=${THEME}  ${JSON.stringify(tally)}  report: ${reportFile}`);
});
