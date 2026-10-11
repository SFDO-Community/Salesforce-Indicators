# Pipeline conventions

Shared rules for the documentation video pipeline. This file is bundled with all three
skills so each works standalone. If the project has its own `CLAUDE.md`, that wins where
the two disagree — say so rather than silently following one.

## What this pipeline is

A Playwright spec drives a Salesforce org and captures screenshots. HyperFrames assembles
those screenshots into a video over narration audio. The point is that when the UI changes,
the pictures regenerate without re-recording the narration.

```
recording ──▶ steps.yaml ──▶ shots/*.png ──▶ videos/<name>/ ──▶ mp4
```

## Naming — the load-bearing rule

Every asset is named by **meaning**, never by position:

```
shots/quote-line-editor.png
.media/audio/voice/quote-line-editor.wav
compositions/quote-line-editor.html
```

Never a numeric prefix. Order lives in `steps.yaml` alone. Inserting a step must never
rename anything that already exists, because a rename breaks the match to narration audio
that has already been recorded — possibly by a human in a booth.

Where a tool returns numbered output (HyperFrames' `resolve.mjs` returns `voice_00N.wav`),
copy it to its slug name and reference only the slug name. The numbered file is the tool's;
the slug file is ours.

## Narration has one home

`steps.yaml` is the single source of truth for what is said:

- `narration` — the step described for a *reader*
- `narration_spoken` — the same step tightened for *speech*, written back during video
  authoring

**Narration should improve during video authoring.** That's when you can hear it, see the
pacing, and tell that a line lands badly. Rewriting it then is correct. The rule is not
"don't change it late" — it is **when you change it, push it back up**. Any approved
rewrite, any revision note, any line retuned after a render gets written back to
`steps.yaml` in the same turn it's agreed. Otherwise the best version of the script lives
only in a composition file, and the next pipeline run silently reverts to the draft.

Every spoken line in the finished video must correspond to a slug in `steps.yaml`,
including title and closing frames that have no screenshot. `STORYBOARD.md` and any
`SCRIPT.md` are **generated views** of this file, never hand-edited sources. Professional
voice talent will eventually record from slugs, and audio recorded against text that only
existed in a composition file cannot be matched back.

## The shape of `steps.yaml`

```yaml
# Storyboard: Export an Indicator Bundle as a JSON recipe
# Source recording: recordings/documentation/download-as-json/download-as-json.mp4
app: salesforce

steps:
  # A spoken beat with no capture step. Title cards, closing cards and section
  # bumpers still need a slug, or their audio cannot be re-recorded later.
  - slug: title
    action: (no on-screen action — title card)
    target: n/a
    wait_for: n/a
    shot: false
    narration: >
      Scene-setting for the reader: this video covers exporting an existing
      indicator bundle and its items as a JSON file.
    narration_spoken: >
      Here's how to export an existing indicator bundle as a JSON recipe.

  - slug: open-app-launcher
    action: Click the App Launcher (grid) icon.
    target: App Launcher icon
    wait_for: App Launcher search panel is visible
    shot: true
    narration: "Navigate to the App Launcher."
    narration_spoken: "Click the App Launcher icon to get started."

  # Conditional steps still get a locator, a shot, and a spoken line. `narration`
  # explains to a reader why the step is flagged; `narration_spoken` is what the
  # viewer actually hears, rewritten as a forward-looking aside.
  - slug: export-items-only-conditional
    conditional: true
    action: >
      Check "Export items only (exclude the bundle itself)" to export the
      indicator items without the bundle record.
    target: '"Export items only (exclude the bundle itself)" checkbox'
    wait_for: Checkbox shows checked state
    shot: true
    narration: >
      Not demonstrated in the recording — an alternate path for when an admin
      wants items without the bundle.
    narration_spoken: >
      By the way: checking Export items only leaves the bundle record out and
      exports just the items.

  - slug: click-export
    action: Click the "Export" button in the modal.
    target: Export button (modal footer)
    wait_for: Modal has closed
    shot: true
    narration: "Click Export; the file downloads and the process is complete."
    narration_spoken: >
      Click Export, and the JSON recipe downloads straight to your browser.
    note: >
      The download is a native browser event with no on-page confirmation to
      wait on after the modal closes.

  - slug: closing
    action: (no on-screen action — closing card)
    target: n/a
    wait_for: n/a
    shot: false
    narration: "Wrap-up."
    narration_spoken: "Done. Your bundle is ready to share or re-import."

unclear: []
```

Field notes:

| field | who writes it | notes |
|---|---|---|
| `app` | stage 1 | which application this targets; picks the locator and auth module |
| `slug` | stage 1 | permanent, kebab-case, no numbers, unique |
| `action` / `target` / `wait_for` | stage 1 | business language, never selectors |
| `shot` | stage 1 | false for spoken-only beats |
| `conditional` | stage 1 | steps that don't always happen |
| `narration` | stage 1 | for a reader; may contain meta-commentary |
| `narration_spoken` | stage 3, written back | for a listener; never meta-commentary |
| `note` | any stage | caveats that aren't instructions |
| `unclear` | stage 1, cleared by the user | open questions; **capture must refuse to start while this is non-empty** |

Count check before rendering: every step is one slug, one `narration_spoken` line, and
(where `shot: true`) one screenshot. If the number of audio clips doesn't equal the number
of steps, something has a home outside `steps.yaml`.

**`unclear` is a gate, not a note.** Stage 1 writes into it whatever it observed but could
not interpret. Stage 2 refuses to run while it has entries. An entry is resolved when the
affected steps are corrected and the entry is deleted — answering the question in
conversation is not enough, because the next run reads the file, not the chat. Any stage
may add to it at any time; only the user clears it.

## Selectors

- Prefer `getByRole` and accessible names. Salesforce's generated ids and class names churn
  between releases.
- Never `nth-child`, never a generated Lightning id, never a text match on something
  dynamic.
- Every locator lives in `locators.ts`, keyed by business name (`opportunity.stagePicker`).
  Never inline a selector in a spec. A UI change must be repairable in one line.
- `locators.ts` is shared across all captures in the repo, not per-capture. The same
  element appears in many videos and must be fixed once.

## Waits

Always wait on a specific element being visible. Never a fixed sleep. Lightning renders
async and a sleep captures spinners.

## Timing

Visual duration is **derived** from the narration audio file's length at build time. Never
hand-write a duration. Two hand-maintained duration values will drift, and that is how
audio bleeds across a cut.

## Capture environment

Fixed and pinned: 1440x900 viewport, the training user, light theme, notifications
suppressed, dynamic dates masked. Don't change these without saying so. If two consecutive
identical runs produce different screenshots, something here isn't pinned and the capture
isn't trustworthy yet.

## Org access

Get a session from the sf CLI:

```bash
sf org open --target-org <alias> --url-only
```

Never script the login form — MFA will block it. Never create a scratch org or sandbox, and
never connect to an org the user didn't name.

## Never commit

Anything holding a live session: Playwright `storageState` files, browser profile
directories, `.playwright*` caches, trace archives. A frontdoor URL or session id in git
history is a credential leak.