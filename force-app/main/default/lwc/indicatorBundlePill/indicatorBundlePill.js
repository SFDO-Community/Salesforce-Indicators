import { LightningElement, api } from 'lwc';

export default class IndicatorBundlePill extends LightningElement {
    @api indText = '';
    @api indIcon = 'standard:marketing_actions';
    @api indImage;
    @api indHoverText = '';
    @api indAltText = '';
    @api indsSize = "x-small";
    @api indsShape;
    @api indBackgroundColor;
    @api indForegroundColor;
    @api indClickable;

    get pillClass() {
        return this.indClickable ? 'slds-pill slds-pill_link clickable' : 'slds-pill slds-pill_link';
    }
}
