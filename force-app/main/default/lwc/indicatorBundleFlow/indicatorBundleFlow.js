import { LightningElement, api, wire } from 'lwc';

export default class IndicatorBundleFlow extends LightningElement {
    // Pass-through configuration
    @api recordId;
    @api bundleName;
    @api titleStyle = 'Lightning Card';
    @api showTitle;
    @api showDescription;
    @api indsSize = 'large';
    @api indsShape = 'base';
    @api showRefresh;
    showFooter = false;

    get resolvedRecordId() {
        return this.recordId;
    }
}