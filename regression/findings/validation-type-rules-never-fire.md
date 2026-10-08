# Finding: the two type-driven Extension validation rules can never fire

**Found by:** the new validation-rule test suite (`regression/scripts/run_validation_tests.py`,
`regression/planning/validation/cases.csv`), 2026-10-08, against a scratch org built from this branch (SLDS1 org).
**Severity:** functional gap in shipped validation. An admin can save an Extension whose criteria do not fit the item's field type.
For a **text rule on a number or checkbox field** that is exactly the configuration that crashes the v0.4 component
(`o.toLowerCase is not a function`). Nothing in the rules stops it.

## What happens
Two rules on `Indicator_Item_Extension__mdt` exist to match the extension's criteria to the item's field type:

| Rule | Intent |
|---|---|
| `Numeric_Missing_Minimum` | a Number / Currency / Percent field needs a Minimum |
| `String_Missing_Contains_Text` | a Text / Picklist field needs a Contains Text value |

In the test suite (47 cases) **both are dead**: Number-field with Maximum only (`E05`), Currency with Maximum only (`E09`),
Text-field with a numeric rule only (`E10`), a text rule on a Number field (`E06`) are all **accepted**; a Picklist
extension with no value (`E11`) is rejected, but by a different rule (`UnknownConditions`), not the one meant to catch it.

## Root cause
Both rules read `Indicator_Item__r.Field__r.DataType` and test it with `CONTAINS(..., 'Number' | 'Currency' | 'Percent' | 'Text' | 'Picklist')`.
`Field__c` is a MetadataRelationship to **`EntityParticle`**, whose `DataType` holds lowercase *describe* types, not the
`FieldDefinition` vocabulary (`Number(18, 0)`, `Text(40)`, ...) the strings were written for. Actual values in the test org:

| Field | `EntityParticle.DataType` | rule looks for |
|---|---|---|
| `Account.NumberOfEmployees` | `integer` | `Number` |
| `Account.AnnualRevenue` | `currency` | `Currency` |
| `Account.AccountNumber` | `string` | `Text` |
| `Account.Rating` / `Industry` | `picklist` | `Picklist` |
| `Account.Description` | `textarea` | `Text` |
| `Contact.DoNotCall` | `boolean` | (nothing: checkbox is not covered at all) |
| `Account.Test_Date__c` | `date` | (n/a) |

None of the left-hand values can ever match the right-hand strings, so the rules never fire. (Mechanism inferred from the data and
confirmed by behaviour: every case that depends on these rules is accepted. I did not separately test whether `CONTAINS` is case-sensitive,
because `integer`/`string` do not contain `Number`/`Text` in any case.)

## Fix (validated; APPLIED in this repo, not yet in `staging-claude`)
Rewrite both rules to compare `DataType` with the real values, and add one new rule so a checkbox cannot carry an extension at all:
`regression/findings/proposed-validation-rules/Indicator_Item_Extension__mdt/validationRules/`
(`Numeric_Missing_Minimum`, `String_Missing_Contains_Text`, and the **new** `NoExtensionOnCheckboxField`). These files are now also in `force-app/.../Indicator_Item_Extension__mdt/validationRules/`, together with a one-character fix to `MatchOperatorRequiresValue`'s message (a stray `)`).

**The new checkbox rule was approved by the maintainer** (a checkbox has nothing to match; the item's own True/False settings do that job).

### Validated with check-only deploys (nothing was saved to the org)
The candidate rules were applied **inside the same validate-and-roll-back deploy** as the test records. Afterwards the org still held the
original six rules and no `NoExtensionOnCheckboxField`.

| | Current rules | Candidate rules |
|---|---|---|
| Must-pass cases accepted | 19 / 19 | 19 / 19 |
| Must-fail cases rejected by the right rule | 16 / 21 (`E05`, `E06`, `E09`, `E10` accepted; `E11` wrong rule) | **21 / 21** |
| Checkbox gaps (`G01`, `G02`) | open | **closed** |
| Still open | `I13`, `G03`, `G04` | `I13`, `G03`, `G04` |

## Still open after the fix (not covered by any rule)
- **`G03` / `G04` -- date literals are never validated.** `LAST MONTHS` (typo) or `banana` on a Date field is accepted; the Apex
  parser rejects it quietly and the extension is then treated as text that never matches. A formula cannot parse the literal list
  practically; this is better caught in Apex or by a picklist/helper in the setup UI.
- **`I13` -- `EmptyStaticTextMustHaveBehavior` is not reachable by deploy.** `Empty_Static_Text_Behavior__c` has a default
  (`Use Icon Only`), so omitting it deploys with the default and the rule never sees a blank. It may still fire in the UI; not tested there.
- `MatchOperatorRequiresValue`'s message ends with a stray `)` ("...Text/Date Value must be assigned)").

## How to re-run
```bash
python regression/scripts/run_validation_tests.py --org <alias>                      # current rules in the org
python regression/scripts/run_validation_tests.py --org <alias> --rules regression/findings/proposed-validation-rules   # candidate rules
```
Both use `sf project deploy start --dry-run`; results in `regression/playwright/output/validation/<alias>[__candidate]/validation_report.csv`.
To add a case, add a row to `planning/validation/cases.csv` (`expect` = `pass`, `fail`, or `gap`).

## Knock-on effect on the regression records (done)
Applying the corrected rules rejects three deliberate "bad configuration" regression extensions that only deployed because the rules were dead:
`E_num_max_X1` (Number, Maximum only), `E_num_on_text_X1` (numeric rule on a text field), `K_txtrule_chk_X1` (text rule on a checkbox, the v0.4 crash).
They are now `env=prod-only` in `planning/extensions.csv` (like `K_txtrule_num_X1` already was) and their XML moved to `regression/prod_only/customMetadata`, so
`regression_dev` still deploys cleanly and `regression_prod` keeps documenting the v0.4 behaviour. Effect on the oracle: prod unchanged; dev changes in exactly two rows
(bundle `RB13b`, records `CON-01`/`CON-03`: `COMPONENT ERROR` becomes "no rule match"). After the change the base set (339 records) is accepted under both rule sets.
`EmptyStaticTextMustHaveBehavior` stays as is (redundant but kept, by decision).
