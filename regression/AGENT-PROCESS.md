# How the agent runs the regression and feature tests

For maintainers and volunteers who want to know what an AI agent (Claude Code or another tool) actually does when it works on `regression/`, what it will ask you before it acts, and where a person has to decide.

This page is an explainer. The sources it summarises are canonical and win if they disagree with it: the method in `.claude/skills/indicator-feature-testing/` (start with `SKILL.md`, then `references/release-cycle.md`), the current status in `regression/STATE.md`, the open work in `regression/TODO.md`, and the rules in the "Regression and feature testing" section of `CLAUDE.md`.

## The short version

- The suite compares what the Indicators component **renders** in a scratch org against an **oracle** that states what *should* render. It tells you when a change in the package alters what users see.
- The agent runs the same steps each time (the ten-step runbook, below), reads the results, and writes down what it found with evidence. It does not decide what is a bug; a maintainer does.
- The agent asks before it touches an org, only stages files unless you ask it to commit, and changes product code (`force-app`) only when asked.

## Who does what

| | Maintainer (M) | Agent (A) |
|---|---|---|
| Orgs | builds, owns, deletes them; keeps the `cci org list` | asks, then runs specs and read-only queries with `--org <alias>` on every command |
| Git | reviews and commits; decides when to push | stages by explicit path and shows `git diff --cached`; commits or pushes only when asked in that turn |
| Product code (`force-app`) | decides what ships | changes it only when asked, with a unit test that fails without the fix first |
| Known issues | decides what counts as KNOWN (each is a recorded decision in `TODO.md` 1.1) | proposes, with evidence |
| Evidence | reads the screenshots too | proves each claim with a query, probe or screenshot; a run that visited no records is a failure |

Other standing rules (see `CLAUDE.md`): temporary files and logs go to a scratch directory, not the project; never stage `temporary-resources/TestPlan.md` or `Test Plan.docx`; leave every `.zip` under `.claude/skills/` alone.

## A pass, step by step

This is the runbook in `references/release-cycle.md`; "Who" is from that table. A sprint pass usually covers steps 1 to 7 and 9.

| # | Step | Who | What happens |
|---|---|---|---|
| 1 | Prepare the repo | M + A | Branch current with `feature/staging-claude`, clean `git status`, unit tests green (`npm run test:unit`), read `STATE.md`. |
| 2 | Check shipped config against the rules | A (asks) | `scan_records_against_rules.py` runs the record sets as check-only deploys (validated, rolled back, nothing saved). |
| 3 | Build the orgs | M | CCI flows (`regression_dev_*`; prod orgs only for a seasonal pass). |
| 4 | Audit each org | A | `org_audit.py`, read-only. Checks record counts, a date record equal to the org's today, the newest metadata and which rules are present. `READY` means the specs will find the data they expect. |
| 5 | Phase 1: regression | A (asks) | **Back up first** (`compare_captures.py backup`, to a folder outside the repo), because the capture specs merge into the existing output folder and would overwrite your reference. Then `capture.spec.ts` and `keys.spec.ts`, then `compare_captures.py compare`. |
| 6 | Phase 2: features | A (asks) | The `features*.spec.ts` specs, one per feature area (indicators, cards and Key colours, dates, actions, pixel baselines). |
| 7 | Triage and fix loop | A + M | Each DIFF or ERROR is classed as a product bug, an oracle error or an environment problem, and written up in `findings/`. |
| 8 | Graduate at release | M + A | The feature suite becomes a regression for the next cycle (not yet exercised). |
| 9 | Close out | A + M | Update `STATE.md`, stage commits for the maintainer, archive the (gitignored) output. |
| 10 | Hand off | A | `assets/new-session-prompt.md` for a fresh session. |

The specs open a visible browser on purpose, so a person can watch. They are read-only: no data in the org changes. Each test has a 15-minute limit (`playwright.config.ts`), so long specs (dates) are split with `ONLY_RECORDS`.

## How the checks catch problems

There are three layers, and each catches what the others miss. Keep all three: during the v0.5 work the zero-value bug passed the DOM scoring and only the before/after pixel diff caught it (`STATE.md`).

1. **DOM scoring against the oracle** (`capture.spec.ts`, `features.spec.ts`). The spec reads the rendered icons, text and counts from the page and compares them with `planning/expected*.csv`. Each shot is `PASS`, `KNOWN` (a difference a recorded decision explains), `DIFF` (unexplained) or `ERROR` (the shot could not run). The feature specs also use `REVIEW` for oracle rows nobody has confirmed yet; those are questions to answer, not failures. It cannot see colour or layout.
2. **Before/after screenshot diff** (`compare_captures.py compare`). It compares a new run with your own earlier run, shots and Key images. A pixel counts as changed when any colour channel differs by more than 24, which ignores anti-aliasing. It reports the change in scoring too.
3. **Pixel baselines** (`features.pixels.spec.ts`). 14 colour and layout shots per theme, compared with a saved baseline (up to 40 differing pixels allowed). Baselines live in `regression/playwright/output/baselines/` and are gitignored, so each machine builds its own; `--update-snapshots=all` re-baselines.

`keys.spec.ts` is different from the others: it captures each bundle's Key (an image and a text file) and does not score it. A Key is checked only by the before/after diff.

Three oracle files: `expected.csv` (prod, v0.4), `expected.dev.csv` (dev, the next build) and `expected.features.csv` (new features). Prod and dev differ in *which* items exist (see "prod_only" in `regression/README.md`), not in what each one is expected to do.

## A worked example (2026-11-01: moving the LWCs from API 65 to 68)

- `org_audit.py` first: `READY` after the Regression records were loaded (it had flagged 0 of 8 accounts, so the capture would have had nothing to open).
- `features.pixels.spec.ts`: 14 of 14 pixel shots matched the saved baselines.
- Backed up the previous capture, then `capture.spec.ts` and `keys.spec.ts`: 116 PASS, the same as before, no result changed.
- `compare_captures.py compare`: 135 images, 7 changed. Four were explained by an intended change (one indicator, `B00`, moved out of the dev set because a new validation rule rejects it: three bundle shots and one Key that was one row shorter). Three Keys differed by 66 to 117 scattered pixels, all around the small info icon; judged anti-aliasing.
- The agent reported that, with the evidence, and left the judgement to the maintainer.

## The oracle, and what a volunteer can do

The oracle states *intended* behaviour, not what the code does today, so a bug cannot be baselined by accident. It is built from hand-editable tables in `regression/planning/` (`indicators.csv`, `extensions.csv`, `records_account.csv`, `records_contact.csv`, `features/*.csv`) by `build_cmdt_csvs.py`, `build_expected.py`, `build_shot_matrix.py` and the feature versions of those (`build_feature_cmdt_csvs.py`, `build_expected_features.py`). `regression/README.md` and `references/add-a-feature-test.md` describe adding rows.

A volunteer can safely:
- edit the planning tables and add rows;
- re-run the build scripts;
- check that every previously passing oracle row is unchanged (the first line of the skill's definition of done).

By current practice these stay with the maintainers:
- changing a rule inside `build_expected.py` (for example how Boolean fields are expected to render);
- deciding that a difference is KNOWN.

## Things that trip a run

- **A spec that finds no records must fail.** Check the `>> <record>` lines in the log; a green run that visited nothing proves nothing.
- **Always name the org.** The maintainer's default org in VS Code has pointed commands at the wrong scratch org before. If you identify an org by its username rather than an alias, also set `REGRESSION_ENV` and `REGRESSION_THEME`, because the specs infer both from the alias.
- **The theme is whatever the org is set to** (SLDS1, SLDS2 light, SLDS2 dark each have their own baselines). Compare only within a theme.
- **CumulusCI cannot run inside a git worktree** (`not a git repo`). Use a normal clone for `cci` commands.
- Windows: Python cannot open Git Bash `/tmp` paths; `sf` is `sf.cmd`.

More in `.claude/skills/indicator-feature-testing/references/pitfalls.md`.

## Known gaps

- The rule logic of the oracle sits in Python (`build_expected*.py`), not in a table. A plain-language "what each rule means" page for volunteers does not exist yet.
- Graduation at release (step 8) has not been run, so that runbook step is untested.
