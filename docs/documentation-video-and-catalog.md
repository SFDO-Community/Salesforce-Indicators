# Documentation videos and the scenario catalog

Status: **untested description, written 2026-10-11 from reading the files** (the tour, `docs/conventions.md`, the catalog and its schema). Nothing here has been run by the author. Correct it when you run the pipeline.
These are separate from the feature-test suite (`regression/`, see `regression/STATE.md`).

## Documentation-video pipeline
recording -> `recordings/<area>/<name>/steps.yaml` -> screenshots via `capture/` (Playwright, shared `capture/salesforce/locators.ts`) -> `videos/<name>/` (HyperFrames) -> mp4.
- Rules: `docs/conventions.md` (naming by slug, narration lives in `steps.yaml`, `unclear:` is a gate, selectors only in `locators.ts`, pinned capture environment).
- Skills: `documentation-steps-from-recording`, `documentation-capture-from-steps`, `documentation-video-from-capture`. Walkthrough with known drift: `.tours/documentation-video-pipeline.tour`.
- Capture environment is pinned (1440x900, light theme, training user). The feature suite deliberately runs three themes, so the two do not share a Playwright config.
- Session login: `sf org open --target-org <alias> --url-only` (never a scripted login); never commit `storageState`, browser profiles or traces. The feature suite follows the same rule (`regression/playwright/lib.ts`).
- Media (recordings, voice clips, renders, screenshots) is **not committed**; storage strategy undecided. `.gitattributes` currently routes every `*.png/*.wav/*.mp4` to Git LFS, which would also affect the two PNGs already tracked (`docs/resources/date-diagram.png`, `images/badge.png`); do not commit it yet.

## Scenario catalog (`regression/catalog/`, `regression/schema/scenario-schema.md`)
A sketch, from the August 2026 sprint, of planning regression coverage in the same shape as `steps.yaml` (a superset of it), so one capture could serve regression checks and training material. Skills: `regression-scenario-author`, `regression-checklist-from-catalog`. The `regression/README.md` catalog section describes the intended use.
What the files contain (checked 2026-10-11): 14 area files, 55 scenarios, all `active` and all added for "original sprint regression plan (feature/staging-claude vs main)"; 23 `diffable`, 28 `functional-only`, 4 `manual-only`.
Open problems found:
- **48 of 55 scenarios assume a `dev-dataset` fixture** (Account "Salesforce", Contact "Astro Nomical", under `datasets/dev/`). Those records do exist, in `datasets/default/default.dataset.sql` (Account-1, and a Contact stored as separate `Astro` / `Nomical` columns; both described as "our primary automation/regression testing record"). This works, not by a `datasets/dev/` folder (it does not exist) but by CCI's rule: a scratch org loads the dataset named by the task option, else the folder matching the org config name (`dev` -> `datasets/dev/`, `regression` -> `datasets/regression/`), else `datasets/default/`. So the `dev` org (`orgs/dev.json`) falls back to `default`. The schema's mention of `datasets/dev/` and `dev.dataset.sql` is therefore inaccurate, and the label would silently change meaning if someone added `datasets/dev/`; consider renaming the fixture `default-dataset`. In practice only 2 scenarios name the records in their text.
- Per-area capture specs were never reached; the work moved to the feature-test suite (maintainer, 2026-10-11).
- The README's `npm run test:capture` and per-area `capture/<area>.spec.ts` do not exist yet; `capture/` holds only the one `steps.yaml`-driven spec.
- Its areas overlap what the feature suite now tests (badge/pill, dates, hover popover, flow modal, merge tokens, priority order, key modal). The feature suite is automated with an oracle; the catalog is a checklist. Decide whether the catalog becomes the human-readable plan the suite implements, stays a training-capture plan, or is retired.
- Areas the feature suite does not cover and the catalog lists: touch interaction, Configuration Manager, Experience Cloud / Flow component, extension operator labels (manual).
