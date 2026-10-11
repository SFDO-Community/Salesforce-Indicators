# Regression scenario catalog

This is the durable, growing source of truth for "does Salesforce Indicators still behave
correctly" — one YAML file per functional area under `catalog/`, each holding a list of
scenarios in the shape documented in `catalog/schema/scenario-schema.md`.

It exists because two different pressures both need the same underlying content:

- **Salesforce ships three platform releases a year.** Existing, unchanged functionality can
  break with zero code changes on our side. The catalog needs to be run in full periodically
  (a "seasonal pass") independent of any git diff.
- **Feature work changes specific areas.** A sprint only needs to re-verify what it touched,
  plus whatever new behavior it introduced — not the whole catalog from scratch.

The catalog serves both: a seasonal pass runs every `active` scenario across every file; a
sprint pass selects scenarios whose area `paths:` intersect the branch's changed files, plus
any scenario whose `added_reason`/`added_ref` names that branch/PR.

### How scenarios grow

A feature branch that changes behavior updates the relevant `catalog/<area>.yaml` file(s) —
adding new scenarios or editing existing ones — **in the same PR** as the code change, stamped
with `added`/`added_reason`/`added_ref`. A scenario that changes again later is found via the
same path-mapping the diff-scoped pass already uses; nothing here requires a separate periodic
"is this still relevant" chore. A scenario is never deleted — retire it (`status: retired`) so
the history of what used to matter stays legible.

### How the catalog gets used

- **Human-facing regression checklist** (an HTML artifact, generated — see
  `regression-checklist-from-catalog`; this replaces hand-authoring one per sprint). Reads
  either the full catalog (seasonal) or a diff-scoped selection (sprint) and renders sections,
  risk badges, setup instructions, and "Expect:" lines directly from scenario data.
- **Playwright visual regression** — scenarios with `automation: diffable` get a
  `toHaveScreenshot()` baseline at `capture/shots/<slug>.png`; scenarios with
  `automation: functional-only` get a plain Playwright assertion instead.
  `automation: manual-only` scenarios are never automated at all. Run with
  `npm run test:capture` (or `npm run test:capture:update` to accept new/changed baselines) once
  an area has a `capture/<area>.spec.ts`. See `capture/` and `docs/conventions.md` for the
  capture mechanics — the same recording → storyboard → hand-built-spec workflow used for
  documentation videos is how capture specs get built per area (there is no generic runner; see
  the implementation plan this catalog was introduced under for why that was deliberately
  deferred). Capture assumes the `dev-dataset` fixture (Account "Salesforce", Contact
  "Astro Nomical" under `datasets/dev/`) is loaded — `dev_org` loads it automatically.
- **Documentation videos** — a `diffable` scenario's screenshot is the same file used as a
  documentation-video frame; capturing for regression and capturing for a training video are the
  same act, not two.

### Adding or updating a scenario

Use the `regression-scenario-author` skill, or edit the relevant `catalog/<area>.yaml` file
directly following `catalog/schema/scenario-schema.md`. Always set `added`/`added_reason` (and
`added_ref` when there's a PR) so the scenario's provenance is legible without archaeology.

### Generating the checklist

Use the `regression-checklist-from-catalog` skill — `--seasonal` for a full-catalog pass, or
`--diff <base>..<compare>` for a sprint-scoped pass.
