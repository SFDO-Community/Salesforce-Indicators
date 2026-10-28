# Proposal: a validation rule so "Show False or Blank" always has something to show

**Status:** proposal, tested with check-only deploys; **not** added to `force-app`. Needs a maintainer decision (`TODO.md` 1.6).
**Found by:** the phase-1 known issue `B00` (`RB02c`, Contact `DoNotCall`): an Item with **Show when False or Blank** checked and no Inverse value at all.
**Tested:** 2026-10-28 on `Salesforce-Indicators__regression_dev_slds2-light` (check-only; nothing saved).

## What happens today
With Show False or Blank on and no Inverse Static Text, Icon, Image, Badge/Pill Text or Hover Text, the false/blank state still renders an indicator: the generic fallback icon `standard:default`
(alt text "Do Not Call indicator"). v0.4 drew a blank avatar. Measured in the capture data: not an empty slot (the "empty slots" count is 0) and not collapsed; one extra visible icon.
The same icon appears for a matched Extension rule that has no content (`C00`) and for an Item with only Hover Text (the team agreed to keep that icon). The admin never asked for the icon,
so this is almost always a configuration mistake the form could catch.

## Proposed rule (`Indicator_Item__mdt`)
File: `findings/proposed-validation-rules/Indicator_Item__mdt/validationRules/ShowFalseOrBlankNeedsContent.validationRule-meta.xml`

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

## If the rule ships
- `B00` can no longer deploy to dev orgs. Move it (and its bundle item `RB02c_B00`) to the `prod_only` set (`env` column in `planning/indicators.csv`) like the other records the newer rules reject; dev then loses that item, and `RB02c` shows one fewer indicator there.
- Customers: an existing Item saved with Show False or Blank on and no Inverse value would be rejected the next time it is edited (not on upgrade). That is the same exposure as the other new rules; list it in the release notes and in the upgrade check (`TODO.md` 3.3: a plain SOQL query finds these items).
- To apply: copy the file to `force-app/main/default/objects/Indicator_Item__mdt/validationRules/`, deploy, run `run_validation_tests.py` (expect `S01` to become `PASS`: change its `expect` from `gap` to `fail`).
