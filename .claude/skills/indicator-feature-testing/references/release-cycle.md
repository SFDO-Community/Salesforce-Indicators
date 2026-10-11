# The release cycle: repeating the whole process

This is the end-to-end procedure for one pass of the suite: a **seasonal pass** (a Salesforce platform release, or a package release: run everything) or a **sprint pass** (only what a branch touched).
It ties together the other references. Roles: **M** = the maintainer (builds/deletes orgs, deploys, commits), **A** = the assistant (reads, runs specs/tools after being asked, stages, documents). Every step that touches an
org is asked about first and passes `--org <alias>` (SKILL.md, non-negotiables). Scratch orgs live 5 days (`orgs/regression.json`), so plan a pass inside a working week.

> **Status of this document:** written from one real cycle (v0.5 development) plus a second end-to-end run of the flow (the SLDS2 org was re-spun and passed everything). The **graduation step (8) has not been exercised yet**;
> expect to adjust it at the v0.5 release.

## Seasonal or sprint?
| | Seasonal pass | Sprint pass |
|---|---|---|
| When | after a Salesforce release, or before a package release | after a feature branch changes behaviour |
| Scope | both phases, all themes, all bundles | the specs/bundles for the areas the diff touches (`ONLY_BUNDLES`, `ONLY_RECORDS`) + new rows for new behaviour |
| Orgs | 3 prod + 3 dev | 3 dev (prod is frozen; reuse the last cycle's prod captures) |

## Steps
| # | Step | Who | How / done when |
|---|---|---|---|
| 1 | **Prepare the repo.** Branch is current with `feature/staging-claude`; `git status` is clean apart from the maintainer's own files; unit tests green (`npx sfdx-lwc-jest -- force-app`); read `regression/STATE.md`. | M+A | `STATE.md` matches `git log` |
| 2 | **Check the shipped config against the rules.** | A (asks) | `scan_records_against_rules.py --org <alias> --rules <dir> --sets sample_AccountContact,sample_Lead,training_Indicators,regression_base,regression_dev_only`; every set clean, or the failures are in `TODO.md` |
| 3 | **Build the orgs.** Dev: the flows `regression_dev_slds1`, `regression_dev_light`, `regression_dev_dark`. Prod (seasonal only): `regression_prod_slds1`, `regression_prod`, `regression_prod_dark`. Confirm the exact invocation in `cumulusci.yml`/the maintainer's notes. Verify each theme visually (SLDS1 vs SLDS2 vs dark) before trusting an alias. | M | orgs exist; aliases follow `Salesforce-Indicators__regression_<env>_<theme>` |
| 4 | **Audit every dev org (read-only).** | A | `python regression/scripts/org_audit.py` -> all `READY`; "info" lines tell you which build each org came from |
| 5 | **Phase 1, regression (prod v0.4 -> dev).** *Before* re-running, back up the last results: `compare_captures.py backup --to <dir outside the repo>`. Then `capture.spec.ts` and `keys.spec.ts` on each org (see `regression-indicator-capture` skill and the README top sections), one org per browser, orgs in parallel. Then `compare_captures.py compare --before <dir>` (scoring AND pixels) and `build_comparison_viewer.py`. | A (asks) | scoring unchanged unless intended; every pixel/size change explained (e.g. platform help-icon shade, removed records) |
| 6 | **Phase 2, features.** Run the specs per org as in `running-the-suite.md`: `features.spec.ts` (Account x3 records, then `OBJECT=Contact`), `features.cards.spec.ts`, `features.dates.spec.ts` (two halves), `features.actions.spec.ts` (`ACTIONS=1`), `features.pixels.spec.ts` (compare; `--update-snapshots=all` only to re-baseline on a known-good org). Validation: `run_validation_tests.py` (current rules, then `--rules` candidates). | A (asks) | every spec passes on all three themes and each log shows its records visited |
| 7 | **Triage and fix loop.** For each DIFF/ERROR: `triage-and-findings.md`. Product bug -> unit test first -> fix only when asked -> M deploys -> A re-runs the affected specs on all three themes -> finding written. New behaviour questions -> `unconfirmed` rows -> `v0.5.1-recommendations.md` / `TODO.md`. | A+M | no open DIFF without a finding or a documented decision |
| 8 | **Graduate at release.** At a package release the feature suite stops being "dev-only" and becomes a **regression** for the next cycle: prod (the newly released version) vs dev (the next build). See below. | M+A | the next cycle can run the feature specs on both environments |
| 9 | **Close out.** Update `regression/STATE.md` (results table, findings, open items); stage commits for the maintainer (`commits-and-staging.md`); archive the run's output (it is gitignored: keep a copy of `output/` reports and the comparison viewer with the release notes); list anything undecided in `TODO.md`. | A+M | maintainer has committed; STATE matches reality |
| 10 | **Hand off.** If a new session or another tool picks it up: `assets/new-session-prompt.md`. | A | the cold-read answers match the key |

## Graduation (step 8), concretely
The feature suite was built as **dev-only**: its records use fields and `{!Field}` syntax the released v0.4 package lacks, and the specs refuse to run unless the org alias contains `dev`. Once v0.5 is the released package:
1. **Make the feature records deployable to prod.** They are already CumulusCI-token style (`%%%NAMESPACE%%%`), so they resolve to `inds__` in a packaged org. Add them to the prod flows (`regression_prod*`) next to `regression/customMetadata`, and retire `regression/prod_only` (those records describe v0.4-only behaviour; keep them only if you still need a v0.4 reference).
2. **Let the feature specs run against prod.** Remove the "dev-only" guards in `features*.spec.ts` / `lib.ts` (`inferEnv`), and make record/Setup-page lookups namespace-aware (the regression specs already do this for `inds__Indicators_Setup`).
3. **Rebuild the oracle per environment** the way phase 1 did (`expected.csv` for prod, `expected.dev.csv` for dev), tagging rows `known-issue` where the next build intentionally changes behaviour.
4. **Move `env=dev-only` rows to `both`** in `planning/features/*.csv`; regenerate; confirm every previously passing oracle row is unchanged.
5. **Re-baseline the pixel shots** on the new prod and dev orgs (they are per release and per machine).
6. Record it in `STATE.md`, and update this section with whatever turned out different.

## Timings measured in the v0.5 cycle (3 orgs in parallel, one browser per org)
Phase 1: capture ~5.5 min, keys ~2 min. Phase 2: features ~3 min per Account record (+ Contact ~3), cards ~2, dates ~8 in two halves, actions ~2, pixels ~2.5 (first write ~4.7). A full phase-2 pass is roughly 35-40 minutes of wall-clock when orgs run in parallel; keep each command under ~9 minutes.

## Orchestration
Today each spec is launched by hand with the patterns in `running-the-suite.md`. A thin runner that launches the specs for several orgs in parallel, enforces the time budgets, checks that every record was visited, and prints one summary table is the natural next tool; it must keep the "ask before touching an org" rule (an explicit `--yes`). Not built yet.
