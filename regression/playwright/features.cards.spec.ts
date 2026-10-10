import { test, Page, Locator } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { REG, ORG, readCsv, loginAndGetOrigin, gotoStable, featureRecordIds, inferTheme, inferEnv, openTab } from './lib';

// Card header + Key (dev-only, read-only): RF19a-d, the four combinations of Card_Icon_Background / Card_Icon_Foreground
// (both, background only, foreground only, none), shown with the Lightning Card title and (a, b) the Dynamic Forms title, on the Account
// dev page's "Cards" tab. For each component it checks
//   * card icon name, card title, card body (RF19a's body has {!Name} / {!Rating} merge tokens)
//   * the inline colour variables on the card icon (--backgroundColor / --foregroundColor): exactly the configured ones, nothing else
//   * the SAME variables on the icon inside the Key modal (opened from the card's info icon)
//   * no inline variable anywhere holds the text "undefined" (the applyColorVars bug found 2026-10-08)
// Dynamic Forms title: by design the card uses a UTILITY version of the icon and applies NO custom colours (the Key still shows them).
//
// Read-only: it opens and closes the Key modal; nothing is saved. Output: output/<env>-<theme>/features/cards_report.csv (merged by key),
// shots/cards/*.png (the card, and the Key modal).
// Env: REGRESSION_ORG, REGRESSION_THEME, ONLY_RECORDS=FEAT-01 (the Key is opened only for the first record).
const ENV = process.env.REGRESSION_ENV || inferEnv(ORG);
if (ENV !== 'dev') throw new Error(`features.cards.spec.ts is dev-only; org=${ORG} resolved to env=${ENV}`);
const THEME = process.env.REGRESSION_THEME || inferTheme(ORG);
const OUT = path.join(__dirname, 'output', `${ENV}-${THEME}`, 'features');
const ONLY_RECORDS = (process.env.ONLY_RECORDS || '').split(',').filter(Boolean);
const BUNDLE_EL = 'c-indicator-bundle:visible, inds-indicator-bundle:visible';

// Components on the Cards tab, top to bottom (see regression/scripts/add_feature_tabs.py).
const VARIANTS = [
  { bundle: 'RF19a_CardBoth_Acct', ts: 'Lightning Card' }, { bundle: 'RF19b_CardBgOnly_Acct', ts: 'Lightning Card' },
  { bundle: 'RF19c_CardFgOnly_Acct', ts: 'Lightning Card' }, { bundle: 'RF19d_CardNone_Acct', ts: 'Lightning Card' },
  { bundle: 'RF19a_CardBoth_Acct', ts: 'Dynamic Forms' }, { bundle: 'RF19b_CardBgOnly_Acct', ts: 'Dynamic Forms' },
];
const bundles = Object.fromEntries(readCsv(path.join(REG, 'planning', 'features', 'bundles.csv')).map(b => [b.bundle_id, b]));
const accounts = Object.fromEntries(readCsv(path.join(REG, 'planning', 'features', 'records_account.csv')).map(r => [r.record_id, r]));

const norm = (s: string) => (s || '').replace(/\s+/g, ' ').trim();
const merge = (tpl: string, rec: Record<string, string>) => tpl.replace(/\{!(\w+)\}/g, (_m, f) => rec[f] ?? '');
function parseVars(styleTexts: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of styleTexts) for (const m of s.matchAll(/--(backgroundColor|foregroundColor):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
const fmt = (v: Record<string, string>) => Object.keys(v).sort().map(k => `${k}=${v[k]}`).join(' ') || '(none)';
const sameVars = (a: Record<string, string>, b: Record<string, string>) => fmt(a).toLowerCase() === fmt(b).toLowerCase();

const H = ['key', 'bundle', 'title_style', 'record_id', 'result', 'differences', 'exp_vars', 'card_vars', 'key_vars', 'card_icon', 'card_title', 'card_body'];

async function readCard(b: Locator, ts: string) {
  const dyn = ts === 'Dynamic Forms';
  const styleTexts: string[] = await b.locator('[style*="--"]').evaluateAll((els: Element[]) => els.map(e => (e as HTMLElement).style.cssText)).catch(() => []);
  const headerIcon = b.locator(dyn ? '.slds-section__title lightning-icon' : '.slds-card__header-title lightning-icon').first();
  const icon = await headerIcon.evaluate((e: any) => e.iconName || e.getAttribute('icon-name') || '').catch(() => '');
  const title = norm(await b.locator(dyn ? '.slds-section__title .slds-truncate' : '.slds-card__header-title').first().innerText().catch(() => ''));
  const body = norm(await b.locator('p.slds-var-p-left_medium').first().innerText().catch(() => ''));
  return { styleTexts, vars: parseVars(styleTexts), icon, title, body };
}

async function readKey(page: Page, b: Locator, shot: string) {
  await b.locator('button[title="Indicator Value Key"]').first().click();
  const dlg = page.locator('section[role="dialog"]').first();
  await dlg.waitFor({ state: 'visible', timeout: 15_000 });
  await dlg.locator('lightning-icon.cardIcon').first().waitFor({ timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(800);
  const styleTexts: string[] = await dlg.locator('lightning-icon.cardIcon').evaluateAll((els: Element[]) => els.map(e => (e as HTMLElement).style.cssText)).catch(() => []);
  await dlg.screenshot({ path: shot }).catch(() => {});
  await page.getByRole('button', { name: 'Cancel and close' }).first().click().catch(() => page.keyboard.press('Escape'));
  await dlg.waitFor({ state: 'hidden', timeout: 8_000 }).catch(() => {});
  return { styleTexts, vars: parseVars(styleTexts) };
}

test('features: card icon colours on the card and in the Key', async ({ page }) => {
  page.setDefaultTimeout(15_000);
  fs.mkdirSync(path.join(OUT, 'shots', 'cards'), { recursive: true });
  const ids = featureRecordIds('Account');
  const origin = await loginAndGetOrigin(page);
  const reportFile = path.join(OUT, 'cards_report.csv');
  const prior = new Map<string, string[]>(fs.existsSync(reportFile) ? readCsv(reportFile).map(r => [r.key, H.map(c => r[c] ?? '')]) : []);

  const cardRecords = Object.keys(ids).sort().filter(r => !ONLY_RECORDS.length || ONLY_RECORDS.includes(r));
  if (!cardRecords.length) throw new Error(`No Account feature records found in ${ORG}: the run would test nothing. Is the dataset loaded? Use --org <alias>, not a default org.`);
  for (const rid of cardRecords) {
    const openKey = rid === 'FEAT-01';   // the Key does not depend on the record: open it once per run
    console.log(`>> ${rid}: opening record`);
    await gotoStable(page, `${origin}/lightning/r/Account/${ids[rid].id}/view`);
    await page.getByRole('tab', { name: 'Details' }).waitFor({ timeout: 60_000 });
    await openTab(page, 'Cards');
    await page.locator(BUNDLE_EL).first().waitFor({ timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
    await page.waitForTimeout(1_500);

    for (let i = 0; i < VARIANTS.length; i++) {
      const v = VARIANTS[i], cfg = bundles[v.bundle], dyn = v.ts === 'Dynamic Forms';
      const key = `${v.bundle.split('_')[0]}_${dyn ? 'DF' : 'LC'}_${rid}`;
      const diffs: string[] = [];
      let card: any = null, kv: Record<string, string> = {};
      try {
        const b = page.locator(BUNDLE_EL).nth(i);
        await b.scrollIntoViewIfNeeded();
        card = await readCard(b, v.ts);
        await b.screenshot({ path: path.join(OUT, 'shots', 'cards', `${key}.png`) });
        const expVars: Record<string, string> = {};
        if (cfg.card_bg) expVars.backgroundColor = cfg.card_bg;
        if (cfg.card_fg) expVars.foregroundColor = cfg.card_fg;
        const expCardVars = dyn ? {} : expVars;   // Dynamic Forms title: no custom colours on the card, by design
        const expIcon = dyn ? cfg.card_icon.replace(/^[^:]+:/, 'utility:') : cfg.card_icon;
        if (card.icon !== expIcon) diffs.push(`card icon exp=${expIcon} act=${card.icon}`);
        if (norm(card.title) !== norm(cfg.title)) diffs.push(`card title exp='${cfg.title}' act='${card.title}'`);
        const expBody = norm(merge(cfg.card_text, accounts[rid] || {}));
        if (card.body !== expBody) diffs.push(`card body exp='${expBody}' act='${card.body}'`);
        if (!sameVars(card.vars, expCardVars)) diffs.push(`card colour variables exp=${fmt(expCardVars)} act=${fmt(card.vars)}`);
        if (card.styleTexts.some((s: string) => /undefined/.test(s))) diffs.push(`card has a CSS variable holding the text 'undefined': ${card.styleTexts.filter((s: string) => /undefined/.test(s)).join(' | ')}`);
        if (openKey) {
          const k = await readKey(page, b, path.join(OUT, 'shots', 'cards', `${key}_KEY.png`));
          kv = k.vars;
          if (!sameVars(k.vars, expVars)) diffs.push(`KEY colour variables exp=${fmt(expVars)} act=${fmt(k.vars)}`);
          if (k.styleTexts.some(s => /undefined/.test(s))) diffs.push(`KEY has a CSS variable holding the text 'undefined': ${k.styleTexts.filter(s => /undefined/.test(s)).join(' | ')}`);
          if (!dyn && !sameVars(card.vars, k.vars)) diffs.push(`card and Key disagree: card ${fmt(card.vars)} vs Key ${fmt(k.vars)}`);
        }
        const result = diffs.length ? 'DIFF' : 'PASS';
        prior.set(key, [key, v.bundle, v.ts, rid, result, diffs.join('; '), fmt(expVars), fmt(card.vars), openKey ? fmt(kv) : '(not opened)', card.icon, card.title, card.body]);
        console.log(`${result}  ${key}  card ${fmt(card.vars)}${openKey ? `  key ${fmt(kv)}` : ''}${diffs.length ? '   <- ' + diffs.join('; ') : ''}`);
      } catch (e: any) {
        const msg = String(e.message || e).split('\n')[0];
        prior.set(key, [key, v.bundle, v.ts, rid, 'ERROR', msg, '', '', '', '', '', '']);
        console.log(`ERROR  ${key}  ${msg}`);
        await page.screenshot({ path: path.join(OUT, 'shots', 'cards', `ERROR_${key}.png`) }).catch(() => {});
        await page.keyboard.press('Escape').catch(() => {});
      }
    }
  }
  const rows = [...prior.values()].sort((a, b) => a[0].localeCompare(b[0]));
  fs.writeFileSync(reportFile, '﻿' + [H, ...rows].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'));
  const tally: Record<string, number> = {};
  for (const r of rows) tally[r[4]] = (tally[r[4]] || 0) + 1;
  console.log(`org=${ORG} env=${ENV} theme=${THEME}  ${JSON.stringify(tally)}  report: ${reportFile}`);
});
