# Commits and staging

**The maintainer commits; you only stage.** The maintainer reviews the staged diff and commits with the message you offer. Commit or push only when the maintainer asks for it in that turn (an earlier yes does not carry over), and never stage a file that holds their own pending edits.

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

## Getting a product commit onto `feature/staging-claude` (no worktree, no stash)
A worktree is easy to get stuck in after a PR; this order uses only ordinary branches. Product files = the `force-app` set listed in `regression/TODO.md` 1.3 (never the maintainer's own pending `force-app` edits unless they say so).
```bash
# 1. on feature/regression-vs-staging-claude: two commits, product first
git add <explicit product paths> && git commit            # commit P: force-app only (LWC + tests + rules + help text)
git add <explicit regression/skills/docs paths> && git commit   # commit R: everything else of yours; the tree must be CLEAN before switching
# 2. branch from the target and bring P over
git fetch origin feature/staging-claude                   # ALWAYS fetch, and branch from the REMOTE ref: a local feature/staging-claude goes stale after each PR merges
git switch -c feature/<topic> origin/feature/staging-claude
git log --oneline -1                                      # must show the latest merged PR (not an older one)
git cherry-pick <sha of P>                                # conflicts only if staging changed the same lines; keep staging's wording. A `modify/delete` conflict on a file you know exists means the branch was cut from a STALE local staging: `git cherry-pick --abort`, delete the topic branch and re-cut it from `origin/feature/staging-claude` (happened 2026-10-28)
npx sfdx-lwc-jest -- force-app                            # unit tests green on THIS branch before pushing
git push -u origin HEAD                                   # then open the PR (base: feature/staging-claude); a push to feature/** runs the Feature Test workflow
# 3. go back (no worktree to remove)
git switch feature/regression-vs-staging-claude
```
Why not switch with uncommitted changes: `regression/` does not exist on `feature/staging-claude`, so git refuses to switch while tracked `regression/` files are modified. Why commit P here first: this branch's orgs and specs need the product changes too, and the cherry-pick leaves the same content on both branches.
**`cci` and worktrees:** CumulusCI 4.10 reports "not a git repo" inside a worktree (its `.git` is a pointer file). When product commits must be proved in an org built with `cci`, make a normal clone instead: `git clone --branch feature/staging-claude <path to this repo> <dir>`, `git remote set-url origin <the GitHub URL>`, build and test there, push from there, then `git fetch` here and merge. Delete the clone only when everything in it is pushed and `git status` is clean. Used on 2026-11-01 for the validation-rule, Beta and API 68.0 commits; the one conflict on merging back was `sfdx-project.json` `sourceApiVersion`, which this branch had already changed.

After the PR merges: `git fetch origin feature/staging-claude`, then `git merge --no-edit origin/feature/staging-claude` into this branch (identical content merges cleanly), then check `git diff origin/feature/staging-claude HEAD -- force-app` is empty apart from the maintainer's own edits. Check that diff **before** the first commit as well: if a file differs by more than your change (as `NoExtensionOnCheckboxField`'s description did, 2026-10-26), align it first so the cherry-pick is clean.

## README hunks
`regression/README.md` used to carry a pending hunk of the maintainer's own (the scenario catalog text); it now lives in `catalog/README.md`. If `git diff regression/README.md` ever shows hunks that are not yours, stage only yours with a filtered patch (`git diff -U3 -- <file>`, split on `^@@`, `git apply --cached --recount`); interactive `git add -p` is not available.

## Files that are never yours to stage
`.gitignore`, `package.json`, `package-lock.json` (the maintainer's own edits); volunteer material and `temporary-resources/*` (and **never** `TestPlan.md` / `Test Plan.docx`: live password-share links);
anything under `.claude/skills/` except the skill you were asked to change (several are deliberately untracked or gitignored).

## Commit message
Subject in the imperative, a short body saying *what and why*, results if tests were run, and the attribution line the session supplies (e.g. `Co-Authored-By: ...`). Offer it in a code block; the maintainer pastes it.
Line endings: files in the working tree are LF; git warns "LF will be replaced by CRLF" on this repo: that warning is expected.
