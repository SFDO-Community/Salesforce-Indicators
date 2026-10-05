# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Salesforce Indicators is a Custom-Metadata-driven Lightning Web Component package (namespace `inds`) maintained by the Salesforce.org Open Source Commons community. It lets admins configure visual "indicators" (icons/badges/pills with hover text, colors, and click actions) on Lightning record pages purely through Custom Metadata Type records — no Apex/LWC changes needed per use case.

The project is SFDX source-format (`force-app` is the single package directory, see `sfdx-project.json`) and is built/released with **CumulusCI (`cci`)**, not raw `sf`/npm scripts. There is no `package.json` checked into the repo even though LWC `__tests__/` jest specs exist — don't assume `npm test`/jest tooling is wired up locally; it would need to be set up separately (e.g. `sfdx-lwc-jest`) before those tests are runnable.

## Common Commands

Org setup follows `.a4drules/workflows/new-inds-org.md`: prefer known CCI plans/flows/tasks, then the Salesforce DX MCP server, and only fall back to raw `sf` if MCP is unavailable.

```bash
# List configured orgs / check default + scratch org expiry
cci org list

# Create + deploy a dev/feature scratch org
cci flow run dev_org --org dev

# Create + deploy a demo org (installs package + sample/training config + sample data)
cci flow run config_demo --org demo

# Set default org / dev hub
cci org default <alias>
cci service default devhub <alias>

# Run Apex tests (classes/methods matching `%Tests`, see cumulusci.yml `test.name_match`)
cci task run run_tests --org <alias>   # requires 75% org-wide coverage (run_tests.required_org_code_coverage_percent)
```

Useful flows/tasks defined in `cumulusci.yml`:
- `sample_inds` — deploys the sample Account/Contact indicator config + page layouts (`unpackaged/config/sample_AccountContact`).
- `customer_org` — installs the managed package, then runs `sample_inds`, then deploys training indicators.
- `config_dev` / `config_demo` — generate Snowfakery test data (`recipes/recipe.*.yml`) and deploy sample/training config for local development/demos.
- `deploy_sample_indicators*`, `deploy_training_indicators` — individual unpackaged deploy tasks under `unpackaged/config/`.
- `generate_leads`, `generate_accounts_and_contacts` — Snowfakery data generation tasks.

Security/code-analyzer scans (run before submitting Apex changes — see `unpackaged/notes/developer_notes.md`):
```bash
sf scanner run --format=csv --outfile=CodeAnalyzerGeneral.csv --target="./" --category="Security"
sf scanner run dfa --format=csv --outfile=CodeAnalyzerDFA.csv --target ".\**\*.cls,!.\**\IndicatorController.cls" --projectdir="./force-app/" --category="Security"
sf scanner run dfa --format=csv --outfile=CodeAnalyzerDFA_1.csv --target="./force-app/main/default/classes/IndicatorController.cls#getNewCmdtUrls" --projectdir="./force-app" --category="Security"
sf scanner run dfa --sfgejvmargs "-Xmx5g" --format=csv --outfile=CodeAnalyzerDFA_2.csv --target="./force-app/main/default/classes/IndicatorController.cls#getIndicatorBundle" --projectdir="./force-app" --category="Security"
```
`IndicatorController.cls` is scanned separately (whole-class DFA times out / can OOM) because of the `%` character CCI/NPSP injects and its query complexity.

## Architecture

**Configuration model (Custom Metadata Types, no custom objects/records):**
- `Indicator_Bundle__mdt` — a named group of indicators tied to one sObject; drives the card title/icon/description shown on a record page.
- `Indicator_Item__mdt` — a single indicator's field mapping, icon/text/hover/color, and "false/blank" (inverse) display values.
- `Indicator_Bundle_Item__mdt` — junction between bundle and item, carrying `Order__c` and click-action config (`Action_Type__c`: URL or Flow Modal, `Action_Target__c`).
- `Indicator_Item_Extension__mdt` — per-item override rules (string contains/equals/starts-with, or numeric min/max range) that swap in different icon/text/color/hover values when a record's field value matches.

**Apex layer (`force-app/main/default/classes`):**
- `Cmdt.cls` — loads *all* CMDT rows for the four objects above into static maps once per transaction (static initializer; cleared under `Test.isRunningTest()`). Every other class reads CMDT through `Cmdt`'s getters (`getBundle`, `getBundleItems`, `getItem`, `getExtensionsForItem`, `getAllOrphanItems`, ...) instead of querying CMDT directly — keep that pattern when adding new CMDT-backed features.
- `IndicatorController.cls` — `@AuraEnabled` wrapper classes (`IndicatorBundle`/`IndicatorItem`/`IndicatorExtension`) assembled from `Cmdt` data plus `EntityDefinition`/`EntityParticle` lookups (to resolve field API names/labels for non-"Advanced Field" items). `getIndicatorBundle(bundleDevName)` is the main cacheable entry point the LWC wires to; passing `'-1'` returns indicator items not assigned to any bundle ("Unbundled Items").
- `IndicatorListBundleSelector.cls` — a `VisualEditor.DynamicPickList` so App Builder can offer a dropdown of active bundles for the `bundleName` property, plus an `@AuraEnabled getBundleOptions()` for LWC-side pickers (includes the `-1` "Unbundled Items" option).
- `Build.cls` (`@isTest`) — fluent test-data builders (`Build.aBundle()`, `Build.anItem()`, `Build.aBundleItem()`, `Build.anExtension()`) used by `*Tests.cls` classes instead of inline SOQL/DML; extend these builders rather than hand-rolling CMDT records in new tests.

**LWC layer (`force-app/main/default/lwc`):**
- `indicatorBundle` is the main Record Page component. Flow: wire `IndicatorController.getIndicatorBundle` → build a dynamic `optionalFields` list (`apiFieldnameDefinitions`) from the returned items' field API names (plus any merge-field tokens in `ActionTarget`) → wire `lightning/uiRecordApi.getRecord` with that field list → for each active item, evaluate its `Extensions` client-side against the fetched value (string match or min/max range) to pick the effective icon/text/hover/colors → render via style-specific child components (`indicatorBundleItem`, `indicatorBundleBadge`, `indicatorBundlePill`) selected by the `indsStyle` property (avatar/badge/pill).
- Click actions: `Action_Type__c` of `URL` navigates via `NavigationMixin`; `Flow Modal` opens `flowModal` (a `LightningModal`) to run a Flow, tracking `interviewId` across pause/resume and calling `notifyRecordUpdateAvailable` on Finish so the record page refreshes. `ActionTarget` URLs/Flow inputs support `{Field_Api_Name}` merge tokens resolved against the wired record before the action fires.
- `indicatorBundleKey` / `key` / `indicatorKeyRow` render the "key"/legend modal (opened from `indicatorBundle`'s info icon) describing each configured indicator.
- `configurationManager` and `indicatorBundleExperience` provide admin/Experience-Cloud-facing surfaces over the same CMDT data.
- `illustration` / `illustrationImage` are shared empty-state/error-state presentational components used across the above when there's no bundle, no items, or a config/field error.
- Custom permission `Manage_Indicator_Key` gates admin-only UI (e.g. the key/legend management entry points).

**Unpackaged vs. packaged metadata:**
- `force-app/` is the only package directory (deployed as the managed package) — keep it free of org-specific/sample data.
- `unpackaged/config/` holds deploy-only sample and training configuration (`sample_AccountContact`, `sample_Lead`, `training_Indicators`) applied via dedicated CCI tasks/flows after install — used for demos/onboarding, not shipped in the package.
- `recipes/*.yml` are Snowfakery recipes for generating sample Lead/Account/Contact data in dev and demo orgs.

## CI/CD

GitHub Actions delegate to reusable workflows in `SFDO-Community/standard-workflows`:
- `feature/**` branch pushes → feature test workflow.
- push to `main` → uploads a 2GP beta release.
- production 2GP release upload is a manual `workflow_dispatch` only.

`CODEOWNERS` reserves `*.py`, `cumulusci.yml`, `/tasks`, `/.github`, and `/scripts` for `@SFDO-Community/sfdo-release-engineers` — expect changes in those paths to need that team's review.
