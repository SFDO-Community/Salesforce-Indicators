# Generating deployable files from a finished design

Once a design is settled (see SKILL.md's interview), it first becomes a **JSON recipe** (`references/json-recipe-schema.md`) — the single source-of-truth artifact for the design, and the file to hand off if this design is meant to be shared as a recipe rather than (or in addition to) deployed locally. From that JSON, generate rows in up to four CSVs — one per CMDT object, only for the objects actually needed (an item with no extensions needs no `extensions.csv` rows, a lone unbundled item needs no `bundle_items.csv` row). CSV remains the universal deployment intermediate: it's directly importable on its own, *and* it's the required input to the CLI conversion path. Always build the CSVs (from the JSON) regardless of which deployment path the user picks — if a field needs to change after CSVs already exist, correct the JSON and regenerate the CSVs from it rather than hand-editing a CSV directly, so the two never drift apart.

## CSV format

One CSV per object. Header row = the exact field API names the target org will have (`inds__Active__c`, `inds__Card_Title__c`, etc. — see `references/cmdt-schema.md` for the full list per object). Leave a cell empty for any field the design doesn't set — don't invent values to fill columns. **The name/label columns differ by path — see below** — build everything else first, then add the right name columns for whichever path is chosen.

Two things that are easy to get wrong regardless of path:

- **`inds__Field__c` must be the bare field API name, not object-qualified.** `AnnualRevenue` is correct; `Lead.AnnualRevenue` is not and will silently produce a broken reference.
- **Quote any CSV cell containing a comma.** Free-text fields like `Hover_Text__c`, `Card_Text__c`, and `Description__c` are the likely offenders — an unquoted comma silently shifts every column after it rather than erroring, so a bad row can look fine until the generated XML has values in the wrong fields. When writing these CSVs, wrap any cell with a comma in double quotes.

Relationship columns (`inds__Indicator_Bundle__c`, `inds__Indicator_Item__c` on bundle items and extensions) are plain DeveloperName strings, never Salesforce record Ids — see the DeveloperName rules below for how to derive that string.

### DeveloperName rules — and the 40-character limit

Every CMDT record needs a `DeveloperName`: must start with a letter, contain only letters/numbers/underscores, no consecutive or trailing underscores, and (Salesforce-enforced at deploy time, not caught by any generation tool) **no more than 40 characters**. Empirically confirmed by testing `sf cmdt generate records` with deliberately awkward inputs, its sanitization algorithm is:

1. Any run of one or more non-alphanumeric characters (spaces, punctuation, repeated dashes, etc.) collapses to a single underscore.
2. A trailing underscore left over from trailing punctuation/whitespace is stripped entirely, not kept.
3. A name starting with a digit gets an `X` prefixed (`1Leading Digit` → `X1Leading_Digit`).
4. Letter case is preserved as-is.
5. **Length is never truncated automatically** — a 77-character input produces a 77-character DeveloperName that will fail at Salesforce deploy time, not at generation time.

Bundle items and extensions are the ones most likely to blow past 40 characters, since their names are naturally compounds of two other names (`"Deal Health - Deal At Risk"` → `Deal_Health_Deal_At_Risk`, 24 characters — fine here, but it adds up fast with longer source names). Check this arithmetic during the design conversation, before generating anything, and abbreviate rather than discovering the failure at deploy time.

### One label column, used differently per path

Every CSV's label column is `MasterLabel` (matching Salesforce's actual field name for a CMDT record's label, and what Inspector Reloaded expects) — not `Name`. This one column works for both paths, but what's *added* to it differs:

- **Path B (`sf cmdt generate records`)**: pass `--name-column MasterLabel` (confirmed to sanitize identically to the tool's own default `Name` column — same algorithm, just reading a differently-named source column). Do **not** add a separate `DeveloperName` column to the CSV you hand this command — confirmed by testing, the tool rejects any column that isn't either the designated name-column or a real field on the target object, so an explicit `DeveloperName` column actively breaks the run rather than being harmlessly ignored.
- **Path A (Salesforce Inspector Reloaded)**: needs an explicit `DeveloperName` column as well, since Inspector's import doesn't derive it from the label for you. Apply the algorithm above by hand to compute it. When another row needs to *reference* this record (e.g. a bundle item's `inds__Indicator_Bundle__c` column), use the exact `DeveloperName` value, not `MasterLabel`.

Practically: build the shared CSVs with just `MasterLabel` (works directly for Path B). If the user picks Path A, add a `DeveloperName` column to a copy right before handing it off — don't carry that column through Path B's generation step.

## SLDS icon names

`Icon_Value__c` (and its `Inverse_`/extension equivalents) takes a string like `utility:approval` or `standard:account`. Salesforce doesn't validate this value anywhere in the CMDT layer — an invalid icon name deploys cleanly and just silently renders no icon, so guessing at a plausible-sounding name is a real trap, not a minor one. `assets/slds-icons-reference.csv` (columns: `type`, `name`, `default_background_color`, `description`, `common_use`) has the actual icon set for this package's supported SLDS version. Check a proposed icon name against this file before writing it into a CSV — the `description`/`common_use` columns, where filled in, are there specifically to help match a design concept to a real icon without guessing from the name alone; many rows won't have them yet, since that's an ongoing human-curated pass, not something auto-generated.

This CSV is maintained by a separate skill, `maintain-slds-icon-reference` — this skill only reads it. Don't re-scrape or regenerate it as part of a design conversation; if it looks stale or wrong, say so and point to that skill rather than fixing it here.

## Where to save the working CSVs and generated XML

Ask where the user wants these saved — don't default to a scratch/temp directory just because it's convenient. If they're designing something they'll want to revisit, tweak, or hand to someone else, these files belong in their actual project, not somewhere ephemeral: a working folder they name. Scratch space is fine for a quick one-off the user explicitly says is disposable, but treat "keep this in the project" as the default expectation, not the exception.

## Path A: CSV straight into the org via Salesforce Inspector Reloaded (no CLI)

Salesforce Inspector Reloaded's Data Import can target Custom Metadata Types directly from a CSV — this is the only no-CLI CSV path, not Workbench. Workbench doesn't actually support CSV import for CMDT: the documented Workbench route for CMDT is a metadata *deploy* (a `package.xml` referencing the CMDT records plus individual `.md` files inside a `customMetadata` folder, zipped up), which is really Path B's XML-generation work by hand, with none of Path B's automation — not a CSV shortcut. Don't offer Workbench as a CSV-import option.

Inspector Reloaded needs the `DeveloperName` column added (see above) since it won't derive one from `MasterLabel` itself. Import order matters because of the lookups: **bundles and items first** (either order, they don't reference each other), **then bundle items** (needs both to exist), **then extensions** (needs items to exist). This path needs no local Salesforce project and no CLI — good for a user who just wants to get indicators into an org quickly and is comfortable with a data-loader UI.

**This path has not actually been exercised against Inspector Reloaded** — only Path B's CLI conversion has been run and verified end to end. The CSV shape here follows Inspector's documented column requirements, so it's a reasonable starting point, but don't present Path A as verified; say so if asked, and treat the first real run through Inspector Reloaded as a test of the format, not confirmation of something already known to work.

## Path B: CSV → XML via `sf cmdt generate records` → CLI deploy

This is the streamlined path when the user has the `sf` CLI and an SFDX project. It converts each CSV into real deployable CustomMetadata XML records, and then a single `sf project deploy start` pushes everything at once — no per-record clicking.

### Why this needs a bundled reference directory

`sf cmdt generate records` reads the *target* CMDT's field definitions from local `.object-meta.xml`/`.field-meta.xml` files (via `--input-directory`, default `force-app/main/default/objects`) so it knows each column's type well enough to emit correctly-typed `<value xsi:type="...">` elements. A user who only has the managed package **installed** (not this source repo) won't have those definition files in their own project — the managed package's CMDT structure isn't something they'd normally have lying around locally.

That's exactly what `assets/objects-reference/` in this skill is for: namespaced (`inds__`) copies of the four CMDT objects' field definitions, generated straight from the package repo's real `force-app/main/default/objects/Indicator_*__mdt` sources. Point `--input-directory` at that folder and the command works from any SFDX project, without the user needing to retrieve metadata from their org first.

### Verified command usage

Run once per CMDT object that has rows to generate (skip any with no rows):

```bash
sf cmdt generate records \
  --csv path/to/bundles.csv \
  --type-name inds__Indicator_Bundle__mdt \
  --name-column MasterLabel \
  --input-directory <skill-dir>/assets/objects-reference \
  --output-directory <user's project's customMetadata directory>
```

Repeat with `--type-name inds__Indicator_Item__mdt`, `inds__Indicator_Bundle_Item__mdt`, `inds__Indicator_Item_Extension__mdt` against their respective CSVs. All four can share the same `--output-directory` — the generated filenames (`inds__Indicator_Bundle.Account_Company_Info.md-meta.xml`, etc.) don't collide across object types.

`--output-directory` defaults to `force-app/main/default/customMetadata`, which is only correct if the user's SFDX project actually uses that layout — **ask for (or check `sfdx-project.json`'s `packageDirectories`) the real path** rather than assuming the default; a project with a different package directory name or a non-default structure needs that path passed explicitly. This was verified in a project using the default layout — the command's behavior with a differently-named package directory hasn't been separately tested, though there's no reason to expect it to behave differently.

Must be run from inside an SFDX project (a directory with `sfdx-project.json`) — the CLI errors with `RequiresProjectError` otherwise. If the user doesn't have one yet, `sf project generate --name <project>` creates a minimal one.

### Deploying the generated records

If the records were generated straight into the user's real project's `customMetadata` directory, the simplest deploy is by directory — no package.xml needed:

```bash
sf project deploy start --source-dir <user's project's customMetadata directory>
```

Use a `package.xml` instead (`assets/package-xml-template.xml` in this skill has the shape) when: the records were generated somewhere outside the project's package directories, the user wants a manifest they can diff/review before deploying, or they're wiring this into a CI step. The manifest lists each CMDT type with either `<members>*</members>` (deploy every record of that type present locally) or explicit record names — prefer explicit names so an unrelated record someone else added to `customMetadata/` doesn't get swept into this deploy by accident:

```bash
sf project deploy start --manifest package.xml
```

### After generating — always show the user the files before deploying

Print or open the generated `.md-meta.xml` files and walk through what they contain before running any deploy command. Deploying CMDT is easy to undo (delete the record or redeploy a corrected version) but the user should still see what's about to land in their org, especially on a first pass through a new design.
