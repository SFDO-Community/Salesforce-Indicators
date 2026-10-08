# Finding: the sample and training indicator sets do not pass this branch's own validation rules

**Found by:** `regression/scripts/scan_records_against_rules.py`, 2026-10-08. It packages the real CMDT record sets this repo ships and runs them as
check-only deploys (validate and roll back; nothing saved) against an org built from this branch.
**Why it matters:** the `customer_org` / `config_demo` flows deploy `sample_*` and `training_Indicators` into an org that already has the package.
With the validation rules active, those deploys cannot succeed as the records stand. (Inferred from the check-only results; the flows themselves were not run.)

## Result per shipped set (rules currently in the org)
| Set | Records | Rejected | Root causes | Cascade failures |
|---|---|---|---|---|
| `sample_AccountContact` | 43 | **0** | none (this is the set `e02c162` level-set) | 0 |
| `pipeline_Lead` | 22 | **0** | none | 0 |
| `regression_base` / `dev_only` | 339 / 105 | **0** | none | 0 |
| `sample_Lead` | 47 | **34** | 26 | 8 |
| `training_Indicators` | 95 | **23** | 17 | 6 |

"Cascade" = a Bundle Item or Extension rejected only because its parent Item or Bundle was rejected ("must belong to the same sObject",
"no CustomMetadata named ..."). Fixing the root causes clears them.

## Root causes (what needs level-setting)
**`sample_Lead`** (26)
- **Image without a fallback icon** (rule `FallbackIconRequiredForImage`): items `Lead_Industry`, `Lead_Location`, `Lead_Rating`, `Lead_Source`; extensions
  `Lead_Location_Other`, `Lead_Rating_Cold|Hot|Warm`, `Lead_Source_Other|Partner_Referral|Phone|Purchased_List|Web` (9).
- **Operator and value not paired** (rule `MatchOperatorRequiresValue`): 13 extensions `Lead_Industry_*` (Construction, Electronics, Energy, Engineering, Government,
  Manufacturing, Technology, Utilities), `Lead_Location_CA|Canada|US|UnitedStates`, `Lead_Status_Working`. They carry a value but no Match Operator (the records predate the field).

**`training_Indicators`** (17)
- **Image without a fallback icon**: items `Account_Rating_2`, `Sample_Static_Resource`, `Training_Classic_URL_Image`, `Training_Classic_URL_Image_2`, `Training_Icon_URL_Image`,
  `Training_Logo_URL_Image`, `Training_Public_URL_Image`, `Training_Static_Resource_Image` (8); extensions `Account_Rating_Cold_2|Hot_2|Warm_2`, `Battery_1`..`Battery_5` (8).
- **Operator and value not paired**: `Training_Account_Rating_Cold_2` (1).

## Caveat: what this scan cannot see yet
A record that is already rejected for one reason cannot show whether it would ALSO be rejected for another. These two sets showed **no NEW failures under the corrected
Extension rules** (`NoExtensionOnCheckboxField`, `Numeric_Missing_Minimum`, `String_Missing_Contains_Text`), but only the records that currently pass could be judged. **Re-run the scan
after the level-setting** (`--sets sample_Lead,training_Indicators`).

## Fix
Level-set the two sets the way `e02c162` did for `sample_AccountContact`: add a fallback icon wherever an image is set, and set a Match Operator (`Equals` or `Contains`) on text extensions.
Not done here: it is content (icons and operator choices) that the maintainers should pick.

## Re-run
```bash
python regression/scripts/scan_records_against_rules.py --org <alias> --rules regression/findings/proposed-validation-rules --sets sample_Lead,training_Indicators
```
Per-set reports: `regression/playwright/output/validation/<alias>__scan/scan_<set>.csv`.
