# Feature-testing state

Current status of the v0.5 feature-test work. **Update this file at every commit.** It holds status only; the method is in `.claude/skills/indicator-feature-testing/`,
evidence in `regression/findings/`, and the long-form description of the suite in `regression/README.md` ("Feature tests (`dev_only`)").

**Last updated:** 2026-10-26 &nbsp;|&nbsp; **Branch:** `feature/regression-vs-staging-claude` &nbsp;|&nbsp; **Latest commits:** `277eaca` (default dataset), `759e96d` (documentation-video pipeline), `5258a0a` (design/maintain skills), `3119abc` (tokenize CLI wrapper),
`97f89ae` (catalog moved to `catalog/`), `ffc97f2` (this skill, STATE, TODO), `0d167cd` (pixel baselines + audit/compare tools), `9e6b514` (card/Key + Contact tests), `e354f1f` (applyColorVars fix), `0eed89f` (validation rules + tooling).

## Scratch orgs (ephemeral; always pass `--org <alias>`)
| Alias | Theme | Expires |
|---|---|---|
| `Salesforce-Indicators__regression_dev_slds1` | SLDS1 | 2026-10-13 |
| `Salesforce-Indicators__regression_dev_slds2` | SLDS2 light (built from the current flow, with the Display Multiple / Boolean / zero fixes deployed) | 2026-10-30 |
| `Salesforce-Indicators__regression_dev_slds2-dark` | SLDS2 dark | 2026-10-13 |

Recreate with `cci flow run regression_dev_slds1` / `regression_dev_light` / `regression_dev_dark`, or refresh data per `.claude/skills/indicator-feature-testing/references/running-the-suite.md`.

## Last full verification (2026-10-10, all three themes, records verified as visited)
| Spec | Result per theme |
|---|---|
| `features.spec.ts` Account (3 records x 3 styles x 5 bundles) | 312 / 312 PASS |
| `features.spec.ts` with `OBJECT=Contact` (direct `RF20` + mapped `RF15`) | 81 / 81 PASS |
| `features.cards.spec.ts` (card + Key colours, RF19a-d + Dynamic Forms) | 18 / 18 PASS |
| `features.dates.spec.ts` (3 styles x 11 records x 15 items) | 495 / 495 PASS |
| `features.actions.spec.ts` (opt-in clicks) | 11 / 11 PASS |
| `features.pixels.spec.ts` (14 colour/layout baselines, local) | written on all three themes; re-compared 3 times, stable; proven to catch a 225-pixel change |
| Validation tests (`run_validation_tests.py`, SLDS1 org) with the corrected rules | 40 PASS, 3 documented gaps open (`I13`, `G03`, `G04`) |
| Validation tests, 2026-10-26 on `regression_dev_slds2` (check-only), after the `LOWER()` + `number`/`text` rule fix | 54 PASS, 3 gaps open (`I13`, `G03`, `G04`). New: date rule cases D01-D06, custom-field cases C01-C06 (Number, Decimal, Text, Checkbox, Date). C07-C13 (custom Currency, Percent, Picklist, Long Text, Email, Phone, URL): all pass once `longtextarea` and `richtextarea` are in `String_Missing_Contains_Text` (custom Long Text Area and Rich Text Area report those; a standard long text area is `textarea`). Also covered: custom Date/Time and Multi-Select Picklist (no rule change needed). **Formula fields report just `formula`** for both Number and Text, so no type rule can apply: documented gaps `C17`/`C18` (`UnknownConditions` still covers both-or-neither). **Last run 2026-10-26 (final, all rules redeployed): 64 PASS, 0 FAIL, 5 documented gaps** (`I13`, `G03`, `G04`, `C17`, `C18`). The rule engine does not expose `Precision`, `Length` or `IsCalculated` on `Field__r` (probed: "Field ... does not exist"), so a formula's Number-vs-Text cannot be recovered in a validation rule, although SOQL `EntityParticle` (`double`/`string`, `IsCalculated`) and `FieldDefinition` (`Formula (Number)`) both can. Different sources use different type vocabularies: never infer what a rule sees from a SOQL query, use the diagnostic package |
| Phase 1 recapture (`capture.spec.ts` + `keys.spec.ts`) on the current dev orgs vs the 2026-10-05 run | identical scoring on all three: 102 PASS / 14 KNOWN / 0 DIFF; 116 regression bundle shots per theme pixel-identical; Key shots differ only trivially (platform help-icon shade, inferred; 3 SLDS2 Keys shorter because the prod-only extensions are gone) |
| `org_audit.py` (read-only) | all three orgs READY; only SLDS2 was built from the current flow (corrected rules, 0 prod-only extensions) and it passed everything, so the flow is proven end to end |
Unit tests: `npx sfdx-lwc-jest -- force-app` all pass (new: `indicatorBundle.displayMultiple.test.js`, covering Display Multiple popovers, Boolean never as text, and `0` under both Zero Value Handling settings).

## Sprint pass 2026-10-25/26 on `regression_dev_slds2` (SLDS2 light only; SLDS1 and dark orgs expired/not rebuilt)
| Check | Result |
|---|---|
| `org_audit.py` | READY |
| Phase 1 (`capture.spec.ts`) after the final redeploy | 102 PASS / 14 KNOWN / 0 DIFF (same as the old orgs); 5 of 135 pixel diffs vs the saved run: Contact RB05c CON-01/03 (intended, a Boolean now shows its icon) and 3 Key shots (trivial shade, inferred) |
| Phase 2 on the final build (zero fix + Display Multiple popover hover text deployed) | features 393 / 393, cards 18 / 18, dates 495 / 495, actions 11 / 11, pixels spec passed; records verified as visited. `F14_07` now checks each Extension's own popover text and passes in all three styles |
| Oracle | Boolean "Use Field Value" now expects the icon on prod and dev (`build_expected.py`; 4 rows changed, none else) |
| Found by the pixel diff, not the DOM scoring | a `0` under Use Field Value blanked by a falsy check (fixed; `acc_RB05a_ACC-02`) |
Badge/Pill label for a zero (2026-10-26): `resolveBadgePillText` used a falsy check, so a raw `0` gave an empty label; fixed (null/undefined check), unit-tested (4 tests; the 2 raw-zero ones failed first), redeployed; Phase 1 capture unchanged (102/14/0) and Account feature specs pass (one avatar timeout on FEAT-03 RF15/RF16 passed on re-run). **No feature record has a zero in a Badge/Pill item, so the fix is unit-tested only** (a `FEAT-04` zero record is the proposed coverage).
Key lesson: keep both checks. The DOM scoring passed the zero bug; only the before/after pixel diff caught it.

## Tools added 2026-10-10
- `scripts/org_audit.py`: checks each org has the data and CMDT the specs expect. Run before specs.
- `scripts/compare_captures.py`: `backup` then `compare` for phase-1 outputs (scoring and pixels). Back up before re-running, because captures merge into the old folder.
- `playwright/features.pixels.spec.ts`: 14 local pixel baselines per theme.
- Runbook for repeating a pass: `.claude/skills/indicator-feature-testing/references/release-cycle.md` (graduation step not yet exercised).
- Open decisions and maintainer work: `regression/TODO.md`.

## Findings so far (details and evidence in `regression/findings/`)
1. Item-level Badge/Pill Text `{!Field}` token not resolved - fixed in this repo, unit-tested, verified.
2. `OneFieldMappingRequired` rejected every custom field picked in the Field list (`TEXT()` on a MetadataRelationship) - fixed by the maintainer.
3. `Numeric_Missing_Minimum` / `String_Missing_Contains_Text` could never fire (EntityParticle types are lowercase) - rewritten here, plus new `NoExtensionOnCheckboxField`; proven with check-only deploys.
4. `applyColorVars` wrote the text `undefined` into a CSS variable (black glyph on avatar/card/Key/pill) - fixed here, 6 unit tests, permanent guard in `features.spec.ts`.
5. `sample_Lead` (34 of 47) and `training_Indicators` (23 of 95) records fail the branch's own validation rules - needs content decisions by the volunteers/maintainers.
6. `npm run test:unit` also picks up the Playwright specs (pre-existing) - `jest.config.js` ignore patterns proposed, not applied.
Product suggestions that are not defects: `findings/v0.5.1-recommendations.md` (e.g. an empty mapped card shows nothing and no message). User-facing advice draft: `findings/blog-advice-styling-indicators.md`.

## Repository layout (after the 2026-10-11 clean-up)
- `regression/`: the feature-test suite (this file, `TODO.md`, `planning/`, `playwright/`, `scripts/`, `findings/`, `dev_only/`, `prod_only/`) and the original v0.4-vs-v0.5 comparison. Volunteer folders were deleted by the maintainer.
- `catalog/`: the scenario catalog (`README.md`, area YAMLs, `schema/`, `before-you-start.yaml`); a separate, undecided effort. See `docs/documentation-video-and-catalog.md`.
- `capture/`, `docs/conventions.md` and the three `documentation-*` skills: the documentation-video pipeline (media is gitignored, not committed).
- `scripts/py/tokenize_cmdt_namespace.py` wraps the CCI task `tasks/tokenize_cmdt_namespace.py`; `datasets/default` is the two-record sample dataset (Salesforce account, Astro Nomical contact).
- Skills committed: `indicator-feature-testing`, `design-*`, `maintain-*`, `documentation-*`, `regression-*`. `playwright-cli` is gitignored.

## Open items
The single list is `regression/TODO.md` (release blockers first). In short: decide the phase-1 known issues; replay the nine `force-app` files on `feature/staging-claude` (path-limited copy, not a cherry-pick); send the six findings; level-set the sample/training config; then graduation at release.

## Zero-value coverage added 2026-10-26 (deployed and run on the three new orgs 2026-10-27)
New record `FEAT-04` (`Feature Zero`: `NumberOfEmployees` 0, `AnnualRevenue` 0) and `AnnualRevenue` 1500 on `FEAT-01`; new RF14 Badge/Pill items `F14_10` (integer, Treat Zeroes as Numbers: label "0"), `F14_11` (integer, Treat Zeroes as Blanks: inverse label "None"), `F14_12` (currency: formatted label, `unconfirmed`). The oracle now models Zero Value Handling and currency formatting (`build_expected_features.py`): 489 -> 648 rows, 159 new, **0 existing rows changed**. `org_audit.py` now expects **15** feature accounts (4 FEAT + 11 FDATE). Effects: RF14 gets three more indicators, so the **RF14 pixel baselines must be re-baselined** (`--update-snapshots=all`) on any org that already has them; new orgs write fresh ones. Needs: dataset reload (`FEAT-04`, `AnnualRevenue`), deploy of `regression/dev_only/customMetadata` (six new records), then `features.spec.ts` on FEAT-01..04.

**Run 2026-10-27 on the three new scratch orgs** (`regression_dev_slds2-light`, `-slds2-dark`, `-slds1`; expire 2026-11-01), all with the LWC zero fixes EXCEPT the popover fallback: Phase 1 102 PASS / 14 KNOWN / 0 DIFF on each; before/after pixel diff vs the 10-10 runs shows only the 2 intended Contact RB05c Boolean shots; keys captured; features FEAT-01/02/03 15 PASS each, Contact 24, cards 24, actions 11, dates 11 + 22 PASS; RF14 `F14_10` "0", `F14_11` "None", `F14_12` "$0" correct. **FEAT-04: 12 PASS + 3 DIFF per org** (avatar/badge/pill RF17 `F15_06`: the popover-fallback zero bug, `fPopoverBody` was the number 0; fixed in the repo with 2 unit tests, 46/46, NOT yet deployed). Pixel baselines: exactly the 6 RF14 shots differed on each theme (expected, 3 new items); re-baselined and re-run stable on all three. **After the maintainer redeployed the LWC (popover fix): FEAT-04 is 15 PASS / 0 DIFF on all three orgs** (one `Target crashed` browser error on slds2-light pill RF18 passed on a re-run). Check-only validation suite on all three orgs: 64 PASS, 5 documented gaps (I13, G03, G04, C17, C18), same as the old org. `scan_records_against_rules.py` on slds2-light (regression_base 339 + regression_dev_only 127 records): 0 rejected, 0 NEW_FAIL. The old `regression_dev_slds2` org is left to expire 2026-10-30.


## Finding: type-driven validation rules missed custom fields (2026-10-26)
The Extension rules read `Indicator_Item__r.Field__r.DataType`. Standard fields report e.g. `integer`, `string`, `date`; **custom fields report different strings** (case-insensitively `number`, `text`, `longtextarea`, `richtextarea`, `formula`, `date`; in an exact-case comparison custom fields appear capitalised, e.g. `Date` proven, `Number`/`Formula` probable). SOQL `EntityParticle` shows `double`/`string`/`double` for the same fields, so what a rule sees is NOT what SOQL returns, so the rules (which compared exact lowercase standard names) silently never fired on a custom field. Proven with check-only packages: the OLD rules accepted every custom-field failing case (D01, D06, C01-C04); `LOWER()` fixed date and checkbox; adding `number` (numeric rule) and `text` (string rule) fixed the rest. Diagnostic method: a throwaway package of one rule per candidate string, each with its own message, so the failure list names the real value. Run `run_validation_tests.py` after any change to these rules; the C-cases are the guard.

## Not covered yet
Non-admin user (the product skips indicators and Key columns without field access); touch/mobile; the Key and Configuration Manager with the new fields and styles; Dynamic Forms title in wide columns and the refresh/footer
properties beyond what `RF19`/`RF20` touch; the Flow Modal's Finish path (closes the modal and refreshes the record; the test flow changes no data).

## Maintainer-owned pending edits (do not stage on their behalf)
`.gitignore`, `package.json`, `package-lock.json` (the maintainer edits these; stage only when asked).
