---
name: documentation-video-from-capture
description: Turns a reviewed `steps.yaml` plus its `shots/*.png` into a finished narrated HyperFrames walkthrough video — captions bar, voice-over, click cursors, highlight boxes, rendered to MP4. Use this whenever documentation screenshots need to become a training or walkthrough video, when an existing documentation video needs re-rendering after a re-capture, or when the user gives frame-by-frame revision notes on one. This is the THIRD and final stage of the documentation video pipeline. Do NOT use this to build the storyboard (that's documentation-steps-from-recording) or to capture the screenshots (that's documentation-capture-from-steps) — this skill only consumes their output. Do NOT use during a normal indicator-design conversation — that's design-salesforce-indicator's job.
arguments:
  - name: capture-dir
    description: Directory holding steps.yaml and shots/, e.g. recordings/documentation/<process-name>/
  - name: project-name
    description: kebab-case name for the HyperFrames project under videos/
---

# Video from a capture

The third stage of the documentation video pipeline. Consumes
`{{capture-dir}}/steps.yaml` and `{{capture-dir}}/shots/*.png`; produces
`videos/{{project-name}}/`.

This captures concrete decisions and real bugs from doing this end to end. Follow it
rather than re-deriving the approach — several sections below cost a full
render-and-relisten cycle to discover.

## A shot may double as a visual-regression baseline

If `{{capture-dir}}` is (or was captured alongside) a `catalog/<area>.yaml` area, some
of its `shots/*.png` files may be the same file `documentation-capture-from-steps` wired up as a
Playwright `toHaveScreenshot()` baseline for a `diffable` regression scenario, not just a video
frame. Regenerating or overwriting one of those shots for a new video cut is the same action as
updating that baseline — call it out to the user explicitly rather than silently re-shooting, so
they can decide whether the new frame is an intentional baseline update or an accidental one.

## 0. Read the inputs first

Read `steps.yaml` fully — slugs, `shot` and `conditional` flags, and the narration per
step.

**If `unclear` is non-empty, stop and show the user the open questions.** It should have
been cleared before capture ran; finding entries here means either capture was run around
the gate or something was added since. Either way, don't spend a render on a storyboard with
unresolved questions in it.

`narration` is written for a *reader*. Tighten it for *spoken* delivery: shorter
sentences, no meta-commentary like "not demonstrated in this recording", conditional
steps rewritten as forward-looking asides ("By the way — checking X does Y").

**Write the tightened line back into `steps.yaml` as `narration_spoken` before generating
any audio.** `steps.yaml` must remain the single place that answers "what words come out of
the speaker for this slug", because professionally recorded audio will eventually be
produced from it and must match the slugs exactly.

Add entries for any spoken beat that has no capture step — title cards, closing cards,
section bumpers — with `shot: false`. Every line in the finished video needs a slug, or it
can't be re-recorded later.

If a rewrite is substantive enough to need the user's approval (turning a skipped step into
a "by the way" aside, merging two lines, cutting a beat), ask — and when they approve, write
it back in that same turn. Don't batch write-backs to the end; that's when they get lost.

## 1. Route through /hyperframes once, briefly

This is a **formed, specific request** — message, material and occasion are all already
known from `steps.yaml` — so the intent layer should NOT run the pitch round. Route to
`/general-video`. Ask only the handful of questions that matter, in one batch:

- **Aspect ratio** — 16:9 / 1920x1080 is the default for a desktop admin/docs tutorial;
  only ask if the destination is unclear.
- **Storyboard yes/no** — recommend **no**; the steps are already locked in `steps.yaml`.
- **Automation vs companion** — recommend **automation** for an already-storyboarded
  sequence.
- **Design spec** — with no browser tool in session, say so and offer 2–3 shipped
  `frame-presets/` **described from their `FRAME.md`** (palette, type, "pick when" line)
  rather than pretending to show live previews. Let the user pick by description, or open
  `frame-showcase.html` themselves.

Do not ask about voice, captions, or per-step content — those are implicit in the request
and in `steps.yaml`.

These routes come from HyperFrames' own bundled skill. If `/hyperframes` isn't available
in this session, say so and proceed to build the project directly rather than failing
silently.

## 2. Toolchain

Run `npx hyperframes doctor` inside the new project and fix what's red before building.
Setup steps for a fresh Windows machine are in `references/toolchain-setup.md` — read it
only if `doctor` reports problems. Naming and narration-ownership rules are in
`references/conventions.md`; read that before § 3.

## 3. Generate voice-over up front

For each `narration_spoken` line:

```bash
node <MEDIA_DIR>/scripts/resolve.mjs --type voice --intent "<exact spoken line>" --project .
```

`--intent` **is** the literal TTS text for `--type voice`, unlike other media types where
it's a search description.

### Rename every clip to its slug — this is not optional

`resolve.mjs` returns numbered ids: `voice_007.wav`. That numbering is the tool's, not
ours. Copy each returned file to its slug name and reference **only** the slug name from
the composition:

```bash
cp .media/audio/voice/voice_007.wav .media/audio/voice/quote-line-editor.wav
```

The TTS clip is a scratch track. Professionally recorded narration will replace it later,
delivered by slug, dropping in at the same path file for file. If the composition points
at `voice_007.wav`, that swap becomes a manual mapping exercise across every step, and
that is exactly where mismatches enter. Numbered files may stay on disk as the tool's
output; nothing downstream should ever name one.

Record each clip's **reported duration** as you go. You need every clip's real duration by
hand to schedule scene cuts and multi-line phase timing — there is no render-time
audio-metadata probe available for authoring, because determinism rules forbid depending
on runtime decode.

## 4. Composition architecture

**One reusable sub-composition for the uniform steps.** Most steps share the same shape:
screenshot plus caption plus optional zoom/cursor/box. Build ONE
`compositions/step-scene.html` parameterized by `data-composition-variables` (screenshot
src, caption text, eyebrow/progress fields, zoom target %, cursor target %, highlight-box
rect %) and mount it N times in `index.html` with different `data-variable-values`. This
is far less authoring than N separate files, and is what per-instance overrides are for.

> **Know the tradeoff you're making.** Sharing one sub-composition means there is no
> per-step scene file, so changing one step edits a variable block inside `index.html`
> and every step shares that file. You lose the small-diff property that one-file-per-scene
> gives you. It's usually the right call at this scale — but keep the variable blocks in
> `index.html` in slug order, one per line group, so a diff still reads cleanly.

**Bespoke one-off files for anything two-phase.** A step whose screenshot must stay on
screen through *two* narration lines with a mid-scene camera move ("stay wide until line A
finishes, then pan while line B plays") does **not** fit the shared template safely — see
the audio gotcha below. Write it as its own `compositions/<slug>.html`, named by slug, with
the two `<audio>` clips' `data-start` values hardcoded to that scene's own known
line-A duration.

### The audio gotcha that will burn you (real bug, not hypothetical)

**Never set a per-instance `<audio>`'s `src` via JS** (`el.src = vars.voiceSrc`). The
render's audio-extraction pass reads the element's **authored, static** `src` attribute
directly — it does not run the composition's own script first. A JS assignment only
affects the *live DOM*, so Studio's interactive preview sounds correct while the rendered
MP4 extracts the same fallback clip for every reused instance: one line repeating over and
over, at each scene's own timing.

Use the declarative binding instead, and keep a real fallback `src` (lint requires one):

```html
<audio id="voice" data-var-src="voiceSrc" src=".media/audio/voice/quote-line-editor.wav" data-start="0.4" data-track-index="11"></audio>
```

`data-var-src` / `data-var-text` are resolved by the **compiler**, before extraction runs —
that's the difference that matters. Documented in
`hyperframes-core/references/variables-and-media.md`, easy to miss.

Give every reused instance a **distinct `data-track-index`** (via a `trackIndex` variable:
11, 12, 13…). Otherwise `lint`'s `duplicate_audio_track` heuristic flags every instance as
sharing one track. Cosmetic — the render never reads `data-track-index` — but cheap to
silence.

### The zoom-clamp gotcha (also real, also easy to miss)

A `viewport-change`-style punch-in (`hyperframes-animation/rules/viewport-change.md`,
single wrapper, `T = -offset × S`) can demand more translate than a modest scale provides
overscan for, once the target is more than ~10–20% off-center. A scale-`S` enlargement only
buys `(S-1)/2 × stageSize` of margin per side; an uncapped translate toward a corner target
can push the zoomed image past the stage edge and expose blank canvas behind it. Either:

- clamp the translate to that margin — graceful degradation, the camera pans as far as it
  safely can and never breaks; **or**
- pick `(targetPercent, scale)` pairs satisfying
  `|targetPercent/100 - 0.5| ≤ (S-1) / (2S)` up front.

Always clamp. It's cheap insurance and doesn't preclude also picking sane targets. Verify
with a snapshot at the zoom's *held* end state, not its start — this only shows up once the
pan has fully landed.

### Click cursor and highlight-box annotations

- **"Point at where to click"** → adapt
  `hyperframes-animation/rules/cursor-click-ripple.md` verbatim (move → click depress →
  ripple burst). The target is a point *inside a raster screenshot*, not a live DOM
  element, so position the cursor via the same `left/top: <percent>%` coordinate space as
  the zoom target, as a **child of the same zoom-outer wrapper** the image lives in — that
  way cursor and image content stay aligned under the same transform no matter how much
  the zoom gets clamped. **Fade the cursor back out** (~0.3–0.4s, ~0.5s after the click).
  The cited recipe is a one-shot move-click-ripple and doesn't self-clean; without an
  explicit fade-out tween the cursor stays frozen on screen for the rest of the scene.
  Caught by snapshotting well after the click, not at the click.
- **"Draw a box around this region"** → no dedicated rule exists. Adapt
  `hyperframes-animation/rules/css-marker-patterns.md` **Circle Mode** (bordered ring,
  `scale(0)→scale(1)` with `back.out` settle), swapping `border-radius: 50%` for a small
  radius and sizing/positioning it as a percent rect instead of relative to a text span.
  Same rule: position it inside the zoom-outer wrapper so it travels with the image.

## 5. Review like the bugs are real, because they were

`npx hyperframes check` (lint + runtime + layout + motion + contrast) catches structural
problems but **not** content bugs. A wrong zoom target, a frozen cursor, or silently-wrong
audio all pass `check` cleanly. After it passes:

1. `npx hyperframes snapshot . --at <comma-times> --no-end -o <dir>` at **every scene's
   midpoint AND at its key motion beats** — a zoom's landed state, a click's post-ripple
   moment, a two-phase scene's phase-2 start. Cut-point midpoints alone miss exactly the
   two bugs above.
2. Read the generated `contact-sheet-*.jpg` files directly. Don't guess from code.
3. Extract a couple of seconds of audio at different scene offsets and diff checksums
   (`ffmpeg -ss <t> -t 1.5 ... | md5sum`) if there's any doubt that real per-instance audio
   is playing rather than one repeated clip. Cheaper than a full re-render-and-relisten.

## 6. Render

`npx hyperframes render` (equivalently `npm run render`).

If Studio's in-browser Export button errors with `Could not reach render server: Failed to
fetch`, that is Studio telling you to use the CLI. It is not a bug in your composition.

If a fresh CLI render fails with an `ffprobe deadline` error during final audio assembly
after capture already hit 100%, retry once before treating it as a real failure.

Verify the artifact rather than trusting the "Render complete" line:

```bash
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 <file>
ffmpeg -i <file> -af volumedetect -vn -f null - 2>&1 | grep -i "mean_volume\|max_volume"
```

Duration should match the root composition's `data-duration` exactly. `max_volume` near but
not at 0dB with a low sample count at the ceiling is normal voice headroom, not clipping.

## 7. Frame-by-frame revision feedback

Expect notes shaped like "Frame N should have voice_XYZ on it as well" or "this doesn't
need the zoom, add a box instead."

- **Resolve genuine ambiguity by asking.** Don't guess silently when a wrong guess would
  misrepresent the flow — e.g. "reuse the image from Frame 9" when Frame 9's screenshot
  shows a *non-default* checkbox state that would visually contradict the narration. One
  targeted question beats a wrong build.
- A request to **merge two frames' narration onto one screenshot** usually means: move the
  second line's `<audio>` and caption to the earlier scene, and what's left of the frame
  that lost its narration becomes a short **silent landing beat** (~0.3s near-silent
  placeholder `<audio>` plus a brief hold), not a deleted frame. Confirm this reading when
  the wording is "should have X on it as well" rather than "replace with X."
- **Recompute every downstream `data-start`** after changing a scene's duration. There's no
  auto-relayout; the whole timeline is hand-authored offsets.
- **If the revision changes what is said, update `narration_spoken` in `steps.yaml` in the
  same turn.** This is where drift actually happens: late feedback is the *best* feedback,
  because it comes from watching the rendered video, so the improved line is the one worth
  keeping. But it arrives at the composition stage, and if it stops there, `steps.yaml`
  keeps the inferior draft and the next run regenerates from it. Improving narration late is
  correct. Improving it *only* in the composition is the bug.