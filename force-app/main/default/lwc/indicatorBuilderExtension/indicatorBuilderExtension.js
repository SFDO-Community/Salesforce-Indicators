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
        let matchingOption = this.whenToDisplayOptions.find(option => option.value == this.activeVariant.whenToDisplay);
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
            if (target.dataset.property === 'iconSource') {
                variant.sourceValue = null;
            }

            this.dispatchEvent(new CustomEvent('variantchange', { detail: variant }));
        }
    }
}