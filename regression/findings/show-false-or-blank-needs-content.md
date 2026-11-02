# Proposal: a validation rule so "Show False or Blank" always has something to show

**Status:** SHIPPED on `feature/staging-claude` (commit `0c0837b`) as `Show_False_Or_Blank_Needs_Content`, tag `II_08`, at `force-app/main/default/objects/Indicator_Item__mdt/validationRules/`. The proposed XML copy was deleted; the formula and message below are unchanged. `B00` / `RB02c_B00` are now `prod-only` and case `S01` expects `fail`.
**Found by:** the phase-1 known issue `B00` (`RB02c`, Contact `DoNotCall`): an Item with **Show when False or Blank** checked and no Inverse value at all.
**Tested:** 2026-10-28 on `Salesforce-Indicators__regression_dev_slds2-light` (check-only; nothing saved).

## What happens today
With Show False or Blank on and no Inverse Static Text, Icon, Image, Badge/Pill Text or Hover Text, the false/blank state still renders an indicator: the generic fallback icon `standard:default`
(alt text "Do Not Call indicator"). v0.4 drew a blank avatar. Measured in the capture data: not an empty slot (the "empty slots" count is 0) and not collapsed; one extra visible icon.
The same icon appears for a matched Extension rule that has no content (`C00`) and for an Item with only Hover Text (the team agreed to keep that icon). The admin never asked for the icon,
so this is almost always a configuration mistake the form could catch.

## Proposed rule (`Indicator_Item__mdt`)
File: `force-app/main/default/objects/Indicator_Item__mdt/validationRules/Show_False_Or_Blank_Needs_Content.validationRule-meta.xml` (originally proposed as `ShowFalseOrBlankNeedsContent`)

```
Show_False_or_Blank__c &&
ISBLANK( Inverse_Static_Text__c ) && ISBLANK( Inverse_Icon_Value__c ) && ISBLANK( Inverse_Image__c ) &&
ISBLANK( Inverse_Badge_Pill_Text__c ) && ISBLANK( Inverse_Hover_Text__c )
```
Message: "Show False or Blank is checked but no Inverse value is set. Add an Inverse Icon, Static Text, Image, Badge/Pill Text or Hover Text, or clear the checkbox." Error shown on the checkbox.
Hover Text counts as content on purpose: an Inverse that has only hover text is a deliberate choice (it gets the fallback icon so the popover has something to hover).

## Evidence
`planning/validation/cases.csv` gained `S01`-`S06` (and four columns: `Show_False_or_Blank`, `Inverse_Static_Text`, `Inverse_Hover_Text`, `Inverse_Badge_Pill_Text`; `run_validation_tests.py` builds them).
- Rules currently in the org: 69 PASS, 6 open gaps. `S01` (no Inverse value) is a **gap** (accepted today); `S02`-`S06` (icon only, text only, hover only, Badge/Pill text only, checkbox off) are accepted.
- With the candidate rule applied (`--rules`): 69 PASS, 5 open gaps, **`S01` closes** with the new message. Nothing else changed, so the rule does not reject the valid cases.
- `scan_records_against_rules.py` with the candidate, all seven record sets: **one** new rejection, regression `Indicator_Item.B00` (the case this rule exists for). Zero new rejections in `sample_AccountContact` (43),
  `pipeline_Lead` (22), `regression_dev_only` (127), `sample_Lead` and `training_Indicators`. Caveat: `sample_Lead` (34) and `training_Indicators` (23) already fail other rules, and a record that fails one rule reports only
  one error, so the scan cannot prove those two sets are free of this problem.

## Rollout (done)
- `B00` and its bundle item `RB02c_B00` moved to `prod-only` (`env` in `planning/indicators.csv`, XML in `prod_only/customMetadata`). It still documents what v0.4 does (a blank avatar); dev orgs lose that item, so `RB02c` has one fewer indicator there and the prod-only count for that bundle is 3.
- `planning/validation/cases.csv`: `S01` changed from `gap` to `fail` (it is now rejected with the new message), and the `rule` column uses the new names.
- Customers: an existing Item saved with Show False or Blank on and no Inverse value is rejected the next time it is edited (not on upgrade). Still to do: list it in the release notes (`TODO.md` 1.2) and in the upgrade check (`TODO.md` 3.3: a plain SOQL query finds these items).
