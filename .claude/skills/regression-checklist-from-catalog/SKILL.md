---
name: regression-checklist-from-catalog
description: Generates the human-facing regression checklist artifact (an HTML page volunteers work through by hand) from the durable scenario catalog under catalog/, either for a full seasonal pass or scoped to a branch/PR diff. Use this whenever someone needs a regression test plan for a sprint, a release, or "did this branch break anything" review, or asks to regenerate/update the sprint regression checklist. This is the READ side of the regression catalog — it never writes to catalog/*.yaml (that's regression-scenario-author's job) and never opens a Salesforce org or writes Playwright code (that's documentation-capture-from-steps). Do NOT use this to add or edit a scenario.
arguments:
  - name: mode
    description: "--seasonal for every active scenario across the whole catalog, or --diff <base>..<compare> for a sprint scoped to a branch/PR"
---

# Checklist from the catalog

Turns the regression scenario catalog (`catalog/*.yaml`, see
`catalog/README.md` and `catalog/schema/scenario-schema.md`) into the HTML checklist
artifact volunteers actually work through — the generator that replaces hand-authoring one
from scratch every sprint.

```
catalog/*.yaml ──▶ [this skill] ──▶ published checklist artifact
catalog/before-you-start.yaml ──┘
```

Read `catalog/README.md` and `catalog/schema/scenario-schema.md` before starting if you
haven't already loaded them this session.

## 1. Select scenarios

- **`--seasonal`**: every scenario with `status: active` across every `catalog/*.yaml`
  file. No git diff involved — this is the "did a Salesforce platform release break anything"
  pass.
- **`--diff <base>..<compare>`**: run `git diff --name-only <base>...<compare>` and:
  1. For each area file, include it if any changed path falls under that area's `paths:` list.
  2. Also include any `active` scenario anywhere whose `added_reason` or `added_ref` names this
     branch/PR (newly authored this sprint, even if its area's `paths:` don't literally overlap
     the diff — e.g. a brand-new area file).
  3. Within an included area, include every `active` scenario in it (not just the ones that
     triggered inclusion) — a volunteer testing "Badge & Pill styles" should see the whole area,
     not a partial list that looks incomplete.
- Never include `superseded` or `retired` scenarios in either mode.
- If a mode's selection comes up empty (e.g. `--diff` against a branch that touched nothing any
  area's `paths:` cover and added no new scenarios), say so and ask whether to fall back to
  `--seasonal` or a specific area — don't silently emit an empty checklist.

## 2. Render

Use `references/checklist-template.html` as the scaffold — its CSS and persistence script are
final; only fill in the placeholders it documents inline. Do not redesign the layout or
reinvent the CSS each run; the point of extracting the template was so this doesn't happen.

- **Voice**: `action`/`expect` text in the catalog is already written in neutral imperative
  ("Set the value to...", "Confirm..."), which reads as addressed to the reader — don't add
  "you should" or "a volunteer should" anywhere in generated copy, including the kicker/lede/
  callout text you write for this specific run.
- **`{{KICKER}}` / `{{H1}}` / `{{LEDE}}` / `{{META_CHIPS}}`**: describe the actual run — for
  `--diff`, name the base/compare refs and a one-line summary of what changed (files/areas
  touched); for `--seasonal`, name the Salesforce release or date driving the pass.
- **Before you start**: fill `{{CI_FACT}}` verbatim from `catalog/before-you-start.yaml`, and
  fill `{{MANUAL_SETUP_ITEMS}}` from its `sprint_manual_setup_steps` for a `--diff` run or
  `seasonal_manual_setup_steps` for a `--seasonal` run — these differ on purpose (`dev_org`
  against the branch under test vs. `config_demo` against `main`'s released package; see that
  file's header comment). Don't paraphrase the CI fact, since it's making a precise claim about
  what `ci_feature` does and doesn't cover.
- **Per area**: `{{AREA_SUBTITLE}}` is a short one-line restatement of `area_summary` (or write
  one if `area_summary` is long) — it's the small gray line under the heading, not the full
  context paragraph. Omit the `<p class="context">` block entirely when `area_summary` is
  absent, and omit the `<div class="setup-box">` entirely when `area_setup` is absent — don't
  render empty boxes.
- **Per scenario**: only render `{{MANUAL_TAG}}` when `automation: manual-only` — it surfaces
  `manual_only_reason` right in the checklist so a volunteer immediately understands why a check
  can't just be left to CI once automation exists for the rest of the area. Scenarios with
  `automation: functional-only` or `diffable` get no tag; the checklist doesn't need to
  distinguish those two for a human reader.
- **Risk badge**: use the scenario's own `risk` when set, otherwise the area's `area_risk`; if
  an area's scenarios disagree, use the highest risk present so the badge never undersells it.
- **`{{CLOSING_NOTE}}`**: from `catalog/before-you-start.yaml`, plus a line naming which
  areas in *this specific run* are most likely to surprise someone (e.g. carry forward
  `priority-order` and `touch-interaction` when they're in the selection, the way the original
  artifact called those two out) — write this part fresh per run, don't hardcode it in the
  template.

## 3. Publish

Publish as an Artifact (load the `artifact-design` skill first, per the standard artifact
workflow) unless the user asks for a plain file instead. If updating a previous run's artifact
rather than creating a new one, use its existing URL so the link doesn't change.

## What this skill does not do

- It does not decide what belongs in the catalog — a scenario missing from a diff-scoped run
  because its area's `paths:` don't cover the actual change is a catalog-authoring gap, not
  something to patch around here. Flag it and suggest `regression-scenario-author`, don't
  invent a scenario inline.
- It does not run anything — the checklist is for a human to work through by hand, alongside
  whatever `automation: diffable`/`functional-only` scenarios Playwright already covers in CI.
