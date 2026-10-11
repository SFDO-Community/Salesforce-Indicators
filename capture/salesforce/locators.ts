import type { Page } from '@playwright/test';

// Every selector for the download-as-json flow, keyed by business name.
// Prefer getByRole + accessible name. Salesforce's generated IDs/classes
// churn between releases — never use nth-child or a generated ID here.
export const locators = {
  appLauncher: {
    icon: (page: Page) => page.getByRole('button', { name: 'App Launcher' }),
    searchBox: (page: Page) =>
      page.getByRole('combobox', { name: 'Search apps and items...' }),
    indicatorsSetupResult: (page: Page) =>
      page.getByRole('option', { name: 'Indicators Setup' }),
  },
  indicatorsSetup: {
    bundlePicklist: (page: Page) =>
      page.getByRole('combobox', { name: 'Indicator Bundle' }),
    accountCompanyInfoOption: (page: Page) =>
      page.getByRole('option', { name: 'Account Company Info' }),
  },
  bundleDetailPanel: {
    // Accessible name is "Export"; title attribute (hover text) is
    // "Export as JSON recipe or CSV" — matches narration.
    exportButton: (page: Page) => page.getByRole('button', { name: 'Export' }),
  },
  exportModal: {
    // Scoped to the dialog — the bundle detail panel also has a button whose
    // accessible name is "Export", so an unscoped getByRole('button', {name:
    // 'Export'}) would match two elements once the modal is open.
    dialog: (page: Page) => page.getByRole('dialog'),
    heading: (page: Page) => page.getByRole('heading', { name: 'Export "Company Details"' }),
    // Note: these are SLDS custom checkbox/radio inputs whose visual box is a
    // styled <span> that intercepts pointer events on the input itself.
    // Click the associated <label> (found via its accessible/role name) —
    // it toggles the same control and doesn't get intercepted.
    exportItemsOnlyCheckboxLabel: (page: Page) =>
      page.getByRole('dialog').locator('label').filter({ hasText: 'Export items only (exclude the bundle itself)' }),
    exportAsJsonRadioLabel: (page: Page) =>
      page.getByRole('dialog').locator('label').filter({ hasText: 'JSON recipe (share with another admin, or preview later)' }),
    exportAsCsvRadioLabel: (page: Page) =>
      page.getByRole('dialog').locator('label').filter({ hasText: 'CSV (import directly via Salesforce Inspector Reloaded)' }),
    cancelButton: (page: Page) => page.getByRole('dialog').getByRole('button', { name: 'Cancel' }),
    exportButton: (page: Page) => page.getByRole('dialog').getByRole('button', { name: 'Export' }),
  },
};
