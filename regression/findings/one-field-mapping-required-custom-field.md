# Finding: `OneFieldMappingRequired` rejects every Indicator Item that maps a custom field via the Field picker

**Found by:** dev-only feature tests (bundle `RF18_Dates_Acct`, first bundle in this repo to map a **custom** field,
`Account.Test_Date__c`), 2026-10-06. Diagnosed and fixed in the org by the maintainer; the corrected rule is in this
repo (`Indicator_Item__mdt/validationRules/OneFieldMappingRequired.validationRule-meta.xml`).
**Severity:** functional bug in the shipped validation rule. An admin who picks a custom field in the **Field** picklist
cannot save the Indicator Item, and cannot edit an existing one. Standard fields are unaffected, which is why it was
never seen: every sample/training item in `unpackaged/config` maps a standard field.

## Symptoms
- Deploying an item with `Field__c = Test_Date__c` fails `OneFieldMappingRequired` ("Provide either a picklist selected
  Field or use the Advanced Field...") even though a field **is** provided.
- Bundle Items that point at that item then fail with a **misleading** message:
  `The Indicator Bundle and Indicator Item must belong to the same sObject.` (a downstream cascade: the item never
  saved, so `Indicator_Item__r.sObject__c` is blank).
- With the rule disabled the item saves; querying it shows `Field__c = Account.00NE200001RiXEj` (the field's **durable
  ID**, not the name that was supplied). Re-enabling the rule makes that saved record un-editable.

## Root cause
`Field__c` is a **MetadataRelationship** (to `EntityParticle`), not a picklist, even though it is shown as one. The rule
wrapped it in `TEXT()`, which is only valid for picklists:

```
( ISBLANK(Advanced_Field__c) && ISBLANK(TEXT(Field__c)) ) || ( NOT(ISBLANK(Advanced_Field__c)) && NOT(ISBLANK(TEXT(Field__c))) )
```

For standard fields this happened to evaluate as expected; for a custom field (whose stored value is a durable ID such as
`Account.00NE200001RiXEj`) `TEXT(Field__c)` came back blank, so the rule saw "no field mapping" and fired.

## Fix (verified in the org by the maintainer)
Drop the `TEXT()` conversion:

```
( ISBLANK(Advanced_Field__c) && ISBLANK(Field__c) ) || ( NOT(ISBLANK(Advanced_Field__c)) && NOT(ISBLANK(Field__c)) )
```

After the change, deploying `Field__c = Test_Date__c` works: Salesforce converts the API name to the durable ID on save, so
**no durable ID has to be known at load time and the Advanced Field workaround is not needed.**

## What this corrects in our own earlier reasoning
Two theories were tried and were **wrong**: (1) field-level security hiding the field from the deploying user, and
(2) the value needing the qualified `Account.Test_Date__c` form. FLS is still needed for the *dataset load* (records
cannot be inserted without it), but it was unrelated to this error.

## Still worth checking (not yet tested)
- `Numeric_Missing_Minimum` and `String_Missing_Contains_Text` (Extension rules) read `Indicator_Item__r.Field__r.DataType`.
  They did not fire for the Date field, but a custom **Number** or **Text** field with an extension has not been
  exercised. A small feature bundle on custom Number/Text fields would cover it.
- Add a custom-field item to a sample/training bundle so this path is covered by something that ships.
