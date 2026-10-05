---
name: regression-indicator-capture
description: Runs the Playwright capture suite in regression/playwright against a deployed regression org (capture.spec.ts for the 116 bundle screenshots + DOM comparison against planning/expected.csv, keys.spec.ts for the 19 key captures from the Indicators Setup page), then compares the run's output against a prior saved run. Use this whenever someone asks to capture/re-capture regression screenshots, run the regression Playwright suite, verify a respun regression org still matches a prior baseline, or test a new theme (SLDS1/SLDS2/SLDS2-dark). This is the CAPTURE side of the regression indicator suite — it never builds the CMDT/planning tables (that's the build_*.py scripts under regression/scripts, run directly, no skill wraps them yet) and never deploys metadata to the org (that's `cci flow run regression_prod`/`regression_dev`, the user's own CumulusCI flows).
---

# Capture and compare the regression indicator suite

Runs the two Playwright specs that exercise the Salesforce-Indicators regression suite built under
`regression/` (planning tables → CMDT → FlexiPages → live org), and compares a fresh run's results
against a previously saved one. This is a from-scratch build for this repo (not a generic Playwright
runner) — read this whole file before running anything, the conventions here aren't guessable from the
spec files alone.

```
regression/planning/expected.csv ──┐
regression/flexipages/*.xml ───────┼──▶ capture.spec.ts ──▶ output/<theme>/{shots/*.png, capture_report.csv}
(deployed CMDT in the org)  ───────┘
                                       keys.spec.ts     ──▶ output/<theme>/keys/{*.png, *.txt, keys_report.csv}
```

## Prerequisites (not this skill's job — confirm, don't redo)

- The target org alias is deployed and seeded: `cci flow run regression_prod --org <alias>` (or
  `regression_prod_slds1` / `regression_prod_dark` for a non-default theme, or `regression_dev` once
  its own gaps below are closed) has already been run by the user. This skill never deploys metadata
  or runs CCI flows — if the org doesn't have the 19 bundles and 8 Account / 5 Contact records, stop
  and say so rather than trying to fix it here.
- `sf org list` shows the alias with a live (non-expired) scratch org.

## Running it

From `regression/playwright`, foreground (not backgrounded — see the gotcha below), per theme:

```bash
REGRESSION_ORG=<alias> REGRESSION_THEME=<slds1|slds2|slds2-dark> npx playwright test capture.spec.ts
REGRESSION_ORG=<alias> REGRESSION_THEME=<slds1|slds2|slds2-dark> npx playwright test keys.spec.ts
```

`REGRESSION_ORG` defaults to `Salesforce-Indicators__regression_prod`, `REGRESSION_THEME` to `slds1`.
Each theme's output lands in its own `output/<theme>/` folder so runs don't overwrite each other.
Useful filters on `capture.spec.ts`: `ONLY_BUNDLES=RB01,RB06`, `ONLY_RECORDS=ACC-01`,
`ONLY_OBJECT=Account|Contact` — use these for a quick subset check before committing to a full run.

### Which expected file (prod vs dev)

`regression/data/prod_only/*` only ever deploys to a prod-shaped org (released package, no validation
rules) — an org built via the `regression_dev` flow is missing those items entirely. `capture.spec.ts`
infers which `expected*.csv` to score against from the org alias: ends in `_dev` → `expected.dev.csv`,
otherwise → `expected.csv`. Override with `REGRESSION_ENV=prod|dev` if the alias doesn't follow that
convention. If the matching file doesn't exist yet, the spec fails fast with the command to build it
rather than silently scoring against the wrong one:

```bash
python regression/scripts/build_expected.py --env dev        # -> planning/expected.dev.csv
python regression/scripts/build_shot_matrix.py --env dev      # -> planning/screenshot_matrix.dev.csv (optional; informational rollup only, capture.spec.ts doesn't read it)
```

Confirmed 2026-10-04: `expected.csv` (prod) had drifted stale — generated before `regression/data/`
was split into base + `prod_only`, it kept predicting the full set only because nobody had regenerated
it since. Regenerating it with the old (pre-`--env`) version of `build_expected.py` would have silently
dropped the 4 `prod_only` items and broken *prod* scoring, not just left dev unhandled. Always use
`--env prod` (the default) to regenerate `expected.csv`, never run it bare expecting prod behavior by
accident of history.

The browser runs headed on purpose (`playwright.config.ts`: `headless: false`) so the person who asked
for the run can watch it. Don't make it headless to go faster.

### Before overwriting a theme's output, save what's there

If `output/<theme>/` already holds a run you'll want to diff against afterward, move it aside first
(e.g. `output/<theme>_prev/`) — both specs overwrite their output directory on every run with no
confirmation.

## Reading the results

`capture.spec.ts` scores each bundle shot by comparing what actually rendered (DOM: avatar kind,
initials text, icon name, in order) against `planning/expected.csv`'s *intended* behavior for that
bundle+record — not against a pixel baseline (there isn't one yet; see Known gaps):

- **PASS** — rendered content matches `expected.csv` exactly, including hover text (alt-text
  attribute, since this org build predates the hover popover — see Known gaps).
- **KNOWN** — a difference exists, but every item involved is tagged in `expected.csv` with a
  non-`spec` `basis` (`known-issue`, `known-gap`, `unspecified`) — i.e. it's a difference the suite
  already expects and explains. Read the row's `notes` column in `expected.csv` for why.
- **DIFF** — an unexplained difference. This is the only result that means "something changed and
  nobody decided that was OK." A DIFF is the thing to investigate, not KNOWN.

`keys.spec.ts` just confirms each of the 19 bundle keys rendered a full page (saves an image + the
full key text, since the key scrolls and a screenshot alone would crop it) — no PASS/KNOWN/DIFF
scoring, just CAPTURED or ERROR per bundle.

## Comparing against a prior run

There is no script for this yet — it's a small manual diff, read both CSVs and compare row by row on
`shot_id`: same `result`, same `actual` (the rendered content string), same `hover_ok`. Do this whenever
a run follows an org respin, a metadata change, or anything else that should produce *identical* output
(a same-theme re-run against equivalent data) — it's cheap and it isolates "did the environment change
something" from "did the code change something," which a single run can't tell you on its own. It is
not needed for a deliberately different run (a new theme, a `_dev` vs `_prod` comparison) where
differences are expected — those get read on their own PASS/KNOWN/DIFF terms instead.

## The login-race gotcha (already fixed — know about it, don't reintroduce it)

A frontdoor login (`sf org open --url-only`) can redirect through the org's Setup subdomain
(`...my.salesforce-setup.com/lightning/setup/...`) before settling on the real app domain
(`...lightning.force.com`). A naive `page.waitForURL(/lightning/)` matches the Setup URL too (it
contains "lightning"), so a login helper can hand back the wrong origin — and a subsequent
`page.goto()` to a record page then races a still-resolving redirect and gets silently interrupted,
stalling the whole run with no error and no output (confirmed against a fresh scratch org,
2026-10-04 — it isn't a login failure, so nothing throws; the run just never produces a shot).

`lib.ts` already handles this: `loginAndGetOrigin(page)` settles onto a stable origin by explicitly
navigating to `/lightning/page/home` and retrying through an "interrupted by another navigation"
error, and `gotoStable(page, url)` retries once the same way for any later navigation. Both specs use
these — don't replace them with a plain `page.goto(loginUrl())` + `waitForURL`.

## Don't background this with a Chromium window

A headed `run_in_background` run of either spec has stalled indefinitely with zero output in this
environment even after the login-race fix was in place, while the identical foreground run finished
in under 5 minutes. Root cause unconfirmed (plausibly OS-level throttling of an unfocused/backgrounded
window), but the fix that's actually been verified twice is: run it in the foreground and wait for it.

## Known gaps (don't assume these are solved — confirm with the user before relying on them)

- **No pixel baselines yet.** The comparison is DOM content only (avatar kind/text/icon), not a visual
  diff. `toHaveScreenshot` baselines haven't been added.
- **Popover hover is untested here.** This org build exposes hover as the avatar's `alternative-text`
  attribute (checked on every bundle shot); a popover-based hover component exists only on the
  branch, and the 10 planned popover screenshots (`kind: hover` rows in `screenshot_matrix.csv`) are
  still skipped by both specs.
- **Three themes, one suite.** `REGRESSION_THEME` only labels the output folder — it does not change
  what the org looks like. Switching SLDS1/SLDS2/SLDS2-dark is the CCI flow's job
  (`regression_prod_slds1` / `regression_prod` / `regression_prod_dark` as of 2026-10-04); run the
  matching flow against the org before capturing with the matching `REGRESSION_THEME` value.

## What this skill does not do

- Build or edit the planning tables, CMDT CSVs, or `expected.csv`/`screenshot_matrix.csv` — those are
  `regression/scripts/build_{planning,cmdt,expected,shot_matrix}_csvs.py`, run directly.
- Deploy anything to an org — that's the user's CumulusCI flows (`regression_prod`, `regression_dev`,
  and the theme variants in `cumulusci.yml`).
- Decide whether a DIFF is a real regression or a new known issue — it surfaces the DIFF with enough
  detail (expected vs. actual, which items) for a human to make that call; `expected.csv`'s `basis`
  column only changes when someone decides it should.
