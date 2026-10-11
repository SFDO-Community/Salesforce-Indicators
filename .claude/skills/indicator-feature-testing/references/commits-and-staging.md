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
git diff --cached --name-only | grep -E "^(capture|temporary-resources|unpackaged|\.claude)|TestPlan|Test Plan|regression/(catalog|schema)|\.gitignore|^package"   # expect nothing (unless the commit is the skill itself)
git status --short                            # what is left unstaged (should be the maintainer's own files)
```
For product-code commits also run the unit suite (`npx sfdx-lwc-jest -- force-app`).

## The README hunk problem
`regression/README.md` carries a long **pending hunk of the maintainer's own** (the "Regression scenario catalog" section near the top). Stage only your hunks with a filtered patch; interactive `git add -p` is not available:
```python
d = subprocess.run(['git','diff','-U3','--','regression/README.md'], capture_output=True, text=True, encoding='utf-8').stdout
head, *hunks = re.split(r'(?m)^(?=@@ )', d)
keep = [h for h in hunks if 'Regression scenario catalog' not in h]      # exactly one hunk must be left out: assert it
open(patch, 'w', newline='').write(head + ''.join(keep))                # then: git apply --cached --recount <patch>
```
Afterwards `git status` shows `MM` for the README: staged = yours, unstaged = theirs. Check `git diff --cached regression/README.md | grep -ci "scenario catalog"` is 0.

## Files that are never yours to stage
`.gitignore`, `package.json`, `package-lock.json` (the maintainer's own edits); volunteer material and `temporary-resources/*` (and **never** `TestPlan.md` / `Test Plan.docx`: live password-share links);
`regression/NEXT_SESSION_PROMPT.md` unless asked; anything under `.claude/skills/` except the skill you were asked to change (several are deliberately untracked or gitignored).

## Commit message
Subject in the imperative, a short body saying *what and why*, results if tests were run, and the attribution line the session supplies (e.g. `Co-Authored-By: ...`). Offer it in a code block; the maintainer pastes it.
Line endings: files in the working tree are LF; git warns "LF will be replaced by CRLF" on this repo: that warning is expected.
