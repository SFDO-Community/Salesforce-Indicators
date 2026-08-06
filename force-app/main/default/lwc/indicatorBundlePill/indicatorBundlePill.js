import { LightningElement, api } from 'lwc';

export default class IndicatorBundlePill extends LightningElement {
    @api indText = '';
    @api indIcon = 'standard:marketing_actions';
    @api indImage;
    @api indHoverText = '';
    @api indAltText = '';
    @api indsSize = "x-small";
    @api indsShape;
    @api indBackgroundColor;
    @api indForegroundColor;
    @api indClickable;
    @api indIsTouch = false; // See handleActionClick.

    get pillClass() {
        return this.indClickable ? 'slds-pill slds-pill_link clickable' : 'slds-pill';
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
