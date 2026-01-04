import { LightningElement, api } from 'lwc';

export default class IndicatorBundleBadge extends LightningElement {

    @api indText = '';
    @api indIcon = 'standard:marketing_actions';
    @api indHoverText = '';
    @api indIconPosition = 'start';
    @api indBackgroundColor;
    @api indForegroundColor;
    @api indTextColor;

    get indClass() {
        let classValue = '';
        if(this.indBackgroundColor || this.indForegroundColor || this.indTextColor){
            classValue = 'indicatorBadge ';
        }
        
        return classValue;
    }

    renderedCallback() { 
        this.initCSSVariables();
    }

    initCSSVariables() {

        if(this.indBackgroundColor || this.indForegroundColor || this.indTextColor){
            var css = this.template.querySelector(".indicatorBadge").style;

            css.setProperty('--backgroundColor', this.indBackgroundColor ? this.indBackgroundColor : '#f3f3f3');
            css.setProperty('--foregroundColor', this.indForegroundColor ? this.indForegroundColor : '#747474');
            css.setProperty('--textColor', this.indTextColor ? this.indTextColor : '#181818');
        }

    }
}