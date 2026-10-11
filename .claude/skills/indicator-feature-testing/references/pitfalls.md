# Pitfalls (each cost real time once)

## Process
- **Default org is unreliable** (the maintainer's VS Code showed a different org than assigned). Always `--org <alias>`. Verify state with a read-only query before running anything.
- **Two people, same orgs:** ask before running; a reload during a test run produced a spec that found no records and "passed". Specs now **fail** when they find no records; still check the log shows each record visited.
- A pass is only meaningful if the spec could have failed: guard with a deliberate negative (an unknown record id, or a unit test that fails without the fix).
- Do not `rm` with a shell variable (blocked by a safety check; logs are overwritten anyway). Logs and temporary scripts go to the scratchpad, not the project; remove probes you create.
- Long heredocs with quotes/backslashes get mangled by the shell: write scripts with the file tool, then run them.

## Playwright against Lightning
- The avatar/badge/pill tabs sit under **"More Tabs"**. The More button is taller than the tab bar (90px vs 40px), so click it near its top (`position: {x:20, y:10}`); a clipped tab still exists in the DOM
  (`count()>0`), so try the click briefly and fall back to the menu (`openTab()` in `lib.ts`).
- `locator.innerText()` on a **missing** element waits for the whole test timeout: `count()`-guard each read and set `page.setDefaultTimeout`. Hover with `page.mouse.move` to the element centre, not `locator.hover()`
  (it stalls when the previous popover overlaps the target).
- **Icon sprites load late on a fresh org**: a screenshot straight after the DOM settles can show coloured circles with no glyph. Wait for `networkidle` **once per tab-open** (per bundle cost ~2 minutes per record and broke the time budget).
- Child components expose public props: badge `indText`/`indIcon`/`indIconPosition`/`indTextColor`/`indBackgroundColor`; **pill label is `indBadgePillText`** and the pill has no icon position. Values can be numbers: `String()` them.
- Headed runs must stay in the foreground; a backgrounded run stalls with no output. Keep each command under ~9 minutes.

## Windows / tooling
- `sf` is `sf.CMD`: from Python use `shutil.which('sf')`. CRLF/LF warnings from git are expected.
- jsdom ignores `style.setProperty(name, undefined)` while Chrome stores the text "undefined": unit tests must spy on the call.
- `git mv` stages the move immediately: tell the maintainer.

## Salesforce / CMDT
- CMDT SOQL: an `OR` in `WHERE` inflates `COUNT()` (it counted each branch separately); list names instead. Relationship fields return durable ids, not names.
- `Field__c` is a MetadataRelationship; a custom field is stored as a **durable id**; deploying the bare API name works and Salesforce converts it. See `validation-rules.md` for the `TEXT()` and `DataType` traps.
- `sf cmdt generate records` writes un-tokenised files; generate into a scratch directory and copy only new/changed files (see `add-a-feature-test.md`).
- `delete_data` on Account removes **all** Accounts (also the regression ones): follow with `load_sample_data` and both feature `load_dataset`s. Also delete Contacts and the scratch org's sample Entitlement.
- Relative dates: the org user's date can be a day behind the machine near midnight; date expectations use the org's `TODAY`. `anchor_date` shifts every date by (load day - anchor).
- The `regression_dev` flow order matters (field + permission set before data; base pages before dev pages of the same API name). A permission set must be assigned before the dataset loads.
- Unmanaged vs managed: records use CumulusCI tokens (`%%%NAMESPACE%%%`, `___NAMESPACE___`); an unmanaged dev org resolves them to empty. Prod-shaped orgs use `inds__`.

## Repo
- `npm run test:unit` also picks up the Playwright `*.spec.ts` files (pre-existing; `jest.config.js` ignore patterns proposed, not applied): run `npx sfdx-lwc-jest -- force-app` for the real unit tests.
- Several `.claude/skills/*` are untracked or gitignored on purpose, and the two catalog skills (`regression-scenario-author`, `regression-checklist-from-catalog`) point at the top-level `catalog/`, a separate effort.
- The project `CLAUDE.md` still says there is no `package.json`; on this branch there is (it arrived with the `feature/staging-claude` merge).

## Pixel baselines
- Use an **absolute** `maxDiffPixels` (40), never a ratio: 0.5% of a ~110,000px bundle shot (~550px) would hide one glyph changing colour (~200px), the bug the baselines exist for. Prove sensitivity by tampering a COPY of a baseline (invert ~225px), expect exactly that shot to fail, then restore it byte-identical.
- Screenshot the **modal's own box** (clip to the union of `.slds-modal__header/__content/__footer`): the dialog and its container span the viewport and would capture the dimmed page behind it.
- Baselines are machine-specific (fonts): keep them gitignored, regenerate per release/machine; a second run must reproduce them before you trust them. Wait for `networkidle` once per tab so a cold org does not bake blank icons into a baseline.
