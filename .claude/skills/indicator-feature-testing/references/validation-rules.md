# Validation-rule tests

Custom Metadata validation rules run when records are saved or deployed. They are tested with **check-only deploys** (`sf project deploy start --dry-run`: validate, then roll back; **nothing is saved**).
Each deploy is a call against an org: ask first.

## Two tools
- `regression/scripts/run_validation_tests.py --org <alias> [--rules <dir>]` builds Metadata API packages from `regression/planning/validation/cases.csv` (one row per case, `expect` = `pass`, `fail` or `gap`) plus a shared set of
  VALID parent bundles and items (`VT_B_*`, `VT_I_*`) so a child never fails because its parent did. Two deploys: **positives** must succeed; **negatives** must fail and the componentFailures list says which record was rejected and why
  (a record absent from it was *accepted*). Results: `PASS`, `FAIL`, `WRONG_RULE`, `GAP_OPEN` (a documented hole is still open), `GAP_CLOSED` (a rule now covers it: change the case to `expect=fail`).
- `regression/scripts/scan_records_against_rules.py --org <alias> --rules <dir> --sets <names>` answers *would a rule change reject a record this repo ships?* It packages real record sets (`sample_*`, `training_Indicators`,
  `pipeline_Lead`, `regression_base`, `regression_dev_only`, `regression_prod_only`), strips CumulusCI tokens and compares check-only deploys with and without candidate rules (`NEW_FAIL` = the change would break it). Per-set reports.

## Try a rule change before committing it
Put candidate rule files in source format under `<dir>/<Object>__mdt/validationRules/*.validationRule-meta.xml` (the proposed set lives in `regression/findings/proposed-validation-rules/`). `--rules <dir>` applies them **inside the same
rolled-back deploy**, so the org keeps its original rules (verify: `sf data query -t -q "SELECT ValidationName FROM ValidationRule WHERE EntityDefinition.QualifiedApiName='Indicator_Item_Extension__mdt'"`). A change that rejects shipped
records must be paired with moving those records (this is how three regression extensions became `prod-only`).

## Facts that matter when writing or changing rules
- `Field__c` is a **MetadataRelationship to `EntityParticle`** (not a picklist): do not wrap it in `TEXT()` (a custom field's stored value is a durable id and `TEXT()` returned blank). `Indicator_Item__r.Field__r.DataType` holds
  **lowercase describe types**: `string`, `textarea`, `phone`, `email`, `url`, `picklist`, `multipicklist`, `combobox`, `integer`, `int`, `long`, `double`, `currency`, `percent`, `boolean`, `date`, `datetime`. Compare with those, not `Number`/`Text`.
- An omitted picklist field takes its **default** (`Empty_Static_Text_Behavior__c` defaults to `Use Icon Only`), so a rule that wants it blank cannot be triggered by deploy.
- A rejected parent makes its children fail with a misleading message ("Bundle and Item must belong to the same sObject"); look for the root-cause record, not the cascade.
- Date literals (`LAST MONTHS`, free text) are **not** validated and cannot be (no triggers on CMDT); documented as known gaps `G03`/`G04`.
- The rules (16 today): Bundle `ObjectRequired`; Item `ObjectRequired`, `OneFieldMappingRequired`, `IconMustMatchSLDS`, `IconInverseMustMatchSLDS`, `FallbackIconRequiredForImage`, `FallbackIconRequiredForInverseImage`, `EmptyStaticTextMustHaveBehavior`;
  Extension `MatchOperatorRequiresValue`, `UnknownConditions`, `Numeric_Missing_Minimum`, `String_Missing_Contains_Text`, `NoExtensionOnCheckboxField`, `IconMustMatchSLDS`, `FallbackIconRequiredForImage`;
  Bundle Item `Action_Type_Requires_Target`, `Bundle_and_Item_Different_sObjects`.
- Adding a case: add a row to `cases.csv` (reference an existing org item by DeveloperName for type-driven cases, or a `VT_I_*` parent), run the tool, read `validation_report.csv`.
