import { LightningElement, api, track } from 'lwc';

const FIELD_TYPE_CATEGORIES = {
    TEXT: ['Reference', 'Address', 'Email', 'Location', 'Phone', 'Picklist', 'ComboBox', 'MultiPicklist', 'String', 'TextArea', 'EncryptedString', 'URL'],
    NUMERIC: ['Currency', 'Number', 'Percent', 'Integer', 'Double', 'Int', 'Long'],
    DATE: ['Date', 'DateTime', 'Time'],
    BOOLEAN: ['Boolean'],
}

export default class IndicatorBuilderExtension extends LightningElement {
    @api indicator = {};
    @api activeVariant = {};
    @api iconOptions = [];

    get activeVariantString() {
        return JSON.stringify(this.activeVariant);
    }

    get iconSourceIs() {
        return { [this.activeVariant.iconSource]: true }
    }

    get filterTypeIs() {
        let matchingOption = this.whenToDisplayOptions.find(option => option.value == this.computedWhenToDisplay);
        return matchingOption ? { [matchingOption.showMatch]: true } : {};
    }

    get showColourOption() {
        return this.iconSourceIs.sldsIcon;
    }
    get showColourSelectors() {
        return this.iconSourceIs.staticText || (this.showColourOption && this.activeVariant.overrideColours);
    }

    get activeWhenToDisplayOptions() {
        return this.whenToDisplayOptions.filter(option => option.fieldTypes.includes(this.indicator.fieldType));
    }

    // Convert TextOperator to whenToDisplay value for the dropdown
    get computedWhenToDisplay() {
        if (!this.activeVariant || !this.activeVariant.TextOperator) {
            return this.activeVariant?.whenToDisplay;
        }

        const operator = this.activeVariant.TextOperator;
        const fieldType = this.indicator.fieldType;
        
        // Map TextOperator values to whenToDisplay values based on field type
        if (FIELD_TYPE_CATEGORIES.TEXT.includes(fieldType)) {
            switch (operator) {
                case 'Contains': return 'containsText';
                case 'Equals': return 'equalsText';
                default: return 'containsText';
            }
        } else if ([...FIELD_TYPE_CATEGORIES.NUMERIC, ...FIELD_TYPE_CATEGORIES.DATE].includes(fieldType)) {
            switch (operator) {
                case 'Equals': return 'equalsNumber';
                case 'Greater Than': return 'greaterThan';
                case 'Less Than': return 'lessThan';
                case 'Range': return 'inRange';
                default: return 'equalsNumber';
            }
        } else if (FIELD_TYPE_CATEGORIES.BOOLEAN.includes(fieldType)) {
            switch (operator) {
                case 'True': return 'isTrue';
                case 'False': return 'isFalse';
                default: return 'isTrue';
            }
        }
        
        return this.activeVariant?.whenToDisplay;
    }

    iconSourceOptions = [
        { label: 'Lightning Icon', value: 'sldsIcon' },
        { label: 'Static Text', value: 'staticText' },
        { label: 'URL', value: 'url' },
        { label: 'Static Resource', value: 'staticResource' },
    ];

    whenToDisplayOptions = [
        // { label: 'Is not blank', value: 'notBlank', fieldTypes: [...FIELD_TYPE_CATEGORIES.TEXT, ...FIELD_TYPE_CATEGORIES.NUMERIC, ...FIELD_TYPE_CATEGORIES.DATE] },
        // { label: 'Is blank', value: 'isBlank', fieldTypes: [...FIELD_TYPE_CATEGORIES.TEXT, ...FIELD_TYPE_CATEGORIES.NUMERIC, ...FIELD_TYPE_CATEGORIES.DATE] },
        { label: 'Contains text', value: 'containsText', fieldTypes: FIELD_TYPE_CATEGORIES.TEXT, showMatch: 'text' },
        { label: 'Equals', value: 'equalsText', fieldTypes: FIELD_TYPE_CATEGORIES.TEXT, showMatch: 'text' },
        { label: 'Equals', value: 'equalsNumber', fieldTypes: [...FIELD_TYPE_CATEGORIES.NUMERIC, ...FIELD_TYPE_CATEGORIES.DATE], showMatch: 'number' },
        { label: 'Is greater than', value: 'greaterThan', fieldTypes: [...FIELD_TYPE_CATEGORIES.NUMERIC, ...FIELD_TYPE_CATEGORIES.DATE], showMatch: 'number' },
        { label: 'Is less than', value: 'lessThan', fieldTypes: [...FIELD_TYPE_CATEGORIES.NUMERIC, ...FIELD_TYPE_CATEGORIES.DATE], showMatch: 'number' },
        { label: 'Is within range', value: 'inRange', fieldTypes: [...FIELD_TYPE_CATEGORIES.NUMERIC, ...FIELD_TYPE_CATEGORIES.DATE], showMatch: 'numericRange' },
        { label: 'Is true', value: 'isTrue', fieldTypes: FIELD_TYPE_CATEGORIES.BOOLEAN, showMatch: 'boolean' },
        { label: 'Is false', value: 'isFalse', fieldTypes: FIELD_TYPE_CATEGORIES.BOOLEAN, showMatch: 'boolean' },
    ];

    connectedCallback() {
    }

    handleVariantPropertyChange(event) {
        if (event.currentTarget.dataset.property) {
            let target = event.currentTarget;
            let tagName = target.tagName.toLowerCase();
            let value;
            if (tagName === 'c-icon-selector') {
                value = event.detail;
            } else if (target.type === 'checkbox') {
                value = target.checked;
            } else if (tagName === 'lightning-combobox') {
                value = event.detail.value;
            } else {
                value = target.value;
            }

            let variant = { ...this.activeVariant };

            variant[target.dataset.property] = value;
            
            // Special handling for whenToDisplay - convert back to TextOperator
            if (target.dataset.property === 'whenToDisplay') {
                const fieldType = this.indicator.fieldType;
                
                if (FIELD_TYPE_CATEGORIES.TEXT.includes(fieldType)) {
                    switch (value) {
                        case 'containsText': variant.TextOperator = 'Contains'; break;
                        case 'equalsText': variant.TextOperator = 'Equals'; break;
                        default: variant.TextOperator = 'Contains'; break;
                    }
                } else if ([...FIELD_TYPE_CATEGORIES.NUMERIC, ...FIELD_TYPE_CATEGORIES.DATE].includes(fieldType)) {
                    switch (value) {
                        case 'equalsNumber': variant.TextOperator = 'Equals'; break;
                        case 'greaterThan': variant.TextOperator = 'Greater Than'; break;
                        case 'lessThan': variant.TextOperator = 'Less Than'; break;
                        case 'inRange': variant.TextOperator = 'Range'; break;
                        default: variant.TextOperator = 'Equals'; break;
                    }
                } else if (FIELD_TYPE_CATEGORIES.BOOLEAN.includes(fieldType)) {
                    switch (value) {
                        case 'isTrue': variant.TextOperator = 'True'; break;
                        case 'isFalse': variant.TextOperator = 'False'; break;
                        default: variant.TextOperator = 'True'; break;
                    }
                }
            }
            
            if (target.dataset.property === 'iconSource') {
                variant.sourceValue = null;
            }

            this.dispatchEvent(new CustomEvent('variantchange', { detail: variant }));
        }
    }
}