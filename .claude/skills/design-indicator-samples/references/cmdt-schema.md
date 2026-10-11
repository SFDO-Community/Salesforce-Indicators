# Indicator CMDT schema reference (package-repo edition)

This is the package-maintainer variant of this reference — field names below are **unprefixed**, matching `force-app/main/default/objects/*` and `unpackaged/data/*.csv`, the actual source-of-truth conventions in this repo. If you ever need the customer-org (`inds__`-prefixed) version of this same content, see the `design-salesforce-indicator` skill's copy instead — the two are kept in sync by hand, not by reference, so if you're editing one for a schema change, edit both.

**Maintainers:** if a field is added, removed, or renamed on any `Indicator_*__mdt` object, this file's tables need a manual update to match — there's no stub-regeneration step for this variant, since it reads `force-app` directly (see `references/generation-workflow.md`). The `maintain-indicator-objects-reference` skill only maintains the *other* skill's namespaced stub copy.

### Namespace conventions in this repo

Three different contexts use three different conventions for the same underlying names — worth being precise about which applies where:

1. **`force-app/main/default/objects/*` and `unpackaged/data/*.csv`** (this file's default) — plain unprefixed names (`Card_Title__c`), since SFDX source format strips the namespace and CumulusCI injects it at build/push time.
2. **`unpackaged/config/*`** (sample/training indicator deploys) — CumulusCI's namespace-injection tokens instead of a literal prefix: `%%%NAMESPACE%%%` inside file *content* (e.g. `<field>%%%NAMESPACE%%%Active__c</field>`) and the filename-safe `___NAMESPACE___` inside file *names* (e.g. `___NAMESPACE___Indicator_Bundle.Lead_Company_Info.md-meta.xml`). These are two different tokens for the same substitution, not interchangeable.
3. **A customer's installed-package org** — literal `inds__` prefix. Not the primary case for this skill, but relevant if a design is being tested by deploying straight to a scratch/dev org via `cci org` rather than through `unpackaged/config`.

Separately from namespace-*prefixing*, keep these distinct too:

- **A relationship value that points at another Indicator CMDT record** (`Indicator_Bundle__c`, `Indicator_Item__c` on bundle items and extensions) is always a **plain, unprefixed DeveloperName** (`Account_Company_Info`), regardless of which of the three contexts above you're in — this is standard Salesforce behavior for `MetadataRelationship` values.
- **A value that points at a field or object *outside* the Indicator CMDT objects** (`Field__c`, `Advanced_Field__c`, `sObject__c`) names a real field/object on the target org. If it belongs to a *different* installed managed package (relevant when a sample references, say, an NPSP field), the value needs *that* package's namespace prefix regardless of context — nothing to do with `inds`/CumulusCI injection at all.

Contents:
- [Indicator_Bundle\_\_mdt](#indicator_bundlemdt)
- [Indicator_Item\_\_mdt](#indicator_itemmdt)
- [Indicator_Bundle_Item\_\_mdt](#indicator_bundle_itemmdt)
- [Indicator_Item_Extension\_\_mdt](#indicator_item_extensionmdt)
- [Validation rules to design around](#validation-rules-to-design-around)
- [Merge tokens — where {!Field_Api_Name} actually resolves](#merge-tokens--where-field_api_name-actually-resolves)
- [Practical requiredness beyond the schema](#practical-requiredness-beyond-the-schema)
- [Text vs. date matching](#text-vs-date-matching)

## Indicator_Bundle__mdt

One record = one card on a record page for one object. `DeveloperName` is the bundle's dev name, referenced by bundle items.

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `Active__c` | Checkbox | no | `true` | Unchecking hides the entire card, including all its items. |
| `sObject__c` | Text (object API name) | no | — | The object whose data this bundle's items read from, e.g. `Account`, `Custom_Object__c`. This is not necessarily the same object the bundle gets *placed on* — see the recycling note below. |
| `Card_Title__c` | Text(255) | no | — | Card header title. |
| `Card_Text__c` | Text(255) | no | — | Text shown above the indicators. Supports `{!Field_API_Name}` merge tokens resolved against the record. |
| `Card_Icon__c` | Text(255) | no | — | SLDS icon name, e.g. `standard:account`. |
| `Card_Icon_Background__c` | Text(255) | no | — | CSS/SLDS override for the card icon's background. |
| `Card_Icon_Foreground__c` | Text(255) | no | — | CSS/SLDS override for the card icon's foreground. |
| `Description__c` | Long Text Area | no | — | Internal notes only — never shown to end users. Good place to record *why* this bundle exists. |

A special bundle dev name **`-1`** is reserved by the package for "Unbundled Items" — items not assigned to any bundle via a bundle item still render if a page is configured to show that view. Don't create a real bundle record named `-1`.

**Recycling a bundle onto a related object's page** (confirmed in `indicatorBundle.js-meta.xml`): the component has a `mappedField` App Builder property — "provide the API Name of a field on this object which holds a Record Id or Relationship Id" — so an Account-scoped bundle (`sObject__c = Account`) can be dropped directly onto a *Contact* page layout by setting `mappedField` to `AccountId`; the component then reads the related Account record instead of the Contact. This is a page-layout-time choice, not a CMDT field, but it's worth surfacing during design: if the same data point needs to show on both an Account page and its Contacts' pages, one bundle placed twice (with `mappedField` set on the Contact placement) is usually better than building near-duplicate bundles for both objects. Multiple bundles can also coexist on one page — different cards for different groupings, or the same page showing different bundles to different audiences via page/component visibility rules (e.g. a Sales-facing bundle vs. a Service-facing one), which is again an App Builder concern layered on top of the CMDT design, not something the CMDT records themselves control.

## Indicator_Item__mdt

One record = one indicator's data source plus how it's drawn. `DeveloperName` is referenced by bundle items and by extensions.

| Field | Type | Notes |
|---|---|---|
| `Active__c` | Checkbox, default `true` | Unchecking hides just this item (bundle and other items unaffected). |
| `sObject__c` | Text | Object this item applies to. Must match the bundle's `sObject__c` if you join them (see validation rules below) — the exception is when the item traverses a relationship via `Advanced_Field__c`. |
| `Field__c` | Text (bare field API name) | The direct field on `sObject__c`, e.g. `AnnualRevenue`, `Custom_Field__c`. **No object prefix** — `Lead.AnnualRevenue` is wrong, `AnnualRevenue` is right. Use `Advanced_Field__c` instead when the value lives off a related record. |
| `Advanced_Field__c` | Long Text Area | A relationship path up to 5 levels for pulling a value off a related record, e.g. `Contact.Account.Owner.FirstName`. Use instead of `Field__c` when the data point lives off the record. |
| `Advanced_Field_Label__c` | Text(255) | Label shown for an Advanced Field (Advanced Fields don't have package-resolvable labels the way direct fields do). |
| `Static_Text__c` | Text(255) | Fallback/override text shown instead of the field's raw value. Only the first ~3 characters (or one emoji) render, so this is for short glyphs/badges, not sentences. |
| `Icon_Value__c` | Text(255) | SLDS icon name to show for this item's default state. |
| `Image__c` | Text(255) | Image URL to show instead of an icon. |
| `Icon_Background__c` / `Icon_Foreground__c` | Text(255) | Color overrides for the icon — **but see the utility-icon caveat below before proposing a background color.** |
| `Hover_Text__c` | Text(255) | Tooltip text. Supports `{!Field_API_Name}` merge tokens — see the consolidated merge-token list below. |
| `Show_False_or_Blank__c` | Checkbox, default `false` | Turns on the *inverse* appearance (the `Inverse_*` fields below) whenever the source value is `false`, `null`, or blank. Leave off if a false/blank value should just render like any other falsy value with no special treatment. |
| `Inverse_Static_Text__c` / `Inverse_Icon_Value__c` / `Inverse_Image__c` / `Inverse_Icon_Background__c` / `Inverse_Icon_Foreground__c` / `Inverse_Hover_Text__c` | Text(255) each | Mirror the non-inverse fields, used only when `Show_False_or_Blank__c` is checked and the value is false/blank. |
| `Zero_Behavior__c` | Picklist: `Treat Zeroes as Numbers` / `Treat Zeroes as Blanks` | Only matters for numeric fields — decides whether `0` counts as "blank" for the inverse-state logic above. |
| `Empty_Static_Text_Behavior__c` | Picklist: `Use Icon Only` (default) / `Use Field Value` | What to render when `Static_Text__c` is blank and the field is empty. |
| `Display_Multiple__c` | Checkbox, default `false` | For multi-select picklist fields: show every matching Extension simultaneously instead of just the highest-priority match. |
| `Badge_Icon_Position__c` | Picklist: `start` / `end` | Badge-style only — icon position relative to the badge text. |
| `Badge_Text_Color__c` | Text(255) | Badge-style only — CSS color for the badge's text. |
| `Inverse_Badge_Icon_Position__c` / `Inverse_Badge_Text_Color__c` | same as above | Inverse-state equivalents. |
| `Description__c` | Long Text Area | Internal notes only. |

**Utility icons and `Icon_Background__c` — confirmed via `indicatorBundleItem.css`/`indicatorBundleBadge.js`:** `Icon_Background__c` feeds into the `--slds-c-icon-color-background` CSS custom property, which only has a visible effect on **standard** and **custom** icons — those categories render as a glyph inside an actual filled circular/square backdrop, so the background color genuinely shows. **Utility icons render as a bare outline glyph with no backdrop shape at all**, so setting `Icon_Background__c` on a utility icon has no visible effect — there's no container for that color to paint. Only `Icon_Foreground__c` (the glyph's own stroke color) is visible for a utility icon, and it renders against whatever the *actual* surrounding container happens to be (the avatar circle's real background, or the badge/pill's real background) — not against whatever value was put in `Icon_Background__c`. Setting a white `Icon_Foreground__c` on a utility icon while assuming a colored `Icon_Background__c` would show behind it produces exactly the invisible white-on-white failure this was confirmed against in testing. When proposing colors for a utility icon, only discuss `Icon_Foreground__c`, and pick something that contrasts against the actual container background (SLDS's own theme/utility color tokens are safer defaults here than an arbitrary hex), not an imagined backdrop.

Note: the **avatar/badge/pill visual style** (`indsStyle`) is *not* a CMDT field — it's a property set per-component-instance in Lightning App Builder / Experience Builder when the admin drops the indicator component on a page. The same bundle can be displayed as an avatar on one page and a pill on another. Don't ask the user to pick a style as part of the CMDT design — mention it's a page-layout-time choice.

## Indicator_Bundle_Item__mdt

The join between one bundle and one item, plus that item's click-action behavior *in the context of this bundle* (the same item can have different actions in different bundles).

| Field | Type | Required | Notes |
|---|---|---|---|
| `Indicator_Bundle__c` | Text (DeveloperName) | **yes** | The bundle's dev name. |
| `Indicator_Item__c` | Text (DeveloperName) | **yes** | The item's dev name. |
| `Order__c` | Number(4,2) | no | Display order within the card. Use decimals (`1.5`) to slot a new item between two existing ones without renumbering everything. |
| `Action_Type__c` | Picklist: `Flow Modal` / `URL` | no | Leave blank for no click action. |
| `Action_Target__c` | Text(255) | required if `Action_Type__c` is set | A URL, or a Screen Flow's API name. Supports `{!Field_API_Name}` merge tokens resolved against the record at click time. |
| `Action_Button_Label__c` | Text(255) | no | Button label shown in the hover popover. Defaults to "Open" (URL) or "Launch" (Flow Modal) if left blank. |
| `Action_Help_Text__c` | Text(255) | no | Text shown behind a help icon next to the action button in the hover popover. |
| `Action_Confirm_Required__c` | Checkbox, default `false` | no | When checked, clicking the indicator itself does nothing — the user must open the hover popover and click the action button. Use this for actions you don't want fired by an accidental tap. |
| `Show_False_or_Blank_Action__c` | Checkbox, default `false` | no | Keeps the click action available even while the item is showing its false/blank (inverse) appearance. |

## Indicator_Item_Extension__mdt

A per-item override rule: when a record's value matches this rule, swap in different display values for that item. An item can have many extensions; the one that matches (lowest `Priority__c`) wins, unless the item has `Display_Multiple__c` checked.

| Field | Type | Notes |
|---|---|---|
| `Indicator_Item__c` | Text (DeveloperName), **required** | The item this rule extends. |
| `Active__c` | Checkbox, default `true` | |
| `Contains_Text__c` | Text(255) | Dual-purpose, resolved by what it parses as (see [Text vs. date matching](#text-vs-date-matching) below): a literal string to match, **or** a relative/definite date expression. |
| `Text_Operator__c` | Picklist: `Equals`, `Does Not Equal`, `Contains`, `Starts With`, `Before Start`, `After End`, `Before End`, `After Start` | Which operators are valid depends on whether `Contains_Text__c` resolved to a string or a date — see below. Two additional picklist values, `After` and `Before`, are inactive/legacy and shouldn't be offered to users. |
| `Minimum__c` | Number(18,3) | Inclusive lower bound (`>=`) for numeric-range matching. |
| `Maximum__c` | Number(18,3) | Exclusive upper bound (`<`) for numeric-range matching. |
| `Priority__c` | Number(4,2) | Lower number wins when multiple extensions match and `Display_Multiple__c` is off. |
| `Static_Text__c` / `Icon_Value__c` / `Image__c` / `Icon_Background__c` / `Icon_Foreground__c` / `Hover_Text__c` | Text(255) each | Override the parent item's equivalents when this rule matches. Only set the ones you want to change — leave the rest blank to inherit the item's default. Same utility-icon background caveat as the item fields applies here — see `Indicator_Item__mdt` above. |
| `Badge_Icon_Position__c` / `Badge_Text_Color__c` | Picklist / Text(255) | Badge-style overrides. |
| `Description__c` | Long Text Area | Internal notes only. |

An extension is either a **text/string-match rule** (`Contains_Text__c` + `Text_Operator__c`) or a **numeric-range rule** (`Minimum__c`/`Maximum__c`) — don't mix both kinds of criteria on one extension record; if you need both a text condition and a numeric condition, that's two separate extensions.

## Validation rules to design around

Five active validation rules across the four objects — every one of these fails an actual deploy, not just a soft recommendation, so check the design against all five before generating anything:

**On `Indicator_Item__mdt`:**
- **`EmptyStaticTextMustHaveBehavior`**: if `Static_Text__c` is blank, `Empty_Static_Text_Behavior__c` must not also be blank. The catch: `Empty_Static_Text_Behavior__c`'s "Use Icon Only" default is a **Setup-UI-only convenience default** — it's not enforced by `sf cmdt generate records` or a plain CSV import, so a CSV cell left blank stays genuinely blank and *will* fail this rule if `Static_Text__c` is also blank. Whenever a design leaves `Static_Text__c` empty, explicitly write `Use Icon Only` (or `Use Field Value`) into `Empty_Static_Text_Behavior__c` in the CSV — don't rely on the field "having a default."

**On `Indicator_Item_Extension__mdt`:**
- **`Numeric_Missing_Minimum`**: if the parent item's field is a Number/Currency/Percent type, `Minimum__c` must not be blank on any extension attached to it — this is the platform-enforced version of the numeric-range gotcha noted below.
- **`String_Missing_Contains_Text`**: if the parent item's field is a Text/Picklist type, `Contains_Text__c` must not be blank on any extension attached to it.
- Both of these rules resolve the item's field type via `Indicator_Item__r.Field__r.DataType` — a relationship traversal that only works when the item uses `Field__c` (a resolvable direct field). **An item using `Advanced_Field__c` instead gets no automatic check here** — apply the same requirement (`Minimum__c` for numeric extensions, `Contains_Text__c` for text extensions) by hand in that case, since the platform won't catch a mistake for you.

**On `Indicator_Bundle_Item__mdt`:**
- **`Action_Type_Requires_Target`**: if `Action_Type__c` is set, `Action_Target__c` must not be blank. The real error message has a useful tip worth relaying: to disable an action while keeping the target configured for later, clear `Action_Type__c` rather than `Action_Target__c`.
- **`Bundle_and_Item_Different_sObjects`**: a bundle item deploy fails if the bundle's `sObject__c` and the item's `sObject__c` don't match. This is fine for items using `Advanced_Field__c` to reach a related object's data, but flag it to the user if they're proposing to join a bundle and item on different base objects without an Advanced Field path — it will not deploy.

`Indicator_Bundle__mdt` has no validation rules today. More rules may be added over time as the schema grows — if a deploy fails with an unfamiliar validation rule error, check the relevant object's `validationRules/` folder in `force-app` for the exact condition rather than guessing at the fix.

## Merge tokens — where {!Field_Api_Name} actually resolves

Confirmed against `indicatorBundle.js`'s `extractMergeFields`/`mergeTemplate` calls, `{!Field_Api_Name}` tokens are resolved in exactly these fields, and nowhere else:

- `Indicator_Bundle__mdt.Card_Text__c`
- `Indicator_Item__mdt.Hover_Text__c` and `Inverse_Hover_Text__c`
- `Indicator_Item_Extension__mdt.Hover_Text__c` (an extension's hover-text override also gets merge resolution, not just the item's default)
- `Indicator_Bundle_Item__mdt.Action_Target__c`

`Action_Button_Label__c` and `Action_Help_Text__c` do **not** support merge tokens today — don't tell a user they can put `{!Field}` in a button label, it'll render literally.

## Practical requiredness beyond the schema

None of the four objects mark many fields `required=true` at the metadata level (only the two relationship fields on `Indicator_Bundle_Item__mdt` and the one on `Indicator_Item_Extension__mdt` are schema-required), and validation rules (above) catch the biggest gaps — but a couple of things are *functionally* required without any rule enforcing them at all:

- **An item needs `Field__c` or `Advanced_Field__c` populated to render a data-driven value.** Whether an item with *both* left blank (a purely static, always-the-same-icon item with no field at all) is actually supported is **unverified** — tracing `indicatorBundle.js`, a blank field would produce a malformed field path (`Object.` with nothing after the dot) that gets pushed into the record wire's `optionalFields` list alongside every other item's fields, which risks breaking the wire for the *whole* bundle, not just this one item. Don't design a field-less static item as if it's a supported pattern until this is confirmed against a real org — if a user wants an always-the-same-appearance indicator, treat it as an open question rather than a known-good design, and flag it up for verification rather than generating CMDT for it silently.
- **The numeric/text extension requirements above are validation-rule-enforced only when the parent item uses `Field__c`.** For an `Advanced_Field__c`-based item, `Minimum__c`/`Contains_Text__c` are just as functionally necessary (the LWC's numeric-match branch only runs `if (extension.Minimum || extension.Minimum === 0)`, so a `Maximum__c`-only rule never matches anything) but nothing will stop a deploy that gets it wrong — apply the same discipline by hand.
- **`Action_Type__c` requires `Action_Target__c`** (validation-rule-enforced, see above) and, less obviously, a `Flow Modal` action's target needs to be a Screen Flow's API name specifically — not any Flow type, and nothing validates that distinction.

## Text vs. date matching

`Contains_Text__c` and `Text_Operator__c` are reused for two different kinds of extension rule rather than having separate date-specific fields — the package favors reusing existing CMDT fields over adding new ones, since Salesforce counts CMDT storage per-field regardless of whether a given record populates it. Which behavior you get is decided by what `Contains_Text__c` actually parses as, not by any separate flag:

- `IndicatorController.cls` first tries `DateUtility.convertRelativeDateRange()` (relative literals like `TODAY`, `NEXT 30 DAYS`, `THIS YEAR`, `LAST_N_DAYS:14`), then `DateUtility.convertDefiniteDate()` (a literal date) on `Contains_Text__c`'s value.
- If either parse succeeds, the extension gets a computed `StartDate`/`EndDate` range, and `indicatorBundle.js` compares the record's field value against that range using whichever of `Equals` / `Does Not Equal` / `Before Start` / `After End` / `Before End` / `After Start` is set in `Text_Operator__c`. This only fires if the item's underlying field value is itself date-shaped — pointing this at a non-date field won't produce a date comparison no matter what `Contains_Text__c` contains.
- If neither parse succeeds, `Contains_Text__c` is treated as a plain string and matched with `Equals` / `Does Not Equal` / `Contains` / `Starts With` — `Contains` and `Starts With` are never meaningful for a date-shaped `Contains_Text__c` value, since the date branch takes precedence whenever parsing succeeds.

Practical guidance when designing an extension for a date-typed item: write `Contains_Text__c` as a relative date literal or a literal date, and only offer the four date-specific operators for `Text_Operator__c`. This is fully functional end to end today — there's no gap here, and no formula-field workaround is needed purely for date-range extension matching (a formula field is still the right call for *compound* conditions that combine a date check with something else — see `SKILL.md` Step 3).
