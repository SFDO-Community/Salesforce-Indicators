import { LightningElement, api, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';

/**
 * Indicator Bundle (Experience)
 * Thin wrapper that exposes indicatorBundle in Experience Cloud contexts.
 * - Keeps original indicatorBundle targets unchanged (Record Pages only)
 * - Resolves recordId/objectApiName from @api or URL state
 * - Forces admin-only UI (refresh) off by default for sites
 */
export default class IndicatorBundleExperience extends LightningElement {
    // Pass-through/public configuration
    @api bundleName;
    @api titleStyle = 'Lightning Card';
    @api showTitle;
    @api showDescription;
    @api indsSize = 'large';
    @api indsShape = 'base';
    @api showRefresh = false; // default input; wrapper will force false for Experience
    @api mappedField;
    @api showFooter = false;

    // Context (can be provided by admin or URL)
    @api recordId;
    @api objectApiName;

    _state = {};
    @wire(CurrentPageReference)
    parseRef(ref) {
        this._state = ref?.state || {};
    }

    // Resolve recordId/objectApiName from provided @api first, then URL params commonly used in communities
    get resolvedRecordId() {
        return this.recordId || this._state.recordId || this._state.c__recordId || null;
    }

    get resolvedObjectApiName() {
        return this.objectApiName || this._state.objectApiName || this._state.c__objectApiName || null;
    }

    // For Experience Cloud, keep admin-only refresh actions disabled
    get resolvedShowRefresh() {
        return false;
    }
}
