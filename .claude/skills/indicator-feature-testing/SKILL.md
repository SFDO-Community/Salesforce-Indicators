---
name: indicator-feature-testing
description: Use when working on the Salesforce Indicators (namespace inds) regression and feature-test suite in this repo's regression/ folder - adding or changing dev-only feature bundles (Badge/Pill, hover popover, actions, relative dates, card icon colours, Contact and mappedField), running the Playwright specs or CumulusCI flows against scratch orgs, check-only validation-rule tests, triaging a DIFF, writing a finding, or staging commits for the maintainer. Read it BEFORE touching any org. Not for building indicators for a customer (use design-salesforce-indicator) and not for the older v0.4-vs-v0.5 screenshot comparison (use regression-indicator-capture).
---

# Indicator feature testing

Tests the **new features of the next release** of Salesforce Indicators against the spec, with a Playwright + CumulusCI suite under `regression/`. The suite is
driven by hand-editable planning tables; scripts turn them into Custom Metadata, an oracle of expected results, dev-only record pages and datasets; specs compare what
a scratch org actually renders with the oracle. It has already found real product bugs (see `regression/findings/`).

**Start here, every time:** read `regression/STATE.md` (current status, orgs), `regression/TODO.md` (the one list of open work), then `git log --oneline -8` and `git status --short`. If they disagree with
anything you remember or any memory file, **the repo wins**. This skill is the *method*; status lives in `STATE.md`, never here.

## Non-negotiables (shared scratch orgs, shared repo)
1. **Always pass `--org <alias>`** to `cci` / `sf` / the specs (`REGRESSION_ORG=<alias>`). A default org is unreliable: it has already pointed commands at the wrong org.
2. **Ask before you touch an org** - deploy, data change, delete, or running specs - and say which org(s) and whether it changes data. Two people share these orgs; a collision already
   happened. Read-only queries to verify state are fine. Check-only (`--dry-run`) deploys need an explicit OK (it was given once for the validation-rule work, not as a standing permission).
3. **The maintainer commits; you only stage.** Never `git commit` / `push`. Stage by explicit path, verify, and offer a commit message. See `references/commits-and-staging.md`.
4. **Never stage** volunteer material (`temporary-resources/`, `unpackaged/regression/`, `datasets/regression2/`), the documentation-video
   work (`capture/`, `recordings/`, `videos/`, `.tours/`, `docs/conventions.md`, `.gitattributes`) and the scenario catalog (`catalog/`) - those are separate efforts
   (see `CLAUDE.md`) - the maintainer's own pending edits (`.gitignore`, `package*.json`), and **never**
   `temporary-resources/TestPlan.md` / `Test Plan.docx` (live password-share links). Media (mp4/wav/png recordings) is never committed.
5. **Product code (`force-app`) changes only when asked**, in this repo only, with a failing unit test first; the maintainer replays them on `feature/staging-claude`.
6. **Evidence over assertion.** Prove a claim with a query, probe or screenshot; say "inferred" when it is. When a theory is disproved, say so and fix every place it was written.
   A pass that visited no records is not a pass.
7. **Interview before building** when design decisions are open (<=4 focused questions); show planning rows / designs before generating CMDT or deploying.

## Pick the task, read the reference
| You want to... | Read |
|---|---|
| understand what is being tested and why it is built this way | `references/architecture-and-decisions.md` |
| add or change a feature bundle, item, extension, record, page or dataset | `references/add-a-feature-test.md` |
| deploy, reload data and run the specs (commands, env vars, time budgets) | `references/running-the-suite.md` |
| plan or repeat a whole pass (seasonal or sprint), including graduation at release | `references/release-cycle.md` |
| understand a DIFF/ERROR, find the root cause, write it up | `references/triage-and-findings.md` (+ `assets/finding-template.md`) |
| test or change Custom Metadata validation rules | `references/validation-rules.md` |
| stage commits, group them, handle the README hunk | `references/commits-and-staging.md` |
| avoid time sinks already paid for once | `references/pitfalls.md` |
| hand the work to a new session or another tool | `assets/new-session-prompt.md` |

## Definition of done for a change
- Source tables edited (not just generated files); build chain re-run; oracle regenerated; **every previously-passing oracle row is unchanged** unless you meant to change it.
- New records pass **both** the validation rules in the org and the corrected ones (`scan_records_against_rules.py`).
- Specs run on **all three themes** (SLDS1, SLDS2, SLDS2-dark) with the records verified as visited; screenshots looked at, not only counts.
- A finding written for anything that is a product defect; `regression/STATE.md` updated; README section current.
- Staged (not committed) with the verification scan, and a commit message offered.

## Keep this honest
Update `regression/STATE.md` at each commit. Put durable method here, current status there, evidence in `regression/findings/`. Prefer rewriting a stale paragraph to appending a new one.
