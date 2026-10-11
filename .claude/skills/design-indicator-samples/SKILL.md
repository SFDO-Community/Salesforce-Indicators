---
name: design-indicator-samples
description: Package-maintainer variant of designing a Salesforce Indicators bundle/item/extension — for building or extending sample and training indicator config inside this package's own source repo (unpackaged/config/sample_*, unpackaged/config/training_Indicators), not for a customer's org. Walks the same purpose-first design interview as design-salesforce-indicator, then generates CSV/CMDT XML using this repo's real force-app source directly and deploys via CumulusCI. Use this when working inside the Salesforce-Indicators package repo itself and asked to add/extend a sample or training indicator, demonstrate a CMDT feature with sample config, or build out second-generation samples for fields/behaviors not yet represented in unpackaged/config. If the target is a customer's own org (package installed, not this source repo), use design-salesforce-indicator instead.
---

# Designing a sample/training indicator (package repo)

This is the package-maintainer counterpart to `design-salesforce-indicator` — same design thinking, different deployment context. If you're not sure which applies: this skill is for building indicator config that ships *inside* this repo (`unpackaged/config/sample_*`, `unpackaged/config/training_Indicators`) as demo/onboarding material for the managed package itself. If the task is instead helping someone configure indicators in their own org where the package is installed, use `design-salesforce-indicator`.

An indicator configuration is four kinds of Custom Metadata Type record (bundle, item, bundle item, extension) that all have to agree with each other to work. Part of what makes this hard is that the data model supports building these records in almost any order — bundle first, item first, extensions added later, all valid — so there's no single mandated sequence to fall back on. Starting from the *purpose* — what should someone glancing at the record instantly understand — rather than from a field already in mind tends to avoid rework, since the purpose determines the object structure, not the other way around.

Read `references/cmdt-schema.md` before or during the interview — it has the authoritative field list, picklist values, and five active validation rules (spanning `Indicator_Item__mdt`, `Indicator_Item_Extension__mdt`, and `Indicator_Bundle_Item__mdt`) worth checking the design against as you go.

## Part 1 — The design interview

Work through these in order. Keep a running plain-language summary as you go — you'll translate it directly into CSV rows in Part 2.

**How to ask, regardless of surface:** if an interactive structured-question tool is available, use it. If it isn't — a plain chat surface with no such widget — don't fall back to a long narrative the maintainer has to comb through to find each question. Batch related questions together instead of asking one at a time, number them, and for each one give a short list of concrete options with a recommended default called out, so they can reply tersely ("1b, 2 default, 3 skip") instead of writing prose or re-reading paragraphs to find what's actually being asked.

### 1. What's the glance-value, and what's it demonstrating?

Same purpose-first question as always ("is this account at risk of churning," not "show the Health_Score__c field") — but here it comes with a second question: **what CMDT capability or field is this sample meant to showcase?** Samples exist to demonstrate the package, often specifically because a "second-generation" field or behavior (click actions, badge styling, date-range extensions, `Advanced_Field__c`, etc.) doesn't have any example in `unpackaged/config` yet. Ask, or check `references/cmdt-schema.md` and the existing samples, what's genuinely undemonstrated before designing something that just duplicates an existing sample's pattern on a different object.

### 2. Which object, and does this belong to an existing sample bundle or a new one?

Every bundle lives on exactly one object's record page. Check the existing sample sets (`sample_AccountContact`, `sample_Lead`, `training_Indicators`) for whether a bundle already exists on the target object, and whether this belongs alongside those indicators or needs its own card.

The same cross-object recycling applies here as anywhere: the component's `mappedField` App Builder property lets a bundle built for one object be dropped onto a related object's page. Since samples are meant to *teach* patterns, demonstrating `mappedField` explicitly (with a comment in the layout config, or called out in whatever training material accompanies the sample) is often more valuable here than it would be in an ordinary customer design. Fill in `Description__c` on every record — internal-only, but it's the only thing that tells a future maintainer (or agent) what a sample record is for and why it exists.

### 3. For each indicator: where does the value come from?

Same rule as always: an item can only key off one field or one relationship path — not a compound condition. If the sample is specifically meant to demonstrate a compound-condition workaround (a formula field feeding an item), build that formula field as part of the sample and document why it exists, rather than skipping the demonstration.

Two sources: a direct field (`Field__c`, bare API name) or a related-record field (`Advanced_Field__c` + `Advanced_Field_Label__c`, up to 5 relationship hops). A third option — no field at all, purely static — is **unverified**; see `references/cmdt-schema.md`'s requiredness notes. Don't build a sample demonstrating this pattern until it's confirmed to actually work.

### 4. What does it look like, and does "has any value" need its own appearance?

Check any proposed icon name against `assets/slds-icons-reference.csv` before writing it anywhere — same trap as the customer-facing skill: an invalid name deploys silently with no icon shown. Offer 2-4 real candidates rather than picking unilaterally.

Same category preference order:
1. `standard:`/`custom:` icons first — these carry a real colored backdrop, so `Icon_Background__c`/`Icon_Foreground__c` both work as expected.
2. An emoji in `Static_Text__c` when no icon is a good conceptual match.
3. `utility:` icons next — foreground color only, never background (see `references/cmdt-schema.md`'s utility-icon caveat).
4. `doctype:`/`action:` icons only on explicit request — they render poorly in this package's base components.

If the design leaves `Static_Text__c` blank, `Empty_Static_Text_Behavior__c` must be set explicitly in the CSV — a validation rule enforces this, and the field's "Use Icon Only" default only applies in the Setup UI, not a blank CSV cell. See `references/cmdt-schema.md`'s validation-rules section.

Then: does a missing/false/zero value need its own distinct look (`Show_False_or_Blank__c` + `Inverse_*` fields), or should it render the same as any other value? This step, and Step 5, are both genuinely optional — a sample demonstrating a plain always-on-look indicator is a legitimate sample too, not every one needs conditional appearance.

### 5. Does the appearance change based on a specific value? (Extensions)

One `Indicator_Item_Extension__mdt` record per distinct rule. String match (`Contains_Text__c` + `Text_Operator__c`), numeric range (`Minimum__c` required even for a min-only rule — see requiredness notes), or a date-range expression (fully supported — write a relative/definite date literal into `Contains_Text__c` with a date-specific operator). `Priority__c` (lower wins) unless `Display_Multiple__c` is set on the item.

### 6. Should clicking it do anything?

URL or Flow Modal, on the bundle item (not the item itself — the same item can have different actions in different bundles). `Action_Confirm_Required__c` for actions that shouldn't fire from an accidental tap. `{!Field_API_Name}` merge tokens work in bundle card text, item/extension hover text, and action target — not in the action button label or help text (see `references/cmdt-schema.md`'s merge-token list).

Given the "unbundled items" section of `cumulusci.yml`'s samples already covers click-action patterns lightly, if this sample is specifically meant to demonstrate click actions, prefer a scenario distinct from what's already there rather than a near-duplicate.

### 7. Where does it sit relative to its siblings?

`Order__c` takes decimals — slot between existing items (`1.5` between `1` and `2`) without renumbering.

## Part 2 — Generating the files

Once the interview settles, write out the concrete plan as CSV rows (bundle / item / bundle item / extension). Show this to the maintainer before generating anything. Sanity-check compound `MasterLabel` values (bundle items, extensions) against the 40-character DeveloperName limit while still in the design conversation — see `references/generation-workflow.md`.

Confirm the sample-set name and save location before generating — working CSVs go in `unpackaged/data/*.csv` (following the existing seed files there), generated XML goes in `unpackaged/config/<sample_set_name>/customMetadata/`. Don't default to scratch space.

Generate via `sf cmdt generate records` against this repo's real `force-app/main/default/objects` (no bundled stub needed here — that's only a customer-org concern), then deploy with `cci task run deploy --path unpackaged/config/<sample_set_name> --org <alias>` — CumulusCI is this repo's established deploy mechanism, preferred over raw `sf project deploy start`. Read `references/generation-workflow.md` for the exact verified commands, the DeveloperName sanitization rules, and CSV formatting gotchas (bare field names, comma-quoting).

If this sample is meant to be a permanent addition (not a one-off test), flag that it needs a `cumulusci.yml` task entry (matching `deploy_sample_indicators`/`deploy_training_indicators`'s pattern) wired into the relevant flow — generating and deploying the CMDT once isn't the finish line for something meant to ship with the package.

Before running any deploy command, show the maintainer the generated file contents and confirm.
