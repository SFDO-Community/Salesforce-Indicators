# TODO: open work for Salesforce Indicators testing

The single list of what is left to do. `STATE.md` = current status; `.claude/skills/indicator-feature-testing/` = method; `findings/` = evidence. Close an item by deleting it (history is in git).
Owner: **M** = maintainer, **A** = assistant (asks before touching orgs, stages only). Last updated 2026-10-11.

## 1. Blocks the v0.5 release
| # | Item | Owner | Done when |
|---|---|---|---|
| 1.1 | **Decide the phase-1 known issues** (v0.4 -> v0.5 behaviour). Zero ignores Static Text (RB05a, RB08, RB13c); hover-only items get a forced fallback icon (RB01, RB02c, RB03; design trade-off); missing-with-no-content leaves an empty slot (B00, confirmed, unfixed); rule with no content shows a blank avatar (C00); `Empty Static Text` is not applied to extension matches (K_ext_est_value); text rule on a wrong field type crashes the LWC (validation now prevents it; no defensive guard). Each: keep, fix in v0.5.x, or document. | M | each row in `planning/` is `known-issue` with a decision recorded |
| 1.2 | **Release-note the upgrade changes:** boolean "Use Field Value" now shows text; hover becomes a popover with generic alternative text; default fallback icon is `standard:default`; new validation rules can reject previously-saved records; fields the user cannot read are skipped; tied priority picks the first MasterLabel (v0.4 picked the last). | M | in the release notes |
| 1.3 | **Replay the product changes on `feature/staging-claude`.** Nine `force-app` files (commits a8c2d45, 0eed89f, e354f1f): `indicatorBundle.js` + test, `indicatorCssVars.js` + test, Extension rules `MatchOperatorRequiresValue`, `NoExtensionOnCheckboxField` (new), `Numeric_Missing_Minimum`, `String_Missing_Contains_Text`, Item rule `OneFieldMappingRequired`. Path-limited copy onto a branch from `feature/staging-claude`, **not** a cherry-pick (the commits also carry `regression/` files); then PR the rest of `regression/` separately. | M | unit tests green on the new branch; PR open |
| 1.4 | **Send the six findings** (`findings/`, summary in `STATE.md`); refresh any whose evidence aged. Suggestions that are not defects: `findings/v0.5.1-recommendations.md`. | M | sent |
| 1.5 | **Level-set the shipped sample and training config** (`unpackaged/config/`: `sample_AccountContact`, `sample_Lead`, `training_Indicators`; 57 records fail the new rules) and finalize before the team discusses. Verify with `scripts/scan_records_against_rules.py`. | M (A scans) | scan clean for all three sets |

## 2. Clean-up and restructure
Agreed split (2026-10-11): volunteer material (removed by M) / documentation-video pipeline / scenario catalog / feature testing.
| # | Item | Owner |
|---|---|---|
| 2.1 | **Media strategy.** Do not commit mp4/wav/png recordings. `.gitattributes` sends every `*.png/*.wav/*.mp4` to Git LFS and would also affect the two tracked PNGs (`docs/resources/date-diagram.png`, `images/badge.png`); do not commit it until a storage plan exists. Add `recordings/` and `videos/` media to `.gitignore`. Decide where media lives. | M |
| 2.2 | **Catalog role.** The catalog is isolated at top-level `catalog/` (YAML areas, `catalog/schema/`, `catalog/before-you-start.yaml`, `catalog/README.md` = the former README hunk; the two catalog skills and the `documentation-*` skills point there). Decide its role: human-readable plan for the suite, training-capture plan, or retired. Fixture label `dev-dataset` works via CCI's fallback to `datasets/default` but the schema text says `datasets/dev/`; consider `default-dataset`. Catalog areas the suite does not cover: touch, Configuration Manager, Experience Cloud, operator labels. See `docs/documentation-video-and-catalog.md`. | M (A can assist) |
| 2.3 | **Documentation-video pipeline.** Separate project (`capture/`, `recordings/`, `videos/`, `.tours/`, `docs/conventions.md`, three `documentation-*` skills); the sample video is an experiment, not for commit. Known drift is listed in the tour. | M |
| 2.4 | **Restructure `regression/` paths** (`customMetadata`, `dev_only`, `prod_only`, `flexipages`, `objects`, `data`, ...) only after the release, together with graduation: `cumulusci.yml`, the specs, scripts and skill commands all use these paths. | M + A |
| 2.5 | **Repo hygiene:** `AGENTS.md` pointer for other AI tools; `jest.config.js` ignore patterns so `npm run test:unit` skips the Playwright specs (proposed, unapplied); keep `regression/NEXT_SESSION_PROMPT.md` in sync with `assets/new-session-prompt.md` or delete it; review old test concepts for anything worth keeping. | M |
| 2.6 | **Skills and docs.** Commit the `indicator-feature-testing` skill, `STATE.md`, this file and the `CLAUDE.md` edits after the end-of-review pass. Add a README paragraph for `org_audit.py` and `compare_captures.py`. | M (A stages) |

## 3. Process
| # | Item | Owner |
|---|---|---|
| 3.1 | **Graduation at release** (`references/release-cycle.md` step 8): not yet exercised. Expect to adjust the runbook. | M + A |
| 3.2 | **Orchestration runner** to launch specs for several orgs, enforce time budgets, check records were visited and print one table; must keep the ask-before-org rule (`--yes`). Not built. | A |
| 3.3 | **Upgrade-check (read-only post-install report, CCI task).** Plain SOQL handles: hover-only items, Image without Icon, extension value without operator, malformed action targets, item with no or several field mappings, numeric rule with no min/max. Needs Apex (GROUP BY/HAVING and `Field__r.DataType` in WHERE are rejected): priority ties, text rule on a checkbox, numeric rule on a text field and vice versa, boolean "Use Field Value", items whose field the user cannot read. Likeliest to exist in customer orgs: text rule on a checkbox, numeric/text rule on the wrong field type, boolean "Use Field Value" (the v0.4 rules never caught them). Priority ties are the only silent change in what a customer sees. First agree the check list. | M decides, A builds |

## 4. Coverage backlog (not yet tested)
- Display-value formatting (dates, currency, numbers): low risk; dates can use the FDATE records; currency needs `AnnualRevenue` in the dataset (reload). Batch with the next redeploy.
- A user without field access: Advanced Field with a `defaultValue` on a field the profile cannot read.
- Key and Configuration Manager with the new fields and styles (ideas only); the Flow Modal Finish path.
- Accessibility (its own session); touch/mobile (check feasibility first: Salesforce may convert small form factors to Classic); Experience Cloud / Flow component ("Beta").
- Re-baseline the pixel shots per release and on any new machine.
