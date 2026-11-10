import { LightningElement, api } from 'lwc';
import { applyColorVars } from 'c/indicatorCssVars';

export default class IndicatorListItem extends LightningElement {
    @api indSize = 'large';
    @api indShape = 'base';
    @api indText = '';
    @api indImage = '';
    @api indIcon = 'standard:default';
    @api indHoverText = '';
    @api indAltText = '';
    @api indBackgroundColor;
    @api indForegroundColor;
    @api indClickable;
    @api indCompact = false;
    @api indShowActionBadge = false; // Avatar rows only - the pill's compact reuse of this component never sets this, so it never doubles up with the pill's own blue-link affordance.

    // Only rendered (see .html) when indShowActionBadge is true, so this never affects the pill's
    // reuse of this component. width/height are overridden to auto in CSS so this box always hugs
    // whatever lightning-avatar actually renders, rather than trusting SLDS's assumed pixel sizing
    // for a raw .slds-avatar (a different, non-base-component element) to match.
    get avatarGroupClass() {
        return 'slds-avatar-group ' + (this.indSize === 'large' ? 'slds-avatar-group_large' : 'slds-avatar-group_medium');
    }

    get indClass() {
        let classValue = '';
        if(this.indBackgroundColor || this.indForegroundColor){
            classValue = 'indicatorIcon ';
        }

        if(!this.indCompact){
            if(this.indSize == 'large'){
                classValue += 'slds-var-m-right_small slds-var-m-vertical_medium';
            }
            else {
                classValue += 'slds-var-m-right_x-small slds-var-m-vertical_small';
            }
        }

        if(this.indIcon == 'none'){
            classValue += this.indCompact
                ? ' slds-avatar__initials_inverse'
                : ' slds-var-m-right_xxx-small slds-var-m-vertical_small slds-avatar__initials_inverse';
        }

        return classValue;
    }

    renderedCallback() { 
        this.initCSSVariables();
    }

    initCSSVariables() {
        applyColorVars(this, '.indicatorIcon', {
            backgroundColor: this.indBackgroundColor,
            foregroundColor: this.indForegroundColor
        });
    }
}