import { LightningElement, api } from 'lwc';
import { applyColorVars } from 'c/indicatorCssVars';

export default class IndicatorBundlePill extends LightningElement {
    @api indText = '';
    @api indIcon = 'standard:default';
    @api indImage;
    @api indBadgePillText = '';
    @api indAltText = '';
    @api indsSize = "x-small";
    @api indsShape;
    @api indBackgroundColor;
    @api indForegroundColor;
    @api indTextColor;
    @api indClickable;
    @api indIsTouch = false; // See handleActionClick.

    get pillClass() {
        return this.indClickable ? 'slds-pill slds-pill_link clickable' : 'slds-pill';
    }

    renderedCallback() {
        this.initCSSVariables();
    }

    // Clickable pills keep SLDS's link-blue label color as the clickability affordance (matching
    // the border treatment on clickable badges) - a configured text color only applies when the
    // pill isn't a link.
    initCSSVariables() {
        if (this.indClickable) {
            return;
        }
        applyColorVars(this, '.slds-pill__label', {
            textColor: this.indTextColor
        });
    }

    // Matches SLDS's own pill example: the anchor exists for link styling/semantics only, not
    // real navigation - actual click handling happens on the parent's data-id listener. On touch
    // devices, preventDefault() here was found (via device testing) to interfere with the
    // browser's touch/mouse event synthesis for this real <a> element - skipping it trades a
    // harmless #-fragment navigation for reliable mouseenter/mouseleave firing on repeat taps.
    handleActionClick(event) {
        if (!this.indIsTouch) {
            event.preventDefault();
        }
    }
}
