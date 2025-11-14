import { LightningElement, api } from 'lwc';

export default class IndicatorListItem extends LightningElement {
    @api indSize = 'large';
    @api indShape = 'base';
    @api indText = '';
    @api indImage = '';
    @api indIcon = 'standard:all' ;
    @api indHoverText = '';

    @api iconSource;
    @api sourceValue;

    @api get indBackgroundColor() {
        return this._indBackgroundColor;
    };
    set indBackgroundColor(value) {
        this._indBackgroundColor = value;
        if (this.iconElement) {
            this.iconElement.style.setProperty('--backgroundColor', this.indBackgroundColor);
            console.log(`setting background colour to ${this.indBackgroundColor}`);
        } else {
            console.log(`iconElement not found`);
        }
    }
    _indBackgroundColor;
    @api get indForegroundColor() {
        return this._indForegroundColor;
    };
    set indForegroundColor(value) {
        this._indForegroundColor = value;
        if (this.iconElement) {
            this.iconElement.style.setProperty('--foregroundColor', this.indForegroundColor);
            console.log(`setting foreground colour to ${this.indForegroundColor}`);
        } else {
            console.log(`iconElement not found`);
        }
    }
    _indForegroundColor;

    get indClass() {
        let classValue = ['indicatorIcon'];
        // if(this.indBackgroundColor || this.indForegroundColor){
        //     classValue = 'indicatorIcon ';
        // }
        
        if(this.indSize == 'large'){
            classValue.push('slds-var-m-right_small','slds-var-m-vertical_medium');
        }
        else {
            classValue.push('slds-var-m-right_x-small', 'slds-var-m-vertical_small');
        }

        if(this.indIcon == 'none'){
            classValue.push('slds-var-m-right_xxx-small', 'slds-var-m-vertical_small', 'slds-avatar__initials_inverse');
        }
        return classValue.join(' ');
    }

    get iconElement() {
        return this.template.querySelector(".indicatorIcon");
    }

    get indText() {
        return (this.iconSource === 'staticText') ? (this.sourceValue || ' ') : '';
    }

    get indUrl() {
        return (this.iconSource === 'url' || this.iconSource === 'staticResource') ? this.sourceValue : '';
    }
    
    get indIcon() {
        if (this.iconSource === 'sldsIcon') {
            return this.sourceValue;
        } else if (this.iconSource === 'staticText') {
            return 'standard:empty';
        } else {
            return '';
        }
    }

    /* No longer need to set CSS on renderedCallback because it's controlled in setters for colors
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
    */
}