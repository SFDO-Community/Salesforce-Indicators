---
name: documentation-capture-from-steps
description: Resolves a reviewed `steps.yaml` storyboard (or a `catalog/<area>.yaml` regression area) against a live Salesforce org, builds `locators.ts` and a `capture.spec.ts`/`<area>.spec.ts`, and captures screenshots to `shots/` named by slug — for `diffable` regression scenarios, the same screenshot also becomes a Playwright `toHaveScreenshot()` visual-regression baseline. Use this whenever a documentation storyboard or a regression catalog area needs its screenshots/automation generated or regenerated — after `steps.yaml` or a catalog area has been reviewed, after a Salesforce release or page-layout change breaks existing shots, or when the user asks to refresh, re-capture, re-shoot, or automate training/regression screenshots. This is the SECOND stage of the documentation video pipeline. Do NOT use this to create the storyboard from a recording (that's documentation-steps-from-recording), to author/edit a regression scenario (that's regression-scenario-author), or to assemble the video (that's documentation-video-from-capture). Do NOT use during a normal indicator-design conversation — that's design-salesforce-indicator's job, which only reads these files, never regenerates them.
arguments:
  - name: capture-dir
    description: Directory holding the reviewed steps.yaml, e.g. recordings/documentation/<process-name>/
  - name: target-org
    description: Alias of the Salesforce org to capture against
---

# Capture from a storyboard

The second stage of the documentation video pipeline. Consumes
`{{capture-dir}}/steps.yaml`; produces `locators.ts`, `capture.spec.ts`, and
`{{capture-dir}}/shots/*.png`.

Read `references/conventions.md` before starting — accessible-name selectors, no fixed
sleeps, locators kept out of the spec and shared across captures, the fixed capture
environment. If the project has its own `CLAUDE.md`, read that too; it wins where the two
disagree.

## Before anything else: check `unclear`

**If `steps.yaml` has a non-empty `unclear` block, stop. Do not open the org, do not
resolve a single locator.** Show the user the open questions and wait.

Those entries are stage 1 saying it observed something it could not interpret. Capturing
past them produces screenshots of steps nobody confirmed — and because they look exactly as
finished as every other frame, the error surfaces at review, or after a voice recording
session, or not at all.

Resolving them means the user answers and the entries are removed from `steps.yaml`. A
question answered in chat but left sitting in the file is still unresolved: the next run
starts from the file, not the conversation. If the user answers conversationally, write the
resolution into the affected steps and clear the block before proceeding.

The same applies mid-run. If a step turns out to be ambiguous once you see it in the org —
two elements match the `target`, the `wait_for` never appears, the step assumes state that
isn't there — add it to `unclear`, stop, and ask. Do not resolve it by picking whichever
interpretation lets the run finish.

## Org access

```bash
sf org open --target-org {{target-org}} --url-only
```

That returns a frontdoor URL carrying an active session. Start the browser from it.

- **Never touch the login form.** MFA will block it.
- **Never create a scratch org or sandbox, and never connect to an org the user didn't
  name.** If `{{target-org}}` isn't available or isn't authorized, stop and ask.
- Sessions are short-lived. If one expires mid-run, regenerate it and continue.

## Resolve one step at a time

Do not batch this. For each step in `steps.yaml`, in order:

1. Navigate to where the step happens.
2. Inspect the accessibility tree and find the element by role and accessible name.
   **Show the user what you found before committing to it.**
3. Add it to `locators.ts` keyed by business name, e.g. `opportunity.stagePicker`.
4. Perform the action, confirm the step's `wait_for` element is visible, then take the
   screenshot if `shot: true`.
5. Only then move on.

Steps marked `conditional: true` still need a locator and a shot — they appear in the
video as asides. Set up whatever state they require, or flag that you couldn't.

Screenshots go to `{{capture-dir}}/shots/<slug>.png`. The filename is the slug from
`steps.yaml`, exactly, with no prefix or number. The next skill matches scene files and
narration audio against these names, so a mismatch here breaks the whole chain.

## Then write the spec

`capture.spec.ts` reads `steps.yaml` and drives the flow using `locators.ts`. No selector
is ever inlined in the spec — a UI change must be repairable by editing one line in
`locators.ts`.

## Verify before handing off

Run the spec twice and diff the two sets of screenshots. If any frame differs between
consecutive runs, name it and explain why. A frame that isn't stable across two identical
runs means something in the environment isn't pinned — data, user, viewport, theme,
a visible clock, a notification badge — and the capture isn't trustworthy until it is.

If a re-capture of an existing storyboard produces frames that differ from the committed
ones, that's the expected outcome, not a failure. Report which slugs changed. That list is
what tells the user which parts of the video actually need attention.

**Report anything you couldn't resolve.** Never substitute a fragile selector — an
`nth-child`, a generated Lightning id, a text match on something dynamic — to get to the
end of the run. An unresolved step is a question; a fragile selector is a failure that
surfaces months later during a release.

## Capturing regression catalog scenarios (not just a documentation storyboard)

This skill also resolves scenarios from `catalog/<area>.yaml` (see
`catalog/README.md` and `catalog/schema/scenario-schema.md`), one area at a time, into a
hand-built `capture/<area>.spec.ts` — the same recording → storyboard → hand-built-spec workflow
as above, just sourced from a catalog area instead of a fresh recording. When capturing a
catalog area:

- **Skip every `automation: manual-only` scenario entirely.** Do not attempt to resolve a
  locator for one, even if it looks trivial — that classification means it was deliberately
  judged unscriptable (real hardware, human judgment, production-data auditing), not merely
  unautomated yet.
- **For `automation: functional-only` scenarios**, resolve `expect` into a plain Playwright
  assertion (state/attribute/text check) — no screenshot.
- **For `automation: diffable` scenarios**, use a single
  `await expect(page).toHaveScreenshot('<slug>.png', ...)` — do not also call a plain
  `page.screenshot()`. `capture/playwright.config.ts`'s `snapshotPathTemplate` already resolves
  this to `capture/shots/<slug>.png`, and `toHaveScreenshot` itself writes that file on first run
  (or `--update-snapshots`) and compares against it on every later run. One call, one file, no
  way for a baseline and a "video frame" copy of the same shot to drift apart. If a video project
  later wants this exact frame, point its composition at `capture/shots/<slug>.png` directly
  rather than re-capturing it under `recordings/documentation/<name>/shots/`.
- **For a pure documentation-video storyboard step** (not sourced from the regression catalog),
  keep using the existing plain `page.screenshot({ path: '{{capture-dir}}/shots/<slug>.png' })` —
  nothing changes there.
- See the regression-catalog implementation plan for why a generic runner across all catalog
  areas was deliberately deferred in favor of this per-area hand-built approach.
- A scenario's `fixture` field (currently only `dev-dataset`, the fixed Account "Salesforce" /
  Contact "Astro Nomical" pair under `datasets/dev/`) names which deterministic org state it
  assumes — make sure that dataset is actually loaded before capturing (`dev_org` loads it
  automatically; `cci task run load_sample_data --dataset dev` loads it on demand otherwise), and
  don't capture a `diffable` scenario against ad hoc data. An unpinned fixture is exactly the
  kind of unstable environment the "verify before handing off" step above already tells you to
  catch.