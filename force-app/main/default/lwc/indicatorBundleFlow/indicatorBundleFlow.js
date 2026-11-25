import { LightningElement, api } from 'lwc';

export default class IndicatorBundleFlow extends LightningElement {
    @api recordId;
    @api bundleName;
    @api titleStyle = 'Lightning Card';
    @api showTitle;
    @api showDescription;
    @api indsStyle = 'avatar';
    @api indsSize = 'large';
    @api indsShape = 'base';
    @api showRefresh;
    showFooter = false;

    get resolvedRecordId() {
        return this.recordId;
    }
}
