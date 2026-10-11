# Add or change a feature test

All edits start in the **source tables**; everything else is generated. Show the maintainer the planning rows before generating CMDT or deploying.

## 1. Edit the source tables (`regression/planning/features/`)
| File | Columns (header order) |
|---|---|
| `bundles.csv` | `bundle_id,title,sobject,description,env,card_icon,card_text,card_bg,card_fg` |
| `items.csv` | `item_id,bundle,extra_bundles,sobject,field_api,advanced_field,icon,static_text,image,bg,fg,hover,badge_text,badge_color,badge_pos,show_missing,inv_icon,inv_static,inv_bg,inv_fg,inv_hover,inv_badge_text,inv_badge_color,inv_badge_pos,display_multiple,empty_static,zero_behavior,order,action_type,action_target,action_label,action_help,action_confirm,action_false,env,verifies` |
| `extensions.csv` | `ext_id,item_id,operator,text,min,max,priority,icon,static_text,image,bg,fg,hover,badge_text,badge_color,badge_pos,env` |
| `records_account.csv` / `records_contact.csv` / `records_dates.csv` | the record values; contacts carry `account` (planning id of the parent) and `Account.Name`; dates carry `offset` (days from load day) |

Rules of thumb: every row `env=dev-only`; `extra_bundles` (semicolon list) reuses one item in other bundles; `advanced_field` leaves `field_api` blank; the item's `sobject` must equal its bundle's.
`order` is per bundle. Pick icons that exist (the list is `slds-icons-reference.csv` in the `design-salesforce-indicator` skill's `assets/`; **that skill is currently untracked, so the file exists only on some machines** - otherwise check the SLDS icon library; `standard:rating` is NOT a real icon). Where colour is not the point, set background,
icon foreground **and** text colour together so the chip is readable on every theme.

## 2. Respect the validation rules (they run when the CMDT deploys)
Image needs a fallback icon (and inverse image an inverse icon); icon values start with `standard:`/`custom:`/`utility:`/`doctype:`/`action:`; an extension needs an operator **and** a value, or Min/Max (not both);
a Number/Currency item's extension needs a Minimum; a text/picklist item's extension needs Contains Text; **no extension on a Checkbox field**; Item needs exactly one of Field / Advanced Field; Bundle and Item must share an sObject.
Details and tests: `validation-rules.md`.

## 3. Generate the CMDT
```bash
python regression/scripts/build_feature_cmdt_csvs.py --force          # planning/features -> regression/data/dev_only/*.csv
S=<scratchpad>/regen && mkdir -p $S                                    # generate into a SCRATCH directory, never straight into customMetadata
for t in "Indicator_Bundle bundles" "Indicator_Item items" "Indicator_Item_Extension extensions" "Indicator_Bundle_Item bundle_items"; do set -- $t
  sf cmdt generate records --output-directory $S --type-name $1 --csv regression/data/dev_only/$2.csv --name-column MasterLabel; done
python regression/scripts/namespace_cmdt_records.py $S --cci          # CumulusCI token style (%%%NAMESPACE%%% / ___NAMESPACE___)
# copy ONLY files that are new or differ (cmp) into regression/dev_only/customMetadata; report which; expect unchanged records to be byte-identical
```
(Generating straight into `customMetadata` re-creates un-tokenised duplicates and the namespace script then refuses to overwrite.)

## 4. Regenerate the oracle and prove nothing moved
```bash
cp regression/planning/expected.features.csv <scratchpad>/before.csv
python regression/scripts/build_expected_features.py
# compare by shot_id: every pre-existing row must be IDENTICAL unless the change is meant to alter it
```
Rows with `basis=unconfirmed` are honest guesses; a clean pass turns them into facts (record the answer in `STATE.md` / findings).

## 5. Pages (only if a new component or tab is needed)
`regression/scripts/add_feature_tabs.py` clones an existing tab (and its facet) so the new tab matches that page's template. Dev pages live in `regression/dev_only/flexipages/` with the **same API name** as the base
pages (`Account_Record_Page_Regression`, `Contact_Record_Page_Regression`). If the bundle order on a tab changes, update `BUNDLE_ORDER` / `CONTACT_ORDER` in `features.spec.ts` (and `RF16_INDEX`/`RF18_INDEX` in the actions/dates specs).
The 12 regression bundle components on the dev Account page are a **hand-maintained copy** of the base page: mirror base-page changes.

## 6. Data (only if records change)
Edit `datasets/features/` (SQL + mapping + extract; `Site` on Accounts and `Title` on Contacts carry the planning record id) or `datasets/features_dates/` (dates are `anchor_date` + offset).
Separate datasets, because reloading one would duplicate the other's records. Contacts link to Accounts with a CCI `lookups:` entry inside the same mapping. Validate the SQL with `sqlite3` before asking for a reload.

## 7. Pre-flight, then ask to deploy
```bash
python regression/scripts/scan_records_against_rules.py --org <alias> --rules regression/findings/proposed-validation-rules --sets regression_dev_only   # needs OK: check-only deploy
```
The new records must be accepted under both the rules in the org and the corrected ones. Then ask the maintainer to deploy (`running-the-suite.md`), and extend the spec if the new feature needs a new check.
Order inside the `regression_dev` flow is deliberate (field + permission set before data; base pages before dev pages): see `cumulusci.yml`.
