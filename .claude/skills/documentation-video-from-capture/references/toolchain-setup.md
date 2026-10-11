# Toolchain setup (Windows)

Machine-specific, run once. Split out of `SKILL.md` because it rots faster than anything
else in the pipeline — winget package ids, install paths and CLI flags all drift. Verify
against current docs if something here doesn't match what you see.

Run `npx hyperframes doctor` inside the project. Fix what's red *before* building.
These are autonomous-mode choices: state the fallback you took, don't ask permission.

## FFmpeg / FFprobe missing

```bash
winget install --id Gyan.FFmpeg -e --silent --accept-package-agreements --accept-source-agreements
```

Background it — this can run past 180s.

Then **copy** `ffmpeg.exe` and `ffprobe.exe` from the winget package's `bin/` into a
directory already on the persistent user `PATH` (the npm global bin dir, `%APPDATA%\npm`,
works). Copy rather than `export PATH=` — bash tool invocations do not share shell state
between calls, so only a file placed on the real Windows PATH survives to the next call.

## Chrome missing

```bash
npx hyperframes browser ensure
```

## TTS provider

No HeyGen sign-in means local Kokoro is the free/offline fallback. Install once:

```bash
python -m pip install kokoro-onnx soundfile
```

This satisfies the brief-contract's "sign-in unavailable → continue through an available
offline provider" gate.

## Low free RAM

If `doctor` flags it, expect the *first* `npx hyperframes render` to plausibly fail with
`Audio duration normalization failed: ... ffprobe deadline`. This is transient resource
contention, not a composition bug — frame capture will already show 100% complete.
**Retry the render once** before investigating.