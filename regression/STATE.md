# Feature-testing state

Current status of the v0.5 feature-test work. **Update this file at every commit.** It holds status only; the method is in `.claude/skills/indicator-feature-testing/`,
evidence in `regression/findings/`, and the long-form description of the suite in `regression/README.md` ("Feature tests (`dev_only`)").

**Last updated:** 2026-10-11 &nbsp;|&nbsp; **Branch:** `feature/regression-vs-staging-claude` &nbsp;|&nbsp; **Latest commits:** `277eaca` (default dataset), `759e96d` (documentation-video pipeline), `5258a0a` (design/maintain skills), `3119abc` (tokenize CLI wrapper),
`97f89ae` (catalog moved to `catalog/`), `ffc97f2` (this skill, STATE, TODO), `0d167cd` (pixel baselines + audit/compare tools), `9e6b514` (card/Key + Contact tests), `e354f1f` (applyColorVars fix), `0eed89f` (validation rules + tooling).

## Scratch orgs (ephemeral; always pass `--org <alias>`)
| Alias | Theme | Expires |
|---|---|---|
| `Salesforce-Indicators__regression_dev_slds1` | SLDS1 | 2026-10-13 |
| `Salesforce-Indicators__regression_dev_slds2` | SLDS2 light | 2026-10-15 |
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
| Phase 1 recapture (`capture.spec.ts` + `keys.spec.ts`) on the current dev orgs vs the 2026-10-05 run | identical scoring on all three: 102 PASS / 14 KNOWN / 0 DIFF; 116 regression bundle shots per theme pixel-identical; Key shots differ only trivially (platform help-icon shade, inferred; 3 SLDS2 Keys shorter because the prod-only extensions are gone) |
| `org_audit.py` (read-only) | all three orgs READY; only SLDS2 was built from the current flow (corrected rules, 0 prod-only extensions) and it passed everything, so the flow is proven end to end |
Unit tests: `npx sfdx-lwc-jest -- force-app` 31 / 31.

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

## Not covered yet
Non-admin user (the product skips indicators and Key columns without field access); touch/mobile; the Key and Configuration Manager with the new fields and styles; Dynamic Forms title in wide columns and the refresh/footer
properties beyond what `RF19`/`RF20` touch; custom Number/Text fields with extensions (the type rules now exist but only Date was exercised on a custom field); the Flow Modal's Finish path (closes the modal and refreshes the record; the test flow changes no data).

## Maintainer-owned pending edits (do not stage on their behalf)
`.gitignore`, `package.json`, `package-lock.json` (the maintainer edits these; stage only when asked).
