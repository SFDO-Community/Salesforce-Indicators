# Triage a DIFF and write the finding

## Decide what the DIFF is
A `DIFF` has three possible causes. Find which **before** touching anything:
1. **The product is wrong** (a real bug). 2. **The oracle/spec is wrong** (I mis-predicted; the product behaves correctly). 3. **The test data is wrong** (e.g. unreadable colours, a record the page cannot show).
Process:
1. Read the report row (`*_report.csv`): expected vs actual per field, and the `basis` (`spec` or `unconfirmed`).
2. Look at the screenshot and, for popovers, `shots/popovers/<key>.png`. The picture often explains it faster than the numbers.
3. Reproduce in the browser with a **temporary, read-only probe spec** (log in with `loginAndGetOrigin`, open the record, evaluate the DOM or computed style); delete it afterwards. Child components expose public props
   (`indText`, `indIcon`, `indIconPosition`, `indTextColor`, pill label `indBadgePillText`); inline CSS variables are on the element's `style`.
4. Read the code that produces it (`force-app/main/default/lwc/indicatorBundle/indicatorBundle.js` and the `resolve*` functions; `key/key.js`; `indicatorCssVars`). Name the exact line.
5. For anything involving a platform rule (validation, relationships), **query the org** instead of guessing (e.g. `EntityParticle.DataType`). Several early theories here were wrong until queried.

If the oracle was wrong, fix the oracle with the reason in a comment and regenerate; if data, fix the planning row; if the product, continue below.

## Prove a product fix (test first)
1. Write the Jest test for the unit that is wrong (`force-app/.../__tests__/`), run it and **confirm it fails without the fix** (jsdom can hide DOM behaviour; spy on the call if needed).
2. Apply the minimal fix **only if the maintainer asked for product changes**, in this repo; the maintainer replays it on `feature/staging-claude`.
3. Run the whole unit suite (`npx sfdx-lwc-jest -- force-app`); then verify in an org after the maintainer deploys (re-run the spec; the row flips to PASS and nothing else moves).
4. Prefer a **permanent guard** in the spec for the bug class (e.g. any inline CSS variable containing the text `undefined` now fails `features.spec.ts`).

## Write the finding (`regression/findings/<short-name>.md`, template in `assets/finding-template.md`)
Required sections: **what happens** (symptom, with the failing example), **reproduce**, **root cause** (file and line, or the platform fact with the query that shows it), **fix** (and whether applied/verified),
**evidence** (report rows, screenshots, test names), **what is still unknown**. Be explicit about what was inferred versus shown. If your earlier theory was wrong, say so in the doc. Keep user-facing advice separate
(`blog-advice-styling-indicators.md`) and product suggestions that are not defects in `v0.5.1-recommendations.md`.

## Existing findings (examples of the standard)
`badge-pill-merge-token.md`, `one-field-mapping-required-custom-field.md`, `validation-type-rules-never-fire.md`, `color-var-written-as-undefined.md`, `shipped-config-fails-validation.md`.
