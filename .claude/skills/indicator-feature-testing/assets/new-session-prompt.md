# Prompt for a new session or another AI tool (copy everything below the line)

---

You are continuing a long-running piece of work in this repository (Salesforce Indicators, namespace `inds`): testing the **new features of the next release** with a Playwright + CumulusCI suite in `regression/`.
Earlier work is recorded in the repository. **Do not start working yet.** First rebuild the picture:

1. Read, in this order: `.claude/skills/indicator-feature-testing/SKILL.md` (the method and the non-negotiable rules), `regression/STATE.md` (current status), `regression/README.md` (section "Feature tests (`dev_only`)"),
   then skim `.claude/skills/indicator-feature-testing/references/` and `regression/findings/`. (If your tool has no skills, treat these as ordinary markdown files.)
2. Run `git log --oneline -8` and `git status --short` and compare them with `STATE.md`. If they disagree, say so; **the repo wins**.
3. Answer these in your own words, from what you read (do not ask me):
   a. Which org aliases exist, and what must every command against them include?
   b. What may you do to an org without asking, and what must you ask about first?
   c. Who commits, and what is your job around commits? What must never be staged?
   d. Why are `E_num_max_X1`, `E_num_on_text_X1` and `K_txtrule_chk_X1` tagged `prod-only`?
   e. Why did `Numeric_Missing_Minimum` and `String_Missing_Contains_Text` never fire, and how was the fix proven without changing the org?
   f. What did `applyColorVars` do wrong, and what permanent guard exists?
   g. How do you refresh the test data in an org, and how do you run the specs (where, how long, how many at once)?
   h. What are the next three tasks, in priority order?
4. Tell me anything that looks stale, contradictory or missing in those documents.
5. Only after I confirm your answers, propose the first action and **wait for my go** before touching any org.

**Answer key for the person grading this** (do not paste it into the session): a) `Salesforce-Indicators__regression_dev_slds1|slds2|slds2-dark`, every command passes `--org <alias>`; b) read-only queries and local work are fine, ask before any
deploy / data change / spec run; c) the maintainer commits, the agent stages, never TestPlan.md/.docx, volunteer material, the maintainer's `.gitignore`/`package*.json`; d) the corrected rules reject them (Number Max-only, numeric rule
on text, text rule on checkbox) and they only deployed while the rules were dead; e) `EntityParticle.DataType` is lowercase (`integer`, `string`...) while the rules looked for `Number`/`Text`; proven with check-only deploys applying candidate rules
inside the rolled-back deploy; f) it wrote the text `undefined` into a CSS variable when only one of background/foreground was set (black glyph); `features.spec.ts` fails any inline variable containing it, plus 6 unit tests; g) `delete_data`, `load_sample_data`,
two `load_dataset`; specs run foreground from `regression/playwright`, under ~9 minutes per command, orgs may run in parallel in one command, dates in two halves; h) see `regression/STATE.md` "Open items".
