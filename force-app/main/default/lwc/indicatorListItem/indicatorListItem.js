import { LightningElement, api } from 'lwc';

export default class IndicatorListItem extends LightningElement {
    @api indSize = 'large';
    @api indShape = 'base';
    @api indText = 'IND';
    @api indImage = '';
    @api indIcon = 'standard:marketing_actions';
    @api indHoverText = '';

    get indClass() {
        return this.indSize == 'large' ? 'slds-var-m-right_medium slds-var-m-vertical_medium' : 'slds-var-m-right_small slds-var m-vertical_small';
    }
}