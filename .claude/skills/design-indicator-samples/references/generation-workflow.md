# Generating deployable files from a finished design (package-repo edition)

Once a design is settled (see SKILL.md's interview), it becomes rows in up to four CSVs — one per CMDT object, only for the objects actually needed (an item with no extensions needs no `extensions.csv` rows, a lone unbundled item needs no `bundle_items.csv` row). CSV is the universal intermediate format here: it's directly importable on its own, *and* it's the required input to the CLI conversion path. Always build the CSVs first regardless of which deployment path is used.

This is the package-repo variant of this reference. The customer-org variant (`design-salesforce-indicator`) needs a bundled namespaced stub of the CMDT field definitions because a customer only has the package *installed*, not its source. Working in this repo, that whole problem doesn't exist — `force-app/main/default/objects/Indicator_*__mdt` is real, local, unprefixed source, so `sf cmdt generate records` works against it directly with no extra setup. That's the main structural difference from the customer-org path; everything about CSV formatting and DeveloperName rules below is identical.

## CSV format

One CSV per object. Header row = the exact field API names (`Active__c`, `Card_Title__c`, etc. — see `references/cmdt-schema.md` for the full list per object, unprefixed to match `force-app`). Leave a cell empty for any field the design doesn't set — don't invent values to fill columns.

- **`Field__c` must be the bare field API name, not object-qualified.** `AnnualRevenue` is correct; `Lead.AnnualRevenue` is not and will silently produce a broken reference. This exact mistake exists in this repo's own `unpackaged/data/items.csv` seed file — don't repeat it if editing that file.
- **Quote any CSV cell containing a comma.** Free-text fields like `Hover_Text__c`, `Card_Text__c`, and `Description__c` are the likely offenders — an unquoted comma silently shifts every column after it rather than erroring, so a bad row can look fine until the generated XML has values in the wrong fields.

Relationship columns (`Indicator_Bundle__c`, `Indicator_Item__c` on bundle items and extensions) are plain DeveloperName strings, never Salesforce record Ids — see the DeveloperName rules below for how to derive that string.

### DeveloperName rules — and the 40-character limit

Every CMDT record needs a `DeveloperName`: must start with a letter, contain only letters/numbers/underscores, no consecutive or trailing underscores, and (Salesforce-enforced at deploy time, not caught by any generation tool) **no more than 40 characters**. Empirically confirmed by testing `sf cmdt generate records` with deliberately awkward inputs, its sanitization algorithm is:

1. Any run of one or more non-alphanumeric characters (spaces, punctuation, repeated dashes, etc.) collapses to a single underscore.
2. A trailing underscore left over from trailing punctuation/whitespace is stripped entirely, not kept.
3. A name starting with a digit gets an `X` prefixed (`1Leading Digit` → `X1Leading_Digit`).
4. Letter case is preserved as-is.
5. **Length is never truncated automatically** — a 77-character input produces a 77-character DeveloperName that will fail at Salesforce deploy time, not at generation time.

Bundle items and extensions are the ones most likely to blow past 40 characters, since their names are naturally compounds of two other names. Check this arithmetic during the design conversation, before generating anything, and abbreviate rather than discovering the failure at deploy time. This repo's existing samples follow a `<Bundle>_<Item>` / `<Item>_<condition>` naming pattern (see `unpackaged/config/sample_AccountContact` and `unpackaged/data/*.csv`) — match that convention for consistency with what's already there.

### Label column

Use `MasterLabel` as the label column (matching Salesforce's actual field name), passed to `sf cmdt generate records` via `--name-column MasterLabel`. Confirmed to sanitize identically to the tool's default `Name` column. Do **not** add a separate `DeveloperName` column to a CSV headed for `sf cmdt generate records` — confirmed by testing, the tool rejects any column that isn't either the designated name-column or a real field on the target object.

If Salesforce Inspector Reloaded is used instead (see Path A below, still viable here for testing against a scratch org), it needs an explicit `DeveloperName` column added to a copy, computed by hand using the algorithm above — Inspector's import doesn't derive it from the label for you.

## SLDS icon names

`Icon_Value__c` (and its `Inverse_`/extension equivalents) takes a string like `utility:approval` or `standard:account`, unvalidated by Salesforce — an invalid name deploys cleanly and silently renders nothing. `assets/slds-icons-reference.csv` (columns: `type`, `name`, `default_background_color`, `description`, `common_use`) has the real icon set for this package's supported SLDS version. Check a proposed icon name against this file before writing it anywhere. This CSV is a duplicate of `design-salesforce-indicator`'s copy, kept in sync by the `maintain-slds-icon-reference` skill's regeneration script (it writes both copies) — don't hand-edit this copy independently of that one.

## Where to save the working CSVs and generated XML

Default to the project's own conventions rather than scratch space: `unpackaged/data/*.csv` for the working CSVs (matching the existing `bundles.csv`/`items.csv`/`bundle_items.csv`/`extensions.csv` seed files there), and `unpackaged/config/<new_sample_set_name>/customMetadata/` for the generated XML — following the pattern of `sample_AccountContact`, `sample_Lead`, and `training_Indicators`. Ask the maintainer to confirm the sample-set name/location rather than assuming, since it determines the CumulusCI task wiring below too.

## Path A: CSV straight into an org via Salesforce Inspector Reloaded (no CLI)

Still usable here for a quick sanity-check against a scratch org, same as the customer-org path — Inspector Reloaded's Data Import can target CMDT directly from a CSV with the `DeveloperName`/`MasterLabel` columns described above. Import order: bundles and items first (either order), then bundle items, then extensions. Workbench does **not** support this — its CMDT route is a manual metadata-zip deploy (`package.xml` + individual `.md` files), not a CSV import; don't offer it as a CSV path.

**This path has not been exercised end-to-end** — treat it as unverified if it comes up, same caveat as the customer-org variant.

## Path B: CSV → XML via `sf cmdt generate records`, deployed with CumulusCI

### Verified command usage

Run from the repo root, once per CMDT object that has rows to generate:

```bash
sf cmdt generate records \
  --csv unpackaged/data/bundles.csv \
  --type-name Indicator_Bundle__mdt \
  --name-column MasterLabel \
  --output-directory unpackaged/config/<sample_set_name>/customMetadata
```

No `--input-directory` needed — confirmed working against this repo's real `force-app/main/default/objects` with the default value. Repeat with `--type-name Indicator_Item__mdt`, `Indicator_Bundle_Item__mdt`, `Indicator_Item_Extension__mdt` against their respective CSVs, sharing the same `--output-directory`.

### Deploying with CumulusCI (preferred over raw `sf` in this repo)

Per `CLAUDE.md`: "built/released with CumulusCI (`cci`), not raw `sf`/npm scripts." Once the CMDT files are generated:

```bash
cci task run deploy --path unpackaged/config/<sample_set_name> --org <alias>
```

This is what actually deploys sample/training indicators in this repo today (see `cumulusci.yml`'s `deploy_sample_indicators`, `deploy_sample_indicators_layouts`, `deploy_training_indicators` tasks — each a `cumulusci.tasks.salesforce.Deploy` task pointed at an `unpackaged/config/<name>` path). A genuinely new, permanent sample set should get its own task entry following that same pattern, and wired into the relevant flow (`sample_inds`, `config_dev`, `config_demo`, etc.) — not just deployed ad hoc and left unwired. Flag this to the maintainer as a follow-up if the design is meant to stick around, rather than assuming a one-off `cci task run deploy` is the finish line.

Fall back to raw `sf project deploy start --source-dir <path>` only if there's a specific reason to bypass CumulusCI (e.g. a throwaway scratch-org test with no interest in wiring up a task).

### After generating — always show the maintainer the files before deploying

Print or open the generated `.md-meta.xml` files and walk through what they contain before running any deploy command, same as the customer-org path.
