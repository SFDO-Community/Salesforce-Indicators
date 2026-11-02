# Finding: the type-driven Extension validation rules silently skip custom fields (and formula fields cannot be checked at all)

**Found by:** a manual test of the new `DateFieldRequiresDateOperator` rule (case `D01`, a `Contains` operator on a date field was accepted), then the check-only suite
`regression/scripts/run_validation_tests.py` with new cases `D01`-`D06`, `C01`-`C18`, 2026-10-26, `Salesforce-Indicators__regression_dev_slds2` (SLDS2 light).
**Severity:** validation gap. An admin who maps an Item to a **custom** field (the common case) could save an Extension that does not fit the field type, and four rules that were
believed to be working did nothing for those fields. Most visible consequence: a text rule on a custom Number or Checkbox field, the configuration that crashed the v0.4 component.
**Status:** fixed in this repo and verified in the org (rules redeployed by the maintainer, suite re-run); SHIPPED on `feature/staging-claude` (the `LOWER()` rules are in `force-app`; renamed and tagged in `0c0837b`, see `CLAUDE.md`). Formula fields are an open, documented limitation.

## What happens
Four rules on `Indicator_Item_Extension__mdt` branch on `Indicator_Item__r.Field__r.DataType`:
`DateFieldRequiresDateOperator`, `NoExtensionOnCheckboxField`, `Numeric_Missing_Minimum`, `String_Missing_Contains_Text`.
They were written and tested against **standard** fields (`integer`, `string`, `boolean`...) and compare to those exact lowercase strings. For a **custom** field the rule engine returns a
different string, so the condition is false and the rule never fires. Example: `Contains` on custom `Account.Test_Date__c` was accepted (`D01`), but rejected on the standard `Contact.Birthdate` (`D04`).

## Reproduce
1. Org with the dev-only fields deployed (`regression/dev_only/objects/Account/fields/Test_*__c`) and the permission set assigned.
2. Run `python regression/scripts/run_validation_tests.py --org <alias>` with the OLD rules in the org (or a scratch package with the old rules, see below).
3. `C01`-`C04`, `C07`-`C13`, `C14`-`C16`, `D01`, `D06` are accepted; the standard-field twins (`D04`, `E05`, `E10`...) are rejected.

Evidence (local, gitignored): `regression/playwright/output/validation/<org>/validation_report.csv`, `raw_*.json`.

## Root cause
`Field__c` is a MetadataRelationship to `EntityParticle`, but the string a validation rule sees in `Field__r.DataType` is **not** what SOQL returns for `EntityParticle.DataType`.
Proven with check-only diagnostic packages (one rule per candidate string, each with its own message; the failure list names the match; nothing is saved):

| Field | SOQL `EntityParticle.DataType` | `FieldDefinition.DataType` | What the rule engine sees |
|---|---|---|---|
| standard Number (`NumberOfEmployees`) | `integer` | `Number(8, 0)` | `integer` |
| standard Text (`AccountNumber`) | `string` | `Text(40)` | `string` |
| custom Number (18,0) and Decimal (16,2) | `double` | `Number(18, 0)` | `number` |
| custom Text | `string` | `Text(80)` | `text` |
| custom Long Text Area | `textarea` | `Long Text Area(32768)` | `longtextarea` |
| custom Rich Text Area | `textarea` | `Rich Text Area(32768)` | `richtextarea` |
| custom Checkbox | (not queried) | `Checkbox` | `boolean` |
| custom Date | `date` | `Date` | `date`; an exact-case `'Date'` matched and exact `'date'` did not (the maintainer's manual test, matching the suite) |
| custom Date/Time, Multi-Select Picklist | | | matched the existing `datetime` / `multipicklist` entries |
| **formula Number and formula Text** | `double` / `string`, `IsCalculated = true` | `Formula (Number)` / `Formula (Text)` | **`formula` for both** |

The comparison is case-sensitive, so capitalisation mattered too (the date case). **Why the engine resolves a different value than SOQL is not known**; the two Salesforce help pages on
metadata relationships and validation do not say (the maintainer checked). Mark the table as observed behaviour, not documented behaviour.

A formula field cannot be narrowed: `Precision`, `Length` and `IsCalculated` do not exist on `Field__r` inside a rule (probed: "Field ... does not exist").

## Fix
Applied in `force-app/main/default/objects/Indicator_Item_Extension__mdt/validationRules/`:
- all four rules now compare `LOWER( Indicator_Item__r.Field__r.DataType )`;
- `Numeric_Missing_Minimum` gained `number`; `String_Missing_Contains_Text` gained `text`, `longtextarea`, `richtextarea`.
- **Not changed:** formula fields. Adding `formula` to the numeric list would reject valid text Extensions on a formula field and vice versa. `UnknownConditions` still catches "both kinds of criteria" or "neither".

Failing first, then passing: the cases above are the test. The old rules were run in a scratch package against the new cases (all custom-field cases accepted), and the new rules in the org rejected them.

## Verified how
Check-only deploys on `Salesforce-Indicators__regression_dev_slds2`, final run after all rules were redeployed: **64 PASS, 0 FAIL, 5 documented gaps open** (`I13`, `G03`, `G04`, `C17`, `C18`).
Positives (every `expect=pass` case, incl. valid custom Number/Text, Before Start on standard date) all accepted, so a rule that rejects everything is ruled out.
`E02` (operator without a value) now reports `DateFieldRequiresDateOperator` before `MatchOperatorRequiresValue` on a date item; the case was retargeted to the advanced-field item so it still tests one rule.

## What is still unknown / not covered
- **Formula fields (`C17`, `C18`)**: documented gap; a numeric rule on a formula Number with a Maximum only (never matches in the LWC) or a text rule on a formula Number is accepted. The LWC does not crash (string compare uses `String(...)`), but I did not add a formula item to the feature specs.
- A possible follow-up is an Apex "upgrade check" that reads the real return type from `EntityParticle` (`double`/`string`, `IsCalculated`) and flags a formula item whose Extension looks wrong (`TODO.md` 3.3).
- Not tried as custom fields: Time, Lookup, Geolocation, Auto Number, Encrypted Text, custom Picklist with a record type, Currency in a multi-currency org.
- The exact-case rows of one diagnostic (`Formula`, `Number`) were affected by case-insensitive Windows folder names (later folders overwrote earlier ones), so they are probable, not proven; the `LOWER()` rows are clean.
- Only SLDS2 light was run; the rule behaviour is metadata-level and theme-independent, but the other orgs were not exercised.

## Corrects earlier reasoning
- `validation-type-rules-never-fire.md` said the SOQL `EntityParticle` values are what the rules see and called the candidate fix validated. It was validated on **standard fields only**. A note pointing here was added to that finding.
- `references/validation-rules.md` and `CLAUDE.md` said the rules read "lowercase describe types". Both are updated to the standard-vs-custom picture and the diagnostic method.
- The first diagnostic (a `Formula`-less candidate list) and one rerun gave misleading "no hit" rows (an unlowered `=` and a deploy that never ran because of a stray carriage return in a folder name). Both were rerun with the status printed.
