# Regression scenario schema

Field reference for `catalog/*.yaml`. See `catalog/README.md` for how the catalog
is used. This schema is a superset of the `steps.yaml` shape used by the documentation-video
pipeline (`recordings/documentation/*/steps.yaml`) — a pure how-to-video storyboard only needs
the fields already documented in `docs/conventions.md`; everything below is additional and only
required for a scenario that lives in this catalog.

## Area file front matter

One file per functional area, e.g. `catalog/date-extensions.yaml`.

| Field | Required | Meaning |
|---|---|---|
| `area` | yes | Stable kebab-case slug for the area, unique repo-wide, matches the filename. |
| `area_title` | yes | Human-readable heading shown in the generated checklist. |
| `area_risk` | yes | `high` \| `medium` \| `low` — default risk for scenarios in this area; a scenario can override it. |
| `area_summary` | no | Context paragraph explaining what changed and why this area needs testing. |
| `area_setup` | no | One-time setup instructions shared by every scenario in the area (e.g. "create an extension record against a Date field with..."). |
| `paths` | yes | List of repo paths (files or directories). Used to select this area during a diff-scoped sprint pass — a changed file under any of these paths pulls this area's `active` scenarios into that sprint's checklist. |
| `scenarios` | yes | List of scenario entries (below). |

## Scenario entry fields

| Field | Required | Meaning |
|---|---|---|
| `slug` | yes | Permanent, kebab-case, unique repo-wide. Never renamed once shot/baseline files reference it. |
| `added` | yes | ISO date the scenario was first authored. |
| `added_reason` | yes | Free text: what branch/PR/investigation introduced this scenario. |
| `added_ref` | no | PR link or issue ID, if any. |
| `status` | yes | `active` \| `superseded` \| `retired`. Never delete a scenario — retire it and keep the history legible. |
| `superseded_by` | no | Slug of the scenario that replaced this one, when `status: superseded`. |
| `risk` | no | Overrides `area_risk` for this one scenario. |
| `automation` | yes | `manual-only` \| `functional-only` \| `diffable` — see below. |
| `manual_only_reason` | conditional | Required (non-null) when `automation: manual-only`. Explains why this can never be scripted. |
| `app` | yes | Which locator/auth module resolves this scenario (currently only `salesforce`). |
| `action` | yes | Business-language description of what to do — no CSS/XPath selectors, matching how `documentation-steps-from-recording` already writes `target`. |
| `target` | yes | Business-language description of the element/field involved. |
| `wait_for` | yes | What visible state confirms the action completed. |
| `expect` | yes | The checklist's "Expect:" line. For `functional-only`/`diffable` scenarios this is also the plain-English source a capture spec's assertion is built from. |
| `shot` | yes | `true` only when `automation != manual-only` and a screenshot should be taken. |
| `fixture` | no | Which deterministic dataset this scenario assumes, or `null` if it doesn't need fixed data (e.g. a pure Setup/metadata check). Currently the only value is `dev-dataset` — the CumulusCI dataset under `datasets/dev/` (`dev.dataset.sql` + `dev.mapping.yml`), a fixed Account "Salesforce" and Contact "Astro Nomical" that `dev_org` loads automatically, or can be loaded on demand with `cci task run load_sample_data --dataset dev`. These are the "always present" test records — point scenario setup instructions at them by name rather than "the demo Account" generically. |
| `narration` | no | Reader-facing prose, same meaning as in `steps.yaml` — only needed if this scenario is ever pulled into a documentation video. |
| `narration_spoken` | no | Tightened spoken version, written back during video authoring — same convention as `steps.yaml`. |
| `conditional` | no | Same meaning as in `steps.yaml` — a step not exercised in a base recording but worth documenting. |
| `note` | no | Free-text cross-reference to another scenario/area (e.g. "see priority-order.yaml — same underlying change, different UI surface"). |

## `automation` values

- **`manual-only`** — can never be scripted (screen-reader/accessibility-inspector judgment,
  physical phone/tablet hardware, real sandbox deploys, auditing existing production data).
  Must carry `manual_only_reason`. Skipped entirely by capture tooling — no locator resolution
  is ever attempted.
- **`functional-only`** — automatable as a Playwright interaction/assertion, but deliberately
  never run through `toHaveScreenshot()` because the outcome is inherently stateful/flaky
  pixel-wise (a paused/resumed Flow modal, async spinner timing, text-content correctness that
  doesn't need a pixel baseline).
- **`diffable`** — automatable and worth a pixel baseline. Gets a slug-named shot (reusable by
  the documentation-video pipeline) and a `toHaveScreenshot()` comparison.
