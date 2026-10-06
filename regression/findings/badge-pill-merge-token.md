# Finding: `{!Field}` merge tokens in item-level Badge/Pill Text are not resolved

**Found by:** dev-only feature tests (`regression/playwright/features.spec.ts`), 2026-10-06, branch
`feature/staging-claude` build deployed to a scratch org (`regression_dev_slds2`, SLDS2).
**Severity:** functional bug, visible to end users. Badge and Pill styles only (Avatar does not show this text).
**Status:** confirmed by the maintainer-in-the-loop as a bug (the field's own help text says merge tokens work).
Fix below is **proposed, not applied, and not yet verified in an org**.

## What happens
A Badge/Pill label configured as `{!Rating} account` renders literally as `{!Rating} account`.

| | Expected | Actual |
|---|---|---|
| Record "Feature Full" (Rating = Hot) | `Hot account` | `{!Rating} account` |
| Record "Feature Cold" (Rating = Cold) | `Cold account` | `{!Rating} account` |

Reproduces on both the **Badge** and **Pill** styles, on every record where the item is visible (4 of 177 rows in
the first full capture; the other 173 passed).

## Reproduce
1. Deploy `regression/dev_only` and load `datasets/features` (records `Feature Full / Blank / Cold`).
2. Open `Feature Full`, tab **Badge** (or **Pill**), bundle **F14 Badge/Pill fields (Account)**.
3. Item `F14_08` (field `TickerSymbol`, `Badge_Pill_Text__c = {!Rating} account`) shows `{!Rating} account`.

Evidence (local, gitignored): `regression/playwright/output/dev-slds2/features/shots/{badge,pill}_FEAT-01_RF14.png`
and rows `badge_FEAT-01_RF14_F14_08#1` etc. in `features_report.csv`.

## Root cause (`force-app/main/default/lwc/indicatorBundle/indicatorBundle.js`)
`mergeValuesIntoTarget(item, data)` (~line 614) resolves the tokens and writes the result onto the **clone** held in
`this.itemsById[iid]` (`BadgePillTextTemplate` -> `BadgePillText`). A few lines later the label is built with
`resolveBadgePillText(item, ...)` (~line 657), where `item` is the **original wired object** that still holds the raw
`{!Rating} account`. So the merged value is computed and then never read.

Other paths already read the merged clone (`ibi`) or merge separately, which is why they work:
- Hover Text / popover body: reads `ibi?.HoverValue` (merged).
- Extension Badge/Pill Text: merged inline (~line 576) before use.

`FalseBadgePillText` (the inverse label) has the same defect for the same reason; it is read from the same unmerged
`item` inside `resolveBadgePillText`.

## Proposed fix (one line, `regression/findings/badge-pill-merge-token.patch`)
```diff
-  ...resolveBadgePillText(item, dataValue, matchedExtension, displayValue),
+  ...resolveBadgePillText(ibi, dataValue, matchedExtension, displayValue),
```
`ibi` (`this.itemsById[iid]`) is in scope at that call (declared ~line 621 in the same block). Because the clone is a
deep copy of the item, passing it is behavior-neutral when an item has no tokens.

**Status update (2026-10-06):** the one-line fix is applied on `feature/regression-vs-staging-claude` (`indicatorBundle.js`, to be made on `feature/staging-claude` officially), together with a Jest regression test, `indicatorBundle/__tests__/indicatorBundle.badgePillText.test.js` (badge + pill true state, and the inverse label, including a blank field resolving to an empty string). **The 3 tests fail without the fix** (`Received: "Account is {!Name}"`) **and pass with it**; the 14 existing indicatorBundle tests still pass. Still to do: verify in an org by re-running `features.spec.ts`.

**A second fix travels with it:** the comment above `resolveTextShown()` still said "if the field is a Boolean then show the icon", which the code no longer does (Use Field Value shows the value for every field type; confirmed intended with the maintainer). The comment now describes the real behavior. Comment-only change.

**Verify after applying:** re-run `features.spec.ts`; `F14_08` should move from DIFF to PASS on Badge and Pill for
`Feature Full` and `Feature Cold`, and nothing else should change (the Jest test covers the unit-level behavior).

## Related behavior to document (not bugs)
- A `{!Field}` token that points at a **blank** field resolves to an **empty string** (e.g. `Number is []`), it is not
  left as the raw token. Confirmed in the same run (`F15_03`, record `Feature Blank`).
- A false/blank-state Badge or Pill with **no Inverse Badge/Pill Text** still renders an (icon-only) chip. Working as
  designed; worth a note in the field help text and the v0.5.1 Key.
