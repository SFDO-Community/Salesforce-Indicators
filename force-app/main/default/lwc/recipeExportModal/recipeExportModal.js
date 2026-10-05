import { api, track, wire } from 'lwc';
import LightningModal from 'lightning/modal';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getBundleOptions from '@salesforce/apex/IndicatorListBundleSelector.getBundleOptions';
import {
    buildRecipe,
    recipeToCsvRows,
    rowsToCsv,
    CSV_HEADERS
} from 'c/recipeGenerator';

const CSV_FILENAMES = {
    bundles: 'bundles.csv',
    items: 'items.csv',
    bundleItems: 'bundle_items.csv',
    extensions: 'extensions.csv'
};

export default class RecipeExportModal extends LightningModal {
    // Wire-shaped bundle, same object already fed to c-key by configurationManager/
    // indicatorBundle (real bundle, or the '-1' Unbundled Items pseudo-bundle).
    @api bundle;

    @api forceCsvOnly = false;

    @track selectedItemDeveloperNames = [];
    excludeBundle = false;
    format = 'json';
    attachToBundleDeveloperName = '';

    @wire(getBundleOptions)
    wiredBundleOptions;

    connectedCallback() {
        this.selectedItemDeveloperNames = (this.bundle?.Items ?? []).map((item) => item.DeveloperName);
        if (this.forceCsvOnly) {
            this.format = 'csv';
        }
    }

    get isBundle() {
        return !!this.bundle?.DeveloperName;
    }

    // Only meaningful when the export will actually be item-only — either the source
    // bundle is already the '-1' Unbundled Items pseudo-bundle, or the user checked
    // "export items only" for a real bundle.
    get isItemOnlyExport() {
        return !this.isBundle || this.excludeBundle;
    }

    get showAttachToBundlePicker() {
        return this.format === 'csv' && this.isItemOnlyExport;
    }

    get isCsvFormat() {
        return this.format === 'csv';
    }

    get attachToBundleOptions() {
        const options = (this.wiredBundleOptions?.data ?? [])
            // '-1' is the Unbundled Items pseudo-bundle, not a real bundle to join.
            .filter((o) => o.value !== '-1')
            .map((o) => ({ label: o.label, value: o.value }));
        return [{ label: "Don't attach — leave unbundled", value: '' }, ...options];
    }

    get modalTitle() {
        return this.isBundle
            ? `Export "${this.bundle.CardTitle || this.bundle.MasterLabel}"`
            : 'Export Unbundled Items';
    }

    get itemOptions() {
        return (this.bundle?.Items ?? []).map((item) => ({
            label: item.MasterLabel || item.FieldLabel || item.DeveloperName,
            value: item.DeveloperName
        }));
    }

    get formatOptions() {
        return [
            { label: 'JSON recipe (share with another admin, or preview later)', value: 'json' },
            { label: 'CSV (import directly via Salesforce Inspector Reloaded)', value: 'csv' }
        ];
    }

    get noItemsSelected() {
        return this.selectedItemDeveloperNames.length === 0;
    }

    handleItemSelectionChange(event) {
        this.selectedItemDeveloperNames = event.detail.value;
    }

    handleExcludeBundleChange(event) {
        this.excludeBundle = event.detail.checked;
    }

    handleFormatChange(event) {
        this.format = event.detail.value;
    }

    handleAttachToBundleChange(event) {
        this.attachToBundleDeveloperName = event.detail.value;
    }

    handleCancel() {
        this.close('cancelled');
    }

    handleExport() {
        try {
            const recipe = buildRecipe(this.bundle, {
                includedItemDeveloperNames: this.selectedItemDeveloperNames,
                excludeBundle: this.excludeBundle
            });

            const baseName = recipe.bundle?.DeveloperName || 'unbundled_items';

            if (this.format === 'json') {
                this.downloadFile(`${baseName}.recipe.json`, JSON.stringify(recipe, null, 2), 'application/json');
            } else {
                const rowSets = recipeToCsvRows(recipe, {
                    attachToBundleDeveloperName: this.showAttachToBundlePicker
                        ? this.attachToBundleDeveloperName || null
                        : null
                });
                const filesToDownload = Object.keys(CSV_FILENAMES)
                    .map((key) => ({ key, rows: rowSets[key] }))
                    .filter(({ rows }) => rows.length > 0);

                // Trigger synchronously, in this same click's call stack — no
                // setTimeout. Deferring risks losing the user-gesture context a
                // browser requires to allow a download to fire at all, which produces
                // exactly a silent no-op with no catchable JS error.
                //
                // MIME type is 'text/plain', not 'text/csv': Lightning Web Security
                // enforces an allow-list of Blob MIME types and rejects 'text/csv'
                // ("Unsupported MIME type"). The .csv extension on the download
                // filename is what makes the saved file open correctly — the Blob's
                // declared type doesn't need to match it.
                filesToDownload.forEach(({ key, rows }) => {
                    this.downloadFile(CSV_FILENAMES[key], rowsToCsv(CSV_HEADERS[key], rows), 'text/plain');
                });
            }

            this.close('exported');
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error('Recipe export failed', e);
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Export failed',
                    message: e?.message || String(e),
                    variant: 'error'
                })
            );
        }
    }

    downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        // Built and torn down on document.body rather than via a template ref: the
        // CSV path staggers multiple downloads with setTimeout, and this.close()
        // (called right after scheduling them) unmounts the modal — including any
        // ref into its own template — before those deferred calls run. An anchor
        // outside the modal's DOM survives that regardless of timing.
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Revoking synchronously right after click() races the browser actually
        // starting to read the blob — especially likely under Lightning Web
        // Security's sandboxed iframe. Defer it instead of revoking immediately.
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
}
