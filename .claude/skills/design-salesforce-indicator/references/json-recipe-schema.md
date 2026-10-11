# JSON recipe schema

A "recipe" is a portable JSON snapshot of an Indicator Bundle (with its Items and their Extensions), or of one or more standalone Items with no Bundle at all. It's the shareable artifact behind the Export/Preview workflow: one org exports a recipe, another org previews it (rendered through the existing `key`/`c-key` legend component, fed no differently than `configurationManager` already feeds it) before deciding whether to import it via CSV.

A recipe is never hand-authored. It comes from exactly two producers:
1. **Export**, from an org's already-deployed, already-valid CMDT data — see the Export LWC work in the parent plan.
2. **This skill**, generating a recipe fresh from a design interview — see `generation-workflow.md`.

Because of that, this schema does not need to defend against malformed input (bad DeveloperNames, missing required combinations) the way a hand-edited file might — both producers already guarantee validity by construction. The one exception, noted below, is synthesizing a *new* Bundle Item DeveloperName when an imported Item is attached to a Bundle that already exists in the receiving org.

## Top-level shape

```json
{
  "recipeSchemaVersion": "1.0",
  "recipeType": "bundle",
  "bundle": { ... } | null,
  "items": [ { ... } ]
}
```

- **`recipeSchemaVersion`** — a string, bumped whenever this shape changes in a way a consumer needs to know about. Lets the Previewer (or any future consumer, including the Builder LWC) handle older recipes gracefully instead of guessing.
- **`recipeType`** — `"bundle"` or `"items"`. Redundant with whether `bundle` is `null`, but explicit rather than inferred — makes intent unambiguous to a reader and avoids a consumer having to derive it.
- **`bundle`** — `null` for an item-only recipe (the standalone-Item / "Unbundled Items" case). Otherwise the bundle's own fields (below) plus nothing else — its items live in the top-level `items` array, not nested inside `bundle`, so a bundle recipe and an item-only recipe share one shape for `items` rather than two.
- **`items`** — one or more Items. Always present; an item-only recipe is just a recipe where `bundle` is `null` and this array has no `bundleItem` blocks (see below).

No `author` field. `BundleDescription`/`IndicatorDescription`/`ExtensionDescription` already exist as internal-notes fields on the underlying CMDT objects (see `cmdt-schema.md`) — if an exporting admin wants to leave attribution or context, that's where it goes. Not duplicating it as a separate concept.

## `bundle` object

Mirrors `IndicatorController.IndicatorBundle`'s display fields, with `DeveloperName` replacing the wrapper's `BundleId` (a real Salesforce record Id — org-specific, not portable, and not needed: nothing in `key.js` uses the Id for anything beyond a local, opaque UI key, so `DeveloperName` serves that purpose just as well once loaded from JSON).

| Field | Source (`Indicator_Bundle__mdt`) | Notes |
|---|---|---|
| `DeveloperName` | `DeveloperName` | Carried through as-is from the exporting org — already valid, never re-sanitized on export. |
| `MasterLabel` | `MasterLabel` | |
| `ObjectApiName` | `inds__sObject__c` | Raw object API name (`Account`, `Custom_Object__c`) — **not** the wrapper's `ObjectName`, which is a formatted display label (e.g. `Custom Object (Custom_Object__c)`) meant for UI display, not for redeploying. Don't confuse the two when building the Export logic. |
| `IsActive` | `inds__Active__c` | |
| `CardTitle` | `inds__Card_Title__c` | |
| `CardText` | `inds__Card_Text__c` | |
| `CardIcon` | `inds__Card_Icon__c` | |
| `CardIconBackground` | `inds__Card_Icon_Background__c` | |
| `CardIconForeground` | `inds__Card_Icon_Foreground__c` | |
| `BundleDescription` | `inds__Description__c` | Internal notes — see the author-field decision above. |

## `items[]` entries

Mirrors `IndicatorController.IndicatorItem`'s *item-intrinsic* fields only — the bundle-context fields (`ActionType`, `ActionTarget`, `SortOrder`, etc.) that the live wrapper flattens in are pulled out into a nested `bundleItem` object instead, since they only mean something in the context of one specific bundle join (the same Item can have different actions in different Bundles — see `cmdt-schema.md`).

| Field | Source (`Indicator_Item__mdt`) | Notes |
|---|---|---|
| `DeveloperName` | `DeveloperName` | Replaces the wrapper's `IndicatorId` (record Id), same reasoning as the bundle. |
| `MasterLabel` | `MasterLabel` | |
| `IsActive` | `inds__Active__c` | |
| `ObjectApiName` | `inds__sObject__c` | The object this item reads from. A bundled item can technically infer this from `bundle.ObjectName` (a validation rule requires them to match), but an item-only recipe has no bundle to inherit it from, so it's always carried explicitly here — don't omit it just because the item belongs to a bundle in this recipe. |
| `FieldApiName` | `inds__Field__c` | Bare field API name. |
| `AdvancedField` | `inds__Advanced_Field__c` | Present instead of `FieldApiName` when the item reads a related record. |
| `FieldLabel` | resolved label / `inds__Advanced_Field_Label__c` | |
| `TextValue` | `inds__Static_Text__c` | |
| `IconName` | `inds__Icon_Value__c` | |
| `ImageUrl` | `inds__Image__c` | |
| `BackgroundColor` / `ForegroundColor` | `inds__Icon_Background__c` / `inds__Icon_Foreground__c` | |
| `HoverValue` | `inds__Hover_Text__c` | |
| `DisplayFalse` | `inds__Show_False_or_Blank__c` | |
| `FalseTextValue` / `FalseIcon` / `FalseImageUrl` / `InverseBackgroundColor` / `InverseForegroundColor` / `FalseHoverValue` | `inds__Inverse_*__c` | Only meaningful when `DisplayFalse` is true. |
| `ZeroBehavior` | `inds__Zero_Behavior__c` | |
| `EmptyStaticBehavior` | `inds__Empty_Static_Text_Behavior__c` | |
| `DisplayMultiple` | `inds__Display_Multiple__c` | |
| `BadgeIconPosition` / `BadgeTextColor` / `FalseBadgeIconPosition` / `FalseBadgeTextColor` | `inds__Badge_*__c` / `inds__Inverse_Badge_*__c` | |
| `IndicatorDescription` | `inds__Description__c` | Internal notes. |
| `bundleItem` | — | `null` when `recipeType` is `"items"`. See below. |
| `extensions` | — | Array, possibly empty. See below. |

### `items[].bundleItem` object

Present only when the item belongs to `recipe.bundle` (i.e. `recipeType: "bundle"`). Mirrors `Indicator_Bundle_Item__mdt`.

| Field | Source | Notes |
|---|---|---|
| `SortOrder` | `inds__Order__c` | |
| `ActionType` | `inds__Action_Type__c` | |
| `ActionTarget` | `inds__Action_Target__c` | |
| `ActionButtonLabel` | `inds__Action_Button_Label__c` | |
| `ActionHelpText` | `inds__Action_Help_Text__c` | |
| `ActionConfirmRequired` | `inds__Action_Confirm_Required__c` | |
| `DisplayFalseAction` | `inds__Show_False_or_Blank_Action__c` | |

No `DeveloperName` here on export — a real Bundle Item's DeveloperName is a synthesized compound of the bundle's and item's names, not independently meaningful, and isn't referenced by anything else. The one place a Bundle Item DeveloperName has to be *generated* is on the receiving side, when an item-only recipe is attached to a bundle that already exists in the target org — that's new-name synthesis (sanitize + 40-char check, per `generation-workflow.md`), not something carried through the recipe.

## `items[].extensions[]` entries

Mirrors `IndicatorController.IndicatorExtension`, `DeveloperName` again replacing the wrapper's `ExtensionId`.

| Field | Source (`Indicator_Item_Extension__mdt`) | Notes |
|---|---|---|
| `DeveloperName` | `DeveloperName` | |
| `MasterLabel` | `MasterLabel` | |
| `IsActive` | `inds__Active__c` | |
| `ContainsText` | `inds__Contains_Text__c` | String or relative/definite date literal — see `cmdt-schema.md`'s text-vs-date section. |
| `TextOperator` | `inds__Text_Operator__c` | |
| `Minimum` / `Maximum` | `inds__Minimum__c` / `inds__Maximum__c` | |
| `PriorityOrder` | `inds__Priority__c` | |
| `ExtensionTextValue` / `ExtensionIconValue` / `ExtensionImageUrl` / `BackgroundColor` / `ForegroundColor` / `ExtensionHoverText` | `inds__Static_Text__c` / `inds__Icon_Value__c` / `inds__Image__c` / `inds__Icon_Background__c` / `inds__Icon_Foreground__c` / `inds__Hover_Text__c` | Only the ones the rule overrides need to be non-null. |
| `BadgeIconPosition` / `BadgeTextColor` | `inds__Badge_Icon_Position__c` / `inds__Badge_Text_Color__c` | |
| `ExtensionDescription` | `inds__Description__c` | Internal notes. |

## Worked example — item-only recipe

```json
{
  "recipeSchemaVersion": "1.0",
  "recipeType": "items",
  "bundle": null,
  "items": [
    {
      "DeveloperName": "Deal_At_Risk",
      "MasterLabel": "Deal At Risk",
      "IsActive": true,
      "ObjectApiName": "Opportunity",
      "FieldApiName": "StageName",
      "IconName": "utility:info",
      "HoverValue": "Stage: {!StageName}",
      "bundleItem": null,
      "extensions": [
        {
          "DeveloperName": "Deal_At_Risk_Stalled",
          "MasterLabel": "Stalled",
          "IsActive": true,
          "ContainsText": "Negotiation",
          "TextOperator": "Equals",
          "PriorityOrder": 1,
          "ExtensionIconValue": "utility:warning",
          "ExtensionHoverText": "Stalled in Negotiation"
        }
      ]
    }
  ]
}
```

## Worked example — bundle recipe (abridged)

```json
{
  "recipeSchemaVersion": "1.0",
  "recipeType": "bundle",
  "bundle": {
    "DeveloperName": "Account_Health",
    "MasterLabel": "Account Health",
    "ObjectApiName": "Account",
    "IsActive": true,
    "CardTitle": "Account Health",
    "CardIcon": "standard:account"
  },
  "items": [
    {
      "DeveloperName": "Renewal_Risk",
      "MasterLabel": "Renewal Risk",
      "IsActive": true,
      "ObjectApiName": "Account",
      "FieldApiName": "Renewal_Risk__c",
      "IconName": "utility:notification",
      "bundleItem": {
        "SortOrder": 1,
        "ActionType": "Flow Modal",
        "ActionTarget": "Log_A_Renewal_Call"
      },
      "extensions": []
    }
  ]
}
```
