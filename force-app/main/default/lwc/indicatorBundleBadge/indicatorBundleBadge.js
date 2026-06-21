import { LightningElement, api } from 'lwc';
import { applyColorVars } from 'c/indicatorCssVars';

export default class IndicatorBundleBadge extends LightningElement {

    @api indText = '';
    @api indIcon = 'standard:marketing_actions';
    @api indHoverText = '';
    @api indIconPosition = 'start';
    @api indBackgroundColor;
    @api indForegroundColor;
    @api indTextColor;
    @api indClickable;

    get indClass() {
        let classValue = '';
        if(this.indBackgroundColor || this.indForegroundColor || this.indTextColor){
            classValue = 'indicatorBadge ';
        }
        if(this.indClickable){
            classValue += 'clickable';
        }

        return classValue;
    }

    renderedCallback() { 
        this.initCSSVariables();
    }

    initCSSVariables() {
        applyColorVars(this, '.indicatorBadge',
            {
                backgroundColor: this.indBackgroundColor,
                foregroundColor: this.indForegroundColor,
                textColor: this.indTextColor
            },
            {
                backgroundColor: '#f3f3f3',
                foregroundColor: '#747474',
                textColor: '#181818'
            }
        );
    }
}