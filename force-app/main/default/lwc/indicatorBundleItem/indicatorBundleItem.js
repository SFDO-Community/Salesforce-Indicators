import { LightningElement, api } from 'lwc';

const VALID_ICON_PREFIXES = new Set(['action','custom','doctype','standard','utility']);

export default class IndicatorListItem extends LightningElement {
    @api indSize = 'large';
    @api indShape = 'base';
    // Backing fields for backward compatibility
    _indText = '';
    _indImage = '';
    _indIcon = '';
    @api indHoverText = '';

    @api iconSource;
    @api sourceValue;

    @api get indBackgroundColor() {
        return this._indBackgroundColor;
    };
    set indBackgroundColor(value) {
        this._indBackgroundColor = value;
    }
    _indBackgroundColor;
    @api get indForegroundColor() {
        return this._indForegroundColor;
    };
    set indForegroundColor(value) {
        this._indForegroundColor = value;
    }
    _indForegroundColor;

    // Backwards compatible setters/getters when parent passes values directly
    @api get indText() {
        // If controlled by iconSource/staticText mode, prefer computed
        if (this.iconSource === 'staticText') {
            return this.sourceValue || ' ';
        }
        return this._indText;
    }
    set indText(value) {
        this._indText = value || '';
    }

    @api get indImage() {
        if (this.iconSource === 'url' || this.iconSource === 'staticResource') {
            return this.sourceValue || '';
        }
        return this._indImage;
    }
    set indImage(value) {
        this._indImage = value || '';
    }

    @api get indIcon() {
        if (this.iconSource === 'sldsIcon') {
            return this.sanitizeIcon(this.sourceValue);
        } else if (this.iconSource === 'staticText') {
            return 'standard:empty';
        } else if (this.iconSource === 'url' || this.iconSource === 'staticResource') {
            return '';
        }
        // Honor parent-specified icon exactly unless empty
        return this.sanitizeIcon(this._indIcon);
    }
    set indIcon(value) {
        this._indIcon = value || '';
    }

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



    get indUrl() {
        return (this.iconSource === 'url' || this.iconSource === 'staticResource') ? this.sourceValue : '';
    }

    get avatarStyle() {
        let styles = [];
        if (this.indBackgroundColor) {
            styles.push(`--slds-c-avatar-color-background: ${this.indBackgroundColor}`);
        }
        if (this.indForegroundColor) {
            styles.push(`--slds-c-avatar-text-color: ${this.indForegroundColor}`);
        }
        return styles.length > 0 ? styles.join('; ') : '';
    }

    sanitizeIcon(name) {
        // Do not force a default. If a value is provided, validate minimal structure.
        if (!name || typeof name !== 'string') {
            return '';
        }
        const trimmed = name.trim();
        const parts = trimmed.split(':');
        if (parts.length !== 2) {
            return trimmed; // preserve as provided; avoids overriding valid metadata
        }
        const prefix = parts[0].toLowerCase();
        const icon = parts[1];
        if (!VALID_ICON_PREFIXES.has(prefix) || !icon) {
            return trimmed; // preserve provided string instead of substituting
        }
        return `${prefix}:${icon}`;
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
