import { LightningElement, api } from 'lwc';

export default class IndicatorListItem extends LightningElement {
    @api indSize = 'large';
    @api indShape = 'base';
    @api indText = '⛳';
    @api indImage = '';
    @api indIcon = 'standard:marketing_actions';
    @api indHoverText = '';
    @api foregroundColor;
    @api backgroundColor;

    get indClass() {
        let classValue = '';
        // if(!this.foregroundColor || !this.backgroundColor){
        //     classValue = 'indicator-icon ';
        // }
        
        if(this.indSize == 'large'){
            classValue += 'slds-var-m-right_small slds-var-m-vertical_medium';
        }
        else {
            classValue += 'slds-var-m-right_x-small slds-var-m-vertical_small';
        }

        if(this.indIcon == 'none'){
            classValue += 'slds-var-m-right_xxx-small slds-var-m-vertical_small slds-avatar__initials_inverse'
        }
        
        return classValue;
    }

    // renderedCallback() { 
    //     this.initCSSVariables();
    // }

    // initCSSVariables() {
    //     this.template.querySelector('.indicator-icon').style.setProperty('--backgroundColor', this.backgroundColor);
    //     this.template.querySelector('.indicator-icon').style.setProperty('--foregroundColor', this.foregroundColor);
    // }
}