# Architecture and decisions

## The product in one page
Salesforce Indicators (namespace `inds`) draws small indicators (avatar / badge / pill) on Lightning record pages. Everything is **configured with Custom Metadata**, no code per use case:
`Indicator_Bundle__mdt` (a named group tied to one sObject; also the card title/icon/colours/description), `Indicator_Item__mdt` (one indicator: field mapping, icon / text / image / colours,
hover text, inverse values shown when the field is blank or false), `Indicator_Bundle_Item__mdt` (junction: order, click action), `Indicator_Item_Extension__mdt` (override rules: text
operators, numeric Min/Max, or relative-date operators; each carries its own icon/text/colour/hover).

The LWC `indicatorBundle` wires the bundle (Apex), then the record (`getRecord`, with the field list built from the items plus every `{!Field}` token), evaluates extensions **client-side**,
and renders child components by style: `indicatorBundleItem` (avatar), `indicatorBundleBadge`, `indicatorBundlePill`. A hover popover (`.ind-popover`) shows hover text and an action button
(URL or Flow Modal). The Key (legend modal) and Configuration Manager read the same CMDT. **The style (avatar/badge/pill) and `titleStyle`, `mappedField`, `showFooter`,
`showFieldValueAsHoverFallback` are FlexiPage properties, not CMDT.**

## The test model
- **Phase 1 (done, see `regression/README.md` top sections):** prod (released v0.4) vs dev (next build) screenshot comparison. Environments differ by which records exist: `prod_only` records
  (configurations the newer validation rules reject) deploy only to prod-shaped orgs; the oracle has `expected.csv` (prod) and `expected.dev.csv` (dev).
- **Phase 2 (this suite):** new-feature testing. Records are `dev-only` (use fields/syntax the released package lacks). The oracle is **the spec**, not prior behaviour. When v0.5 ships, passing
  feature rows graduate into the base set (`env=dev-only` -> `both`; `prod_only` retires).
- **Oracle** (`regression/scripts/build_expected_features.py` -> `planning/expected.features.csv`): one row per (style, record, item-in-bundle) giving the expected label, icon, position, text colour,
  popover body, button label/help/confirm, resolved URL, plus `basis` (`spec` = rule below; `unconfirmed` = behaviour the code does not pin down) and `via` (`mappedField:AccountId`).
- **Specs** read what the org renders (child component public props, popover DOM, inline CSS variables) and compare. Date expectations are computed at run time (see `running-the-suite.md`).

## Behaviour rules the oracle encodes (verified in orgs)
- True state (field has a value): label = matched extension's Badge/Pill Text, else the item's, else the field's display value. **A matched extension OWNS its text, colour, position, icon and hover:
  a blank field on the extension does not fall back to the item** (confirmed intended).
- False state (field blank/false): shown only if *Show False or Blank* is on, using the `Inverse_*` fields only. With no inverse text a badge/pill still draws an icon-only chip (by design).
- `{!Field}` tokens resolve against the record (against the **mapped** record when `mappedField` is set); a token on a blank field becomes an **empty string**.
- A popover exists only when it has a body (hover text) or an allowed action; `showFieldValueAsHoverFallback` (page flag) adds the field value as body when hover text is blank.
- Action button label defaults to `Open` (URL) / `Launch` (Flow Modal); *Confirm Required* means clicking the indicator does nothing, only the popover button fires; false-state actions need *Show False or Blank Action*.
- Date operators (`Equals`, `Does Not Equal`, `Before Start`, `After End`, `Before End`, `After Start`) compare the record date with a literal's `[start, end)` range (`TODAY`, `LAST MONTH`, `THIS MONTH`,
  `NEXT 30 DAYS` (starts tomorrow), `THIS YEAR`); "today" is the viewing user's org date.
- Card icon colours (`Card_Icon_Background/Foreground`): applied on all themes in the Lightning Card title style; the Dynamic Forms title style uses a utility icon and applies none; the Key always shows them.
  An avatar's *Icon Background* is honoured on SLDS1 only (ignored on SLDS2 and dark).

## Bundles and records (all `dev-only`)
| Bundle | Covers |
|---|---|
| `RF14_BadgePill_Acct` | Badge/Pill text, colour, position, inverse variants, extension ownership, Display Multiple, token in label |
| `RF15_Popover_Acct` | popover text, tokens (incl. blank field), popover presence rules; also shown on the Contact page via `mappedField=AccountId` |
| `RF16_Actions_Acct` | action label/help/confirm, false-state action, URL and Flow Modal |
| `RF17_PopoverFallback_Acct` | the same two items as RF15 with no hover text, on a page instance with the fallback flag ON |
| `RF18_Dates_Acct` | 15 date operator/literal items on `Account.Test_Date__c` |
| `RF19a-d` | card icon colours: both / background only / foreground only / none (+ Dynamic Forms variants) |
| `RF20_Contact_Con` | Contact: `DoNotCall` checkbox, `LastName` text + extension, Advanced Field `Account.Name` |

Records: Accounts `FEAT-01..03` (Feature Full / Blank / Cold), Contacts `FCON-01..04` (linked to them; `FCON-04` has no account), 11 date Accounts `FDATE-01..11` (offset from load day via CCI `anchor_date`).
Style tabs `Avatar` / `Badge` / `Pill` hold RF14, RF15, RF17, RF16, RF18 in that order; tab `Cards` holds RF19; the Contact dev page has one tab `Features`.

## Decisions and why (do not re-litigate without new evidence)
- Feature rows have their own pipeline with **literal values**: the oracle needs style/popover outputs and exact strings that the token-driven regression CSVs cannot express.
- Dev pages share the **API name** of the base pages and deploy after them (the Account page is a superset; the base page keeps 12 regression bundles untouched).
- No validation rule requires inverse badge/pill text: an item cannot know the bundle's style (a page property). Educate in help text and the Key instead.
- `NoExtensionOnCheckboxField` exists because a text rule on a checkbox crashes the v0.4 component. `EmptyStaticTextMustHaveBehavior` is redundant (picklist default) but kept.
- Date literals cannot be validated (no triggers on CMDT); the future CMDT UI should offer them as a picklist.
- Three regression extensions that only deployed while the type rules were dead are `prod-only` (`E_num_max_X1`, `E_num_on_text_X1`, `K_txtrule_chk_X1`).
- Style-independent records: the same Accounts/Contacts serve avatar, badge and pill.
- Volunteer-era material is reference only and stays untracked (it mixed regression and feature goals and is partly stale).

## Glossary
*dev / prod org*: org built from this branch / org with the released managed package. *oracle*: expected-results table. *basis*: `spec` or `unconfirmed`. *mapped row*: an Account bundle rendered on a Contact page.
*graduation*: moving passing feature rows into the base regression set at release. *check-only deploy*: `sf project deploy start --dry-run` (validate and roll back; saves nothing).
