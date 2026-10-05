# Breakdown

```
regression
├───customMetadata      // Output from `sf cmdt generate records` commands below (deploys to every org)
├───data                // CSV files built from the `\planning` tables by `scripts/build_cmdt_csvs.py`
│   └───prod_only       // Records that only deploy to orgs WITHOUT the newer validation rules (see below)
├───destructive         // Approach for destructive deployment to delete custom metadata records
├───flexipages          // Regression record pages (Account, Contact) with the bundles on tabs
├───planning            // Planning files tracked by AI: indicators, extensions, records, expected results, screenshot matrix
├───playwright          // Capture specs (bundle screenshots, keys) and their output
├───prod_only           // Generated XML + package.xml for the `data/prod_only` records
│   └───customMetadata
└───scripts             // Supportive scripts for the regression process
```

## Generating CMDT Records from CSV

```bash
sf cmdt generate records \
--output-directory regression/customMetadata \
--type-name Indicator_Bundle \
--csv regression/data/bundles.csv \
--name-column MasterLabel
```

```bash
sf cmdt generate records \
--output-directory regression/customMetadata \
--type-name Indicator_Item \
--csv regression/data/items.csv \
--name-column MasterLabel
```

```bash
sf cmdt generate records \
--output-directory regression/customMetadata \
--type-name Indicator_Item_Extension \
--csv regression/data/extensions.csv \
--name-column MasterLabel
```

```bash
sf cmdt generate records \
--output-directory regression/customMetadata \
--type-name Indicator_Bundle_Item \
--csv regression/data/bundle_items.csv \
--name-column MasterLabel
```

### The `prod_only` records

A few configurations cannot be deployed to an org that has the newer validation rules introduced in v0.5+ (for example an image without a fallback icon, or a rule with both text and numeric criteria). They still matter for `regression_prod`, which runs the released package without those rules for v0.4. `scripts/build_cmdt_csvs.py` writes them to `regression/data/prod_only/` (14 records: 4 items, 4 bundle items, 6 extensions) instead of the base CSVs. Bundles are never split, so the record pages do not change.

Which records are `prod_only` comes from the `env` column of `planning/indicators.csv` and `planning/extensions.csv`. A bundle item follows its item.

Generate their XML into a separate folder so the base `regression/customMetadata` folder stays deployable everywhere:

```bash
sf cmdt generate records \
--output-directory regression/prod_only/customMetadata \
--type-name Indicator_Item \
--csv regression/data/prod_only/items.csv \
--name-column MasterLabel
```

```bash
sf cmdt generate records \
--output-directory regression/prod_only/customMetadata \
--type-name Indicator_Item_Extension \
--csv regression/data/prod_only/extensions.csv \
--name-column MasterLabel
```

```bash
sf cmdt generate records \
--output-directory regression/prod_only/customMetadata \
--type-name Indicator_Bundle_Item \
--csv regression/data/prod_only/bundle_items.csv \
--name-column MasterLabel
```

Rebuild the CSVs (the script refuses to overwrite existing files unless you pass `--force`, so hand edits are not lost by accident):

```bash
python regression/scripts/build_cmdt_csvs.py --force
```

## Add Namespace After Generation

In order to deploy when the managed package is installed, we need to have a namespace prefix. `scripts/namespace_cmdt_records.py` prefixes each `<field>` and renames each `Indicator_*.md-meta.xml` file. Record labels and relationship values (e.g. `Indicator_Bundle__c` = `RB01_...`) are left alone, since those are record developer names.

Run from the repo root:

```bash
python regression/scripts/namespace_cmdt_records.py --dry-run   # preview
python regression/scripts/namespace_cmdt_records.py             # apply
python regression/scripts/namespace_cmdt_records.py path/to/dir # a different directory
```

The script converts between styles. The target style decides the output, and existing files can be in either style or un-prefixed.

```bash
python regression/scripts/namespace_cmdt_records.py --cci --dry-run   # inds__ -> CCI tokens (preview)
python regression/scripts/namespace_cmdt_records.py --cci             # apply
python regression/scripts/namespace_cmdt_records.py                   # CCI tokens -> inds__
```

The directory defaults to `regression/customMetadata`. Pass `regression/prod_only/customMetadata` to convert the `prod_only` files the same way.

### Namespace styles

| Style | Command | Fields | File names |
|-------|---------|--------|------------|
| `inds__` (default) | `python regression/scripts/namespace_cmdt_records.py` | `<field>inds__Active__c</field>` | `inds__Indicator_Bundle.RB01_....md-meta.xml` |
| CumulusCI tokens | `python regression/scripts/namespace_cmdt_records.py --cci` | `<field>%%%NAMESPACE%%%Active__c</field>` | `___NAMESPACE___Indicator_Bundle.RB01_....md-meta.xml` |

Use `inds__` to deploy straight to an org with the package installed. Use `--cci` when CumulusCI should decide whether to inject the namespace at deploy time (the style used in `unpackaged/config/sample_*/`).

The script is idempotent and also converts between styles: files can be un-prefixed, `inds__`, or CCI-token prefixed, and everything is brought to the style you ask for. Anything already in that style is skipped, so it is safe to repeat. Line endings are preserved.

## Deploying CMDT Records

Using the generic `package.xml` we are able to deploy all of these custom metadata records.

For standard deployment without namespace injection:

```bash
sf project deploy start \
--metadata-dir regression
```

If using the standard CCI namespace injection (see other parameters if necessay, such as `--namespace_strip`, `--namespace_inject`, or `--namespaced_org`):

```bash
cci task run deploy \
--path regression/customMetadata
```

### Deploying the `prod_only` records

Deploy the `prod_only` set **only** to an org without the newer validation rules (`regression_prod`). Deploying it to `regression_dev` fails on those rules. Deploy the base set first, since the `prod_only` bundle items point at items that are in the base bundles.

```bash
cci task run deploy \
--path regression/prod_only/customMetadata
```

Or, without namespace injection:

```bash
sf project deploy start \
--metadata-dir regression/prod_only
```

On `regression_dev` the bundles that hold `prod_only` items (`RB01` and `RB02c`) show fewer avatars, and the rules that failed are simply absent, so expected results differ there.

## Load Record Data

```bash
cci task run load_dataset \
--mapping datasets/regression/regression.mapping.yml \
--sql_path datasets/regression/regression.dataset.sql
```

## Deleting Record Data?

```bash
cci task run delete_data \
--objects Entitlement,Account,Contact
```

## Capturing Screenshots (Playwright)

One-time setup (`@playwright/test` is a devDependency at the repo root; this also downloads the actual browser binary, which `npm install` does not):

```bash
npm install
npx playwright install chromium
```

Run from `regression/playwright` (or `npm run test:regression -- <spec>` from the repo root). The browser is visible on purpose so a person can watch. Everything is read-only; no data in the org is changed. Set `REGRESSION_ORG` to a different org alias (default `Salesforce-Indicators__regression_prod`) and `REGRESSION_THEME` to keep each theme's output separate -- inferred from the org alias (see `inferTheme` in `lib.ts`) unless overridden. **Run these in the foreground, not backgrounded** -- a headed run backgrounded in an automated environment has stalled indefinitely with no error in this project's history (see `regression-indicator-capture` skill).

```bash
npx playwright test capture.spec.ts   # every bundle x record: image + rendered avatars compared with planning/expected.csv
npx playwright test keys.spec.ts      # one key per bundle (image + text) from the Indicators Setup page
```

- `capture.spec.ts` writes `capture_report.csv` with `PASS`, `KNOWN` (a difference already explained by a known issue) or `DIFF` (unexplained) per shot. Use `ONLY_BUNDLES=RB01,RB06`, `ONLY_RECORDS=ACC-01`, or `ONLY_OBJECT=Account` to run a subset.
- `keys.spec.ts` uses the selector on the Indicators Setup page. The page path is `inds__Indicators_Setup` where the package is installed and `Indicators_Setup` where the source is deployed (override with `SETUP_PAGE`).
- The expected results (`planning/expected.csv`) describe the *intended* behavior, not what the code does today. Regenerate them and the screenshot matrix after changing the planning tables:

```bash
python regression/scripts/build_expected.py
python regression/scripts/build_shot_matrix.py
```
