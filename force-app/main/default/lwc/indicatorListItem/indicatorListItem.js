import { LightningElement, api } from 'lwc';

export default class IndicatorListItem extends LightningElement {
    @api indSize = 'large';
    @api indShape = 'base';
    @api indText = 'IND';
    @api indImage = '';
    @api indIcon = 'standard:marketing_actions';
    @api indHoverText = '';

    get indClass() {
        return this.indSize == 'large' ? 'slds-m-right_medium slds-m-vertical_medium' : 'slds-m-right_small slds-m-vertical_small';
    }
}