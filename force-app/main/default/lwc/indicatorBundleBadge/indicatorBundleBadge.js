import { LightningElement, api } from 'lwc';
import { applyColorVars } from 'c/indicatorCssVars';

export default class IndicatorBundleBadge extends LightningElement {

    @api indText = '';
    @api indIcon = 'standard:default';
    @api indHoverText = '';
    @api indAltText = '';
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
        // If any one of the three is configured, the other two need a coherent fallback rather
        // than staying unset - lightning-badge doesn't degrade gracefully to its own default
        // background/border when only e.g. text color is overridden (confirmed by testing: it
        // renders with no visible background/border at all, not a plain default badge). The
        // fallback must be theme-aware (--slds-g-* global hooks track dark mode automatically)
        // rather than fixed hex - fixed hex was tried before and broke in dark mode.
        applyColorVars(this, '.indicatorBadge',
            {
                backgroundColor: this.indBackgroundColor,
                foregroundColor: this.indForegroundColor,
                textColor: this.indTextColor
            },
            {
                backgroundColor: 'var(--slds-g-color-surface-container-3)',
                foregroundColor: 'var(--slds-g-color-on-surface-1)',
                textColor: 'var(--slds-g-color-on-surface-1)'
            }
        );
    }
}