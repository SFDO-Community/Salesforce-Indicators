---
name: documentation-steps-from-recording
description: Turns a screen recording of someone walking through a Salesforce process into a reviewed `steps.yaml` storyboard — one entry per step with slug, action, target, wait condition and narration. Use this whenever the user provides a screen recording, walkthrough video, or narrated demo of a Salesforce process and wants it documented, turned into a storyboard, or made into training material, even if they don't say "steps.yaml". This is the FIRST stage of the documentation video pipeline and produces text only — it never opens an org, writes Playwright code, or guesses at selectors. Do NOT use this when a `steps.yaml` already exists and only needs capturing (that's documentation-capture-from-steps) or rendering (that's documentation-video-from-capture). Do NOT use during a normal indicator-design conversation — that's design-salesforce-indicator's job, which only reads these files, never regenerates them.
---

# Storyboard from a recording

The first stage of the documentation video pipeline:

```
recording ──▶ [this skill] ──▶ steps.yaml
                                   │
                                   ▼
                          documentation-capture-from-steps  ──▶ locators.ts, capture.spec.ts, shots/
                                   │
                                   ▼
                          documentation-video-from-capture  ──▶ videos/<name>/ ──▶ mp4
```

The user supplies a screen recording of themselves performing a Salesforce process,
narrating as they go. Turn it into a storyboard. Produce text only.

Read `references/conventions.md` before starting — slug naming, narration ownership,
selector rules, the fixed capture environment. If the project has its own `CLAUDE.md`, read
that too; it wins where the two disagree. If this is a new project with no `CLAUDE.md`,
offer to write one from `references/conventions.md` so the rules travel with the repo.

## Output

Write `steps.yaml` to `recordings/documentation/<process-name>/steps.yaml`. Create the
directory if it doesn't exist. `<process-name>` is kebab-case, derived from the process,
not the recording filename.

One entry per step:

| field | contents |
|---|---|
| `slug` | meaningful, kebab-case, no numbers, unique within the file |
| `action` | what a person does, in plain language |
| `target` | the element in business terms, never a selector |
| `wait_for` | what must be visible before the screenshot is taken |
| `shot` | true/false — not every step needs a frame |
| `narration` | what the user said during this step, tightened for a reader |
| `conditional` | true, only on steps that don't always happen |

Slugs are permanent. Every downstream asset — screenshot, scene file, narration audio —
is named after them, so a slug that changes later breaks the match to audio that has
already been recorded. Name for what the step *is*, not where it sits in the sequence.

## Rules

- **Do not write Playwright code and do not guess at selectors.** `target` is
  "the Stage picker in the highlights panel", not a CSS or XPath expression.
  Resolving those against a live org is the next skill's job.
- **Split conditionals out.** When the user says something like "if this is a renewal,
  you'd also...", make it its own entry marked `conditional: true` rather than folding
  it into the surrounding step.
- **Keep the why.** Where the narration explains *why* a step happens, preserve it.
  That's what lets a future reviewer tell whether a step still does what it's meant to
  after the UI changes.
- **Don't invent.** If a step in the recording is ambiguous — the user's cursor moves
  offscreen, the narration skips ahead, two things happen at once — list it under an
  `unclear:` block at the end of the file and ask. A plausible guess is worse than a
  question, because it will be reviewed as though it were observed.
- **`unclear` is a hard gate on the next stage.** Capture refuses to run while it has
  entries, so there's no cost to putting a question there and no way for one to be quietly
  skipped. Entries are cleared by correcting the affected steps and deleting the entry — not
  by answering in conversation, since the next run reads the file. If the user resolves
  something in chat, write the resolution into the steps and clear the entry yourself.
- **Transcribe before you summarize.** Generate a transcript of the recording first and
  work from it. Narration text that gets paraphrased at this stage silently becomes the
  script someone later reads aloud.

## Handing off

Tell the user the storyboard is ready for review and name the path. Do not proceed to
capture — the review step between these two skills is deliberate, and it's cheap here
and expensive later.

## Relationship to the regression scenario catalog

The `steps.yaml` this skill produces can later be **promoted** into
`catalog/<area>.yaml` — a human or `regression-scenario-author` adds the area/risk/
expect/automation/provenance fields documented in `catalog/schema/scenario-schema.md` on top
of what's already here. That promotion is a separate, later decision: this skill's output stays
a plain how-to storyboard, with no area/risk/automation classification, and not every recording
needs to become a regression scenario. Do not add those fields yourself here — that's not this
skill's job, and guessing at `automation`/`risk` from a recording alone (rather than an explicit
decision) is exactly the kind of invention the rest of this file tells you not to do.