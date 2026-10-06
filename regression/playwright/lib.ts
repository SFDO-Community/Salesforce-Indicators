import type { Page } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export const REG = path.resolve(__dirname, '..');
export const ORG = process.env.REGRESSION_ORG || 'Salesforce-Indicators__regression_prod';

/** Minimal RFC4180 CSV parser (handles BOM, quotes, embedded commas/newlines). */
export function readCsv(file: string): Record<string, string>[] {
  const text = fs.readFileSync(file, 'utf-8').replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

function sf(args: string): any {
  const out = execSync(`sf ${args} --target-org ${ORG} --json`, { encoding: 'utf-8', maxBuffer: 20_000_000, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } });
  return JSON.parse(out.replace(/\[[0-9;]*m/g, "").slice(out.indexOf("{"))).result;
}

/** One-time frontdoor login URL. It carries a session token: never log it. */
export function loginUrl(): string {
  return sf('org open --url-only').url;
}

/** Map planning record_id (ACC-01, CON-01...) to the org record Id, via the record Name. */
export function recordIds(): Record<string, { id: string; sobject: string }> {
  const out: Record<string, { id: string; sobject: string }> = {};
  const acc = sf(`data query -q "SELECT Id, Name FROM Account WHERE Name LIKE 'Regression %'"`).records;
  for (const r of readCsv(path.join(REG, 'planning', 'records_account.csv'))) {
    const hit = acc.find((a: any) => a.Name === r.Name);
    if (hit) out[r.record_id] = { id: hit.Id, sobject: 'Account' };
  }
  const con = sf(`data query -q "SELECT Id, LastName FROM Contact WHERE LastName LIKE 'Regression %'"`).records;
  for (const r of readCsv(path.join(REG, 'planning', 'records_contact.csv'))) {
    const hit = con.find((c: any) => c.LastName === r.LastName);
    if (hit) out[r.record_id] = { id: hit.Id, sobject: 'Contact' };
  }
  return out;
}

/** Feature-test Accounts (dev-only dataset datasets/features): planning record_id (FEAT-01...) -> org Id, via Name. */
export function featureRecordIds(): Record<string, { id: string; sobject: string }> {
  const out: Record<string, { id: string; sobject: string }> = {};
  const acc = sf(`data query -q "SELECT Id, Name FROM Account WHERE Name LIKE 'Feature %'"`).records;
  for (const r of readCsv(path.join(REG, 'planning', 'features', 'records_account.csv'))) {
    const hit = acc.find((a: any) => a.Name === r.Name);
    if (hit) out[r.record_id] = { id: hit.Id, sobject: 'Account' };
  }
  return out;
}

/**
 * Frontdoor login, settled onto a stable app-domain origin.
 *
 * The frontdoor redirect chain can bounce through the org's Setup subdomain
 * (...my.salesforce-setup.com/lightning/setup/SetupOneHome/home) before landing on the real
 * app domain (...lightning.force.com). A plain `waitForURL(/lightning/)` can match that
 * transient Setup URL (it contains "lightning" too), handing back an origin that later record
 * navigations fight with an in-flight redirect still resolving from login ("Navigation ...
 * is interrupted by another navigation ..."). Confirmed against a fresh scratch org
 * (2026-10-04): the redirect race is real and stalls a run silently rather than erroring.
 *
 * Fix: after the first "lightning" match, explicitly navigate to /lightning/page/home (forcing
 * off any Setup bounce) and retry that nav if it gets interrupted, then take the origin from
 * wherever that settles.
 */
export async function loginAndGetOrigin(page: any): Promise<string> {
  await page.goto(loginUrl());
  await page.waitForURL(/lightning|one\.app/, { timeout: 90_000 });
  for (let i = 0; i < 4; i++) {
    const origin = new URL(page.url()).origin;
    try {
      await page.goto(`${origin}/lightning/page/home`, { timeout: 30_000 });
      await page.waitForTimeout(1500);
      return new URL(page.url()).origin;
    } catch (e: any) {
      if (!String(e.message || e).includes('interrupted by another navigation')) throw e;
      await page.waitForTimeout(1500);   // let the competing redirect finish, then retry
    }
  }
  return new URL(page.url()).origin;
}

/** page.goto with one retry if a leftover redirect interrupts it (see loginAndGetOrigin). */
export async function gotoStable(page: any, url: string, timeout = 60_000) {
  try {
    await page.goto(url, { timeout });
  } catch (e: any) {
    if (!String(e.message || e).includes('interrupted by another navigation')) throw e;
    await page.waitForTimeout(1000);
    await page.goto(url, { timeout });
  }
}

/**
 * Infer the output-folder theme label from the org alias -- ONLY for orgs with an explicit,
 * verified theme deploy. Never guesses at a bare org's theme.
 *
 * History, both turns of it:
 *  1. (2026-10-04, first mistake) capture.spec.ts/keys.spec.ts defaulted REGRESSION_THEME to a
 *     hardcoded 'slds1' with no basis at all. Fixed by inferring from the org alias instead.
 *  2. (2026-10-04, second mistake, THIS fix) that inference still assumed a bare `regression_prod`/
 *     `regression_dev` alias (no explicit theme deploy; orgs/regression.json sets no
 *     activeThemeName) must be running "the scratch-org factory default, SLDS2 light" -- stated
 *     as fact here, turned out false. The user logged into the actual `regression_prod` org and
 *     found it rendering SLDS1; visual proof followed (the RB01 custom-color item, #B34A00,
 *     rendered correctly -- SLDS2 is documented to block that override, so a working override
 *     meant the org was never SLDS2 to begin with). A bare org's theme is apparently NOT a
 *     predictable constant -- it can differ between orgs for reasons we don't control (possibly a
 *     leftover manual setting from early manual setup, possibly instance/release-dependent). Don't
 *     repeat that mistake a third time: a bare alias with no theme suffix returns 'unverified', not
 *     a guess. Confirm the real theme (`sf project retrieve start --metadata "Settings:LightningExperience"`
 *     only tells you whether an override was explicitly deployed, NOT what's actually rendering when
 *     it wasn't -- that needs a visual check, e.g. does the RB01 custom-color item in a captured
 *     screenshot show real color, wash out, or get ignored entirely. All three are distinct and
 *     have each been observed) before trusting a bare org's output, and pass REGRESSION_THEME
 *     explicitly once you know it.
 *
 * Orgs confirmed by an explicit themed deploy, as of 2026-10-04: `regression_prod_slds1`
 * (regression/settings-slds1), `regression_prod_slds2` (regression/settings-slds2, confirmed
 * genuinely SLDS2 by the ignored-color-override visual check), `regression_prod_slds2-dark`
 * (regression/settings-slds2 + Color Scheme=DARK).
 */
export function inferTheme(org: string): string {
  if (/_slds1\b/.test(org)) return 'slds1';
  if (/slds2.?dark/i.test(org)) return 'slds2-dark';
  if (/_slds2\b/.test(org)) return 'slds2';
  return 'unverified';   // bare regression_prod / regression_dev: no explicit theme deploy, no guess
}

/**
 * Infer prod vs dev from the org alias -- by SEGMENT, not by suffix.
 *
 * Confirmed wrong 2026-10-04 (caught before it was ever run, not after): capture.spec.ts/keys.spec.ts
 * both used `org.endsWith('_dev')` to decide prod vs dev (which expected*.csv to score against; which
 * Indicators Setup page path, namespaced vs not, to use). That broke the moment themed dev orgs showed
 * up (`regression_dev_slds2`, `regression_dev_slds1`, ...) -- none of those end in `_dev`, so they'd
 * have silently scored against the PROD expected file (wrong item set) and tried the namespaced Setup
 * page (wrong path on an unmanaged org). Matching on the `_dev_` / trailing `_dev` SEGMENT instead of
 * the string suffix survives any theme suffix appended after it.
 */
export function inferEnv(org: string): 'prod' | 'dev' {
  return org.split('_').includes('dev') ? 'dev' : 'prod';
}

export interface Avatar { descriptor: string; alt: string; raw: any }

/** Compare-friendly form of an expected avatar string (drops colors and fallback annotations). */
export function normalizeExpected(s: string): string {
  return s.replace(/ bg=#[0-9A-Fa-f]+/g, '').replace(/ \(broken image fallback\)/, '').trim();
}

/**
 * Open a tab on a Lightning record page, falling back to the "More Tabs" overflow menu.
 * Shared by features.spec.ts and features.actions.spec.ts.
 */
export async function openTab(page: Page, title: string) {
  const tab = page.getByRole('tab', { name: title, exact: true });
  // A tab pushed into the overflow can still exist in the DOM (clipped, not hidden), so count() is not proof it
  // is clickable: try it briefly, then fall back to the More Tabs menu.
  if (await tab.count()) {
    try { await tab.click({ timeout: 3_000 }); return; } catch { /* in the overflow menu */ }
  }
  // The "More Tabs" button is taller than the tab bar, so its centre lands on the panel below it: click near the top.
  await page.getByRole('button', { name: 'More Tabs' }).first().click({ position: { x: 20, y: 10 }, timeout: 20_000 });
  await page.getByRole('menuitem', { name: title, exact: true }).click({ timeout: 20_000 });
}
