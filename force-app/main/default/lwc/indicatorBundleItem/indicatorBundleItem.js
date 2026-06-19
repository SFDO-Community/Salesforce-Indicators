import { LightningElement, api } from 'lwc';

export default class IndicatorListItem extends LightningElement {
    @api indSize = 'large';
    @api indShape = 'base';
    @api indText = '';
    @api indImage = '';
    @api indIcon = 'standard:marketing_actions';
    @api indHoverText = '';
    @api indBackgroundColor;
    @api indForegroundColor;
    @api indClickable;

    get indClass() {
        let classValue = '';
        if(this.indBackgroundColor || this.indForegroundColor){
            classValue = 'indicatorIcon ';
        }
        
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

    renderedCallback() { 
        this.initCSSVariables();
    }

    initCSSVariables() {

        if(this.indBackgroundColor || this.indForegroundColor){
            var css = this.template.querySelector(".indicatorIcon").style;
    
            css.setProperty('--backgroundColor', this.indBackgroundColor);
            css.setProperty('--foregroundColor', this.indForegroundColor);
        }

    }
}