# Running the suite

**Every command below targets an org: ask first, say which org(s) and whether it changes data, and always pass the alias.** The three orgs and their expiry dates are in `regression/STATE.md`.
Alias pattern: `Salesforce-Indicators__regression_dev_<theme>` with theme `slds1`, `slds2`, `slds2-dark` (the theme and the `dev` environment are inferred from the alias).

## Deploy and (re)load data (the maintainer normally runs these)
```bash
cci task run deploy --path regression/dev_only/customMetadata --org <alias>
cci task run deploy --path regression/dev_only/flexipages     --org <alias>
cci task run deploy --path force-app/main/default/lwc/<component> --org <alias>      # product LWC changes
# refresh test data (deletes ALL Accounts/Contacts, so the regression dataset must be reloaded too):
cci task run delete_data --objects Entitlement,Contact,Account --org <alias>
cci task run load_sample_data --org <alias>                                           # the base regression records
cci task run load_dataset --mapping datasets/features/features.mapping.yml --sql-path datasets/features/features.dataset.sql --org <alias>
cci task run load_dataset --mapping datasets/features_dates/features_dates.mapping.yml --sql-path datasets/features_dates/features_dates.dataset.sql --org <alias>
```
A whole org: `cci flow run regression_dev_slds1` (also `regression_dev_light`, `regression_dev_dark`). **Verify state read-only before running specs:** 14 Feature accounts (3 + 11 dates), 8 `Regression %` accounts,
5 `Regression %` contacts, 4 `Feature Contact %` contacts linked to the Feature accounts, a date record equal to the org's `TODAY`, the newest CMDT (e.g. `RF19`/`RF20`) present.

## Run the specs (from `regression/playwright`, FOREGROUND, headed on purpose)
| Spec | What | Useful env vars | Time |
|---|---|---|---|
| `features.spec.ts` | indicators: label / icon / position / colour / popover for 3 styles; `OBJECT=Contact` runs the Contact page | `REGRESSION_ORG`, `ONLY_RECORDS=FEAT-01`, `ONLY_STYLES`, `ONLY_BUNDLES=RF14`, `NO_HOVER=1` | ~2-3.5 min per Account record; all 4 Contacts ~3 min |
| `features.cards.spec.ts` | card + Key colour variables (RF19) | `ONLY_RECORDS` | ~2 min |
| `features.dates.spec.ts` | RF18 date operators; expectations computed at run time | `ONLY_RECORDS=FDATE-01,...`, `ONLY_STYLES=badge,avatar,pill`, `ONLY_ITEMS` | ~4 min per half; run **two halves** (FDATE-01..06, FDATE-07..11) |
| `features.pixels.spec.ts` | **pixel baselines** (14 colour/layout shots per theme; baselines in gitignored `output/baselines/<env>-<theme>/`) | first run / refresh: `--update-snapshots=all`; compare: run normally; `REGRESSION_THEME=<other>` compares against another theme (proves it can fail) | ~2.5 min |
| `features.actions.spec.ts` | CLICKS: URL popup (yahoo stubbed), Confirm Required, false-state action, Flow Modal | `ACTIONS=1` (opt-in; skipped otherwise), `ONLY_ITEMS` | ~2 min |

Example: `ONLY_RECORDS=FEAT-01 REGRESSION_ORG=Salesforce-Indicators__regression_dev_slds2 npx playwright test features.spec.ts --reporter=line --timeout=270000 > <scratchpad>/slds2_f1.log 2>&1`.
- **Keep a command under ~9 minutes.** Split long runs (records, halves). **Never background a headed run** (it stalls with no output).
- **Several orgs can run at once in one command:** `for o in slds1 slds2 slds2-dark; do ( ... > log$o ) & done; wait`. Different orgs are independent; do not run two specs against the SAME org at once.
- Log to a scratch directory, not the project. Delete any probe specs/screenshots you create.
- Outputs (gitignored): `regression/playwright/output/<env>-<theme>/features/{features,cards,dates,actions}_report.csv`, `shots/` (bundle shots), `shots/popovers/`, `shots/cards/`, `shots/actions/`.
  Reports **merge by key**, so a filtered or split run only touches its own rows.

## Read the result
Per run the log prints one line per bundle (`PASS|DIFF|REVIEW|ERROR`) and a tally. `PASS` = matches the oracle; `DIFF` = differs on a `spec` row; `REVIEW` = differs on an `unconfirmed` row (a question to answer);
`ERROR` = the spec could not read it. **Check the log shows `>> <record>: opening record` for every record you meant to test** (a run that visits nothing now fails loudly, but verify anyway), and look at screenshots.
Full pass today: per theme features 312 + Contact 81, cards 18, dates 495, actions 11 (see `STATE.md`).

## Dates run on the org's clock
`features.dates.spec.ts` asks the org what `TODAY` is (SOQL) and computes expectations from each record's real date with its own calculator. If **no** date record equals `TODAY` the dataset is stale: it skips with instructions
(reload `features_dates` after deleting the old `Feature Date %` accounts, otherwise reports see duplicates). The org user's time zone can be a day behind the machine near midnight; the spec uses the org's date, so it is correct.
