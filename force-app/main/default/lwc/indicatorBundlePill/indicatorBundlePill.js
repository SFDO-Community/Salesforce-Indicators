import { LightningElement, api } from 'lwc';

export default class IndicatorBundlePill extends LightningElement {
    @api fld;
    @api indsSize;
    @api indsShape;
    @api indClickable;

    get pillClass() {
        return this.indClickable ? 'slds-pill slds-pill_link clickable' : 'slds-pill slds-pill_link';
    }
}