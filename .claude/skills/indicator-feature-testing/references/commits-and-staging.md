# Commits and staging

**The maintainer commits; you only stage** (and never push). The maintainer reviews the staged diff and commits with the message you offer.

## Group by purpose
One coherent change per commit, so each can be reviewed or cherry-picked alone. Typical split: (a) product fix + its unit tests + its write-up (cherry-pickable to `feature/staging-claude`);
(b) a batch of tests/data/pages/scripts; (c) validation rules + the records they affect + tooling. Say what is **deliberately not staged** and why.

## Stage, then verify (always)
```bash
git add <explicit paths>                     # never `git add -A` or `git add .`
git diff --cached --stat                      # counts match what you intended
git diff --cached --check                     # no whitespace errors
git diff --cached | grep -iE "1password|trailblaze|access_token|sfdxurl"    # secret scan: expect nothing
git diff --cached --name-only | grep -E "^(capture|temporary-resources|unpackaged|\.claude)|TestPlan|Test Plan|^catalog/|\.gitignore|^package"   # expect nothing (unless the commit is the skill itself)
git status --short                            # what is left unstaged (should be the maintainer's own files)
```
For product-code commits also run the unit suite (`npx sfdx-lwc-jest -- force-app`).

## README hunks
`regression/README.md` used to carry a pending hunk of the maintainer's own (the scenario catalog text); it now lives in `catalog/README.md`. If `git diff regression/README.md` ever shows hunks that are not yours, stage only yours with a filtered patch (`git diff -U3 -- <file>`, split on `^@@`, `git apply --cached --recount`); interactive `git add -p` is not available.

## Files that are never yours to stage
`.gitignore`, `package.json`, `package-lock.json` (the maintainer's own edits); volunteer material and `temporary-resources/*` (and **never** `TestPlan.md` / `Test Plan.docx`: live password-share links);
anything under `.claude/skills/` except the skill you were asked to change (several are deliberately untracked or gitignored).

## Commit message
Subject in the imperative, a short body saying *what and why*, results if tests were run, and the attribution line the session supplies (e.g. `Co-Authored-By: ...`). Offer it in a code block; the maintainer pastes it.
Line endings: files in the working tree are LF; git warns "LF will be replaced by CRLF" on this repo: that warning is expected.
