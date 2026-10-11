---
name: regression-scenario-author
description: Authors or updates a durable regression scenario in catalog/<area>.yaml — interviews for area, risk, expect line, and automation classification, then writes the entry with correct provenance stamps. Use this whenever a feature PR changes behavior and needs a regression scenario added, when existing test coverage for the core (pre-existing) functionality needs filling in, when a scenario needs its automation classification or expect line revised, or when the user asks to add/update/retire a regression catalog entry. This is the WRITE side of the regression catalog — it never renders the human-facing checklist (that's regression-checklist-from-catalog) and never opens an org or writes Playwright code (that's documentation-capture-from-steps, once a diffable/functional-only scenario is ready to be automated).
---

# Author a regression scenario

Writes and updates `catalog/<area>.yaml` entries. Read `catalog/README.md` and
`catalog/schema/scenario-schema.md` before starting if you haven't already loaded them this
session — this skill assumes that schema and doesn't repeat its field reference here.

```
behavior change or coverage gap ──▶ [this skill] ──▶ catalog/<area>.yaml
                                                              │
                                                              ▼
                                          regression-checklist-from-catalog (reads it)
                                          documentation-capture-from-steps (automates diffable/
                                                                             functional-only entries)
```

## When this runs

- **A feature PR changes behavior.** The catalog update belongs in the *same PR* as the code
  change (see `catalog/README.md`) — this is the tool that PR uses to write it.
- **A coverage gap is found in core, pre-existing functionality.** The catalog was seeded by
  transcribing a single sprint's diff-driven checklist, so it's biased toward whatever that
  branch happened to touch — plain, unconfigured-bundle behavior and other long-standing
  functionality are underrepresented. Filling that in is exactly what this skill is for, and it
  doesn't need a branch/PR to justify it — `added_reason` can simply say why the gap was
  noticed.
- **An existing scenario needs revision** — its `automation` classification was wrong, its
  `expect` line no longer matches actual behavior, or it should be retired.

## Interview

Don't guess at any of these — ask:

1. **Area.** Does this belong in an existing `catalog/<area>.yaml`, or does it need a
   new area file? A new area needs the full front matter (`area`, `area_title`, `area_risk`,
   `area_summary`, `paths`) — write that once, not per scenario.
2. **`paths`** (new area only). What repo paths, if changed, should pull this area into a
   diff-scoped sprint pass? Coarse is fine (a whole LWC directory, a whole CMDT object folder) —
   this is a heuristic for selection, not a precise dependency graph.
3. **Risk.** `high` / `medium` / `low` — does it need to override the area default?
4. **Action / target / wait_for / expect.** Business language, no selectors — same rule
   `documentation-steps-from-recording` follows. `expect` is what a human confirms and what an
   automated assertion (if any) will be built from later.
5. **Automation classification** — the one judgment call that most affects downstream cost, so
   walk through it explicitly rather than defaulting:
   - Does this require real hardware, human judgment of prose/quality, or auditing existing
     production data that a capture org can't reproduce? → `manual-only`, and write a specific
     `manual_only_reason` (not "hard to automate" — say *what* makes it impossible to script).
   - Is it scriptable but inherently stateful/flaky pixel-wise (mid-flow modal state, async
     spinner timing, anything whose *correct* rendering legitimately varies run to run)? →
     `functional-only`.
   - Otherwise, if it's automatable and a human would recognize "this looks right" at a glance →
     `diffable`.
   - Don't default to `manual-only` just because automating it isn't built yet — that field
     describes whether it's *possible* to script, not whether a Playwright spec exists for it
     today. An area with no automation built yet still gets scenarios classified as if a future
     capture session will pick them up per the recording → storyboard → hand-built-spec workflow
     documentation-capture-from-steps uses.
6. **Fixture.** Does this scenario need the deterministic `dev-dataset` fixture (the fixed
   Account "Salesforce" / Contact "Astro Nomical" pair under `datasets/dev/`, auto-loaded by
   `dev_org` or loadable on demand with `cci task run load_sample_data --dataset dev`), or does
   it not depend on fixed data (a pure Setup/metadata check, `fixture: null`)? If the scenario
   needs a fixed record this dataset doesn't cover yet (a second Account, a Lead, a date field
   set to a specific value), say so — growing `datasets/dev` is the user's own call, not
   something to route around with an unpinned/ad hoc record.
7. **Provenance.** `added` = today; `added_reason` = the branch/PR/investigation that motivated
   it, in enough detail that someone reading it in a year understands why it exists without
   needing to find the PR; `added_ref` = the PR link/issue ID if one exists, else `null`.

## Writing the entry

- **Slugs are permanent.** Once a scenario has a shot or a baseline, its slug is load-bearing —
  never rename one; if a scenario is meaningfully replaced, mark the old one
  `status: superseded`, `superseded_by: <new-slug>`, and add the new entry instead of reusing or
  renaming the old slug.
- **Never delete a scenario.** Retire it (`status: retired`) so the catalog's history of what
  used to matter stays legible — a full seasonal pass and a diff-scoped pass both already skip
  anything not `active`.
- **Don't touch scenarios you weren't asked about.** Adding one new scenario to an area file
  should not reflow, re-word, or re-classify its siblings — that's how a small PR turns into an
  unreviewable diff.
- Validate the file parses as YAML before finishing (a malformed area file breaks both the
  checklist generator and the diff-scoped selection for every scenario in it, not just the new
  one).

## What this skill does not do

- It does not render the checklist artifact — that's `regression-checklist-from-catalog`.
- It does not open a Salesforce org or write Playwright/locator code — once a `diffable` or
  `functional-only` scenario is ready to be automated, that's a `documentation-capture-from-steps`
  run (record a real walkthrough of the scenario first, per that skill's own process).
