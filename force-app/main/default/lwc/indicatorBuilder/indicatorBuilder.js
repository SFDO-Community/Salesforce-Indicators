// TODO: set "display logic" to only show appropriate filters based on field type
// TODO: incorporate all data from saved Indicator Item metadata
// TODO: fix lag on combobox load
// TODO: add re-ordering of variants (drag/drop or arrows)

import { LightningElement, api, track, wire } from 'lwc';
import getSldsIcons from '@salesforce/apex/SldsIconController.getIconOptions';
import { FIELD_TYPES } from 'c/fsc_objectFieldSelectorUtils';
import {getObjectInfo} from "lightning/uiObjectInfoApi";

import Indicator_Item__mdt from "@salesforce/schema/Indicator_Item__mdt";
import sObject_FIELD from "@salesforce/schema/Indicator_Item__mdt.sObject__c";
import Field_FIELD from "@salesforce/schema/Indicator_Item__mdt.Field__c";
import Description_FIELD from "@salesforce/schema/Indicator_Item__mdt.Description__c";


const FIELD_TYPE_CATEGORIES = {
    // TEXT: Object.values(FIELD_TYPES).filter(fieldType => fieldType.value !== FIELD_TYPES.CHECKBOX.value),   // Everything but boolean
    // TEXT: [FIELD_TYPES.REFERENCE, FIELD_TYPES.ADDRESS, FIELD_TYPES.EMAIL, FIELD_TYPES.LOCATION, FIELD_TYPES.PHONE, FIELD_TYPES.PICKLIST, FIELD_TYPES.MULTIPICKLIST, FIELD_TYPES.TEXT, FIELD_TYPES.TEXTAREA, FIELD_TYPES.TEXTENCRYPTED, FIELD_TYPES.URL],
    // NUMERIC: [FIELD_TYPES.CURRENCY, FIELD_TYPES.NUMBER, FIELD_TYPES.PERCENT],
    // DATE: [FIELD_TYPES.DATE, FIELD_TYPES.DATETIME, FIELD_TYPES.TIME],
    // BOOLEAN: [FIELD_TYPES.CHECKBOX],
    TEXT: ['Reference', 'Address', 'Email', 'Location', 'Phone', 'Picklist', 'ComboBox', 'MultiPicklist', 'String', 'TextArea', 'EncryptedString', 'URL'],
    NUMERIC: ['Currency', 'Number', 'Percent', 'Integer', 'Double', 'Int', 'Long'],
    DATE: ['Date', 'DateTime', 'Time'],
    BOOLEAN: ['Boolean'],
}
export default class IndicatorBuilder extends LightningElement {

    @api get indicator() {
        return this._indicator;
    }
    set indicator(value) {
        if(value) this._indicator = value;
        else this._indicator = {}
    }
    _indicator = {};

    get indicator_sObject() {
        return {
            value :this._indicator[sObject_FIELD.fieldApiName],
            label : this.objectInfoFields[sObject_FIELD.fieldApiName]?.label,
            inlineHelpText : this.objectInfoFields[sObject_FIELD.fieldApiName]?.inlineHelpText,
            apiName : this.objectInfoFields[sObject_FIELD.fieldApiName]?.apiName
        };
    }
    get indicator_Label() {
        return {
            value :this._indicator?.Label,
            label : this.objectInfoFields?.Label?.label,
            inlineHelpText : '',
            apiName : 'Label'
        };
    }
    get indicator_Field() {
        return {
            value : this._indicator[Field_FIELD.fieldApiName],
            label : this.objectInfoFields[Field_FIELD.fieldApiName]?.label,
            inlineHelpText : this.objectInfoFields[Field_FIELD.fieldApiName]?.inlineHelpText,
            apiName : Field_FIELD.fieldApiName,
            dataType : this.objectInfoFields[Field_FIELD.fieldApiName]?.dataType?.toUpperCase()
        };
    }
    get indicator_Description() {
        return {
            value :this._indicator[Description_FIELD.fieldApiName],
            label : this.objectInfoFields[Description_FIELD.fieldApiName]?.label,
            inlineHelpText : this.objectInfoFields[Description_FIELD.fieldApiName]?.inlineHelpText,
            apiName : this.objectInfoFields[Description_FIELD.fieldApiName]?.apiName
        };
    }

    objectInfo = {};
    get objectInfoFields() {
        return (this.objectInfo || {}).fields || {};
    }
    @wire(getObjectInfo, { objectApiName: 'Indicator_Item__mdt' }) setObjectInfo({ error, data }) {
        if (error) {
            let message = 'Unknown error';
            if (Array.isArray(error.body)) {
                message = error.body.map(e => e.message).join(', ');
            } else if (typeof error.body.message === 'string') {
                message = error.body.message;
            }
            console.log(message);
        } else if (data) {
            console.log(JSON.parse(JSON.stringify(data)));
            this.objectInfo = data;
        }
    };

    showMatch = {};
    iconSource = {}
    showTextMatch = false;
    showNumberMatch = false;
    overrideColours = false;

    startTime;
    endTime;

    showActiveVariant = false;
    showSpinner = false;

    get activeVariantTabIndex() {
        return this._activeVariantTabIndex;
    }
    set activeVariantTabIndex(value) {
        this.showActiveVariant = false;
        this._activeVariantTabIndex = value;
        this.itemVariants = this.itemVariants.map((variant, index) => {
            variant.isActive = index == this.activeVariantTabIndex;
            return variant;
        });
        this.activeVariant = this.itemVariants[this.activeVariantTabIndex];
    }
    _activeVariantTabIndex = 0;

    @track activeVariant = {};
    @track itemVariants = [];

    @track iconOptions = [];

    @track fieldTypeCategories = {};

    whenToDisplayOptions = [
        { label: 'Is not blank', value: 'notBlank', fieldTypes: [...FIELD_TYPE_CATEGORIES.TEXT, ...FIELD_TYPE_CATEGORIES.NUMERIC, ...FIELD_TYPE_CATEGORIES.DATE] },
        { label: 'Is blank', value: 'isBlank', fieldTypes: [...FIELD_TYPE_CATEGORIES.TEXT, ...FIELD_TYPE_CATEGORIES.NUMERIC, ...FIELD_TYPE_CATEGORIES.DATE] },
        { label: 'Contains text', value: 'containsText', fieldTypes: FIELD_TYPE_CATEGORIES.TEXT, showMatch: 'text' },
        { label: 'Equals', value: 'equalsText', fieldTypes: FIELD_TYPE_CATEGORIES.TEXT, showMatch: 'text' },
        { label: 'Equals', value: 'equalsNumber', fieldTypes: [...FIELD_TYPE_CATEGORIES.NUMERIC, ...FIELD_TYPE_CATEGORIES.DATE], showMatch: 'number' },
        { label: 'Is greater than', value: 'greaterThan', fieldTypes: [...FIELD_TYPE_CATEGORIES.NUMERIC, ...FIELD_TYPE_CATEGORIES.DATE], showMatch: 'number' },
        { label: 'Is less than', value: 'lessThan', fieldTypes: [...FIELD_TYPE_CATEGORIES.NUMERIC, ...FIELD_TYPE_CATEGORIES.DATE], showMatch: 'number' },
        { label: 'Is within range', value: 'inRange', fieldTypes: [...FIELD_TYPE_CATEGORIES.NUMERIC, ...FIELD_TYPE_CATEGORIES.DATE], showMatch: 'numericRange' },
        { label: 'Is true', value: 'isTrue', fieldTypes: FIELD_TYPE_CATEGORIES.BOOLEAN, showMatch: 'boolean' },
        { label: 'Is false', value: 'isFalse', fieldTypes: FIELD_TYPE_CATEGORIES.BOOLEAN, showMatch: 'boolean' },
        // { label: 'Custom formula', value: 'customFormula' },
        // { label: 'Custom expression', value: 'customExpression' },
    ];
    // @track whenToDisplayOptions = [];

    iconSourceOptions = [
        { label: 'Lightning Icon', value: 'sldsIcon' },
        { label: 'Static Text', value: 'staticText' },
        { label: 'URL', value: 'url' },
        { label: 'Static Resource', value: 'staticResource' },
    ];

    iconSizeOptions = [
        { label: 'x-small', value: 'x-small' },
        { label: 'small', value: 'small' },
        { label: 'medium', value: 'medium', default: true },
        { label: 'large', value: 'large' },
    ];

    get activeWhenToDisplayOptions() {
        return this.whenToDisplayOptions.filter(option => option.fieldTypes.includes(this.indicator_Field.dataType));
    }

    /* LIFECYCLE HOOKS */
    connectedCallback() {
        // this.processIconOptions();
        if (this.itemVariants.length === 0) {
            console.log(`adding default variants`);
            this.addNewVariant('When field has value', 'notBlank');
            this.addNewVariant('When field is blank', 'isBlank');
            this.activeVariantTabIndex = 0;
        }
    }

    renderedCallback() {
        if (this.endTime) {
            console.log(`elapsed time on render = ${this.endTime - this.startTime}`);
            this.endTime = null;
        }
        if (!this.showActiveVariant) {
            this.showActiveVariant = true;
        }
    }

    /* EVENT HANDLERS */
    handleAddVariantClick() {
        this.addNewVariant(`Indicator Variant ${(this.itemVariants.length + 1)}`);
    }

    handleTabAnchorClick(event) {
        this.activeVariantTabIndex = event.currentTarget.dataset.index;
    }

    handleObjectFieldSelectorChange(event) {
        this.dispatchIndicatorChange(sObject_FIELD.fieldApiName,event.detail.objectValue);
        this.dispatchIndicatorChange(Field_FIELD.fieldApiName,event.detail.fieldValue);
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

            console.log(`index is ${target.dataset.index}, value is ${value}, property name is ${target.dataset.property}`);

            // let variantToUpdate = this.itemVariants[target.dataset.index];
            let variantToUpdate = this.activeVariant;
            if (variantToUpdate) {
                variantToUpdate[target.dataset.property] = value;
                if (target.dataset.property === 'iconSource') {
                    variantToUpdate.sourceValue = null;
                }
                this.itemVariants = [...this.itemVariants];
                console.log(`updated variant value = ${JSON.stringify(variantToUpdate)}`);
            }
        }
    }

    handleVariantDeleteClick(event) {
        event.preventDefault();
        event.stopPropagation();
        let index = event.target.dataset.index;
        this.itemVariants.splice(index, 1);
        if (this.itemVariants.length === 0) {
            this.addNewVariant('Indicator Variant 1');
        }
    }


    dispatchIndicatorChange(fieldApiName,value) {
        this.dispatchEvent(new CustomEvent('indicatorvaluechange', {
            detail: {
                fieldApiName,
                value
            }
        }));
    }
    handleIndicatorFieldChange(event) {
        const fieldApiName = (event.currentTarget.dataset || {}).apiName;
        this.dispatchIndicatorChange(fieldApiName,event.detail.value);
    }


    /* ACTION FUNCTIONS */
    addNewVariant(label, whenToDisplay) {
        this.itemVariants.push(this.newIndicatorVariant(label, whenToDisplay));
        this.activeVariantTabIndex = this.itemVariants.length - 1;
    }

    newIndicatorVariant(label, whenToDisplay, isActive = true, iconSource = 'sldsIcon') {
        let whenToDisplayOptions = this.whenToDisplayOptions;

        let newVariant = {
            label,
            whenToDisplay,
            isActive,
            iconSource,
            hoverText: '',
            sourceValue: null,
            // iconSourceIs: {},
            // filterTypeIs: {},

            get iconSourceIs() {
                return { [this.iconSource]: true }
            },
            get filterTypeIs() {
                let matchingOption = whenToDisplayOptions.find(option => option.value == this.whenToDisplay);
                return matchingOption ? { [matchingOption.showMatch]: true } : {};
            },
            get tabAnchorClass() {
                return 'slds-vertical-tabs__nav-item' + (this.isActive ? ' slds-is-active' : '');
            },
            get tabPaneClass() {
                return 'slds-vertical-tabs__content ' + (this.isActive ? 'slds-show' : 'slds-hide');
            },
            get showColourOption() {
                return this.iconSourceIs.sldsIcon;
            },
            get showColourSelectors() {
                return this.iconSourceIs.staticText || (this.showColourOption && this.overrideColours);
            }

        }
        console.log(`newVariant = ${JSON.stringify(newVariant)}`);
        return newVariant;
    }

    /* WIRE FUNCTIONS */
    @wire(getSldsIcons, {})
    iconOptions({ error, data }){
        if(data){
            console.log(`data = ${JSON.stringify(data)}}`);
            this.iconOptions = data;
        } else if (error){
            console.log('Get SLDS Icons Error: ', error);
            this.hasErrors = true;
            if(error.body.message == 'List has no rows for assignment to SObject'){
                this.errorMsg = 'Unable to locate SLDS Icons file.';
            } else {
                this.errorMsg = error;
            }
        }
    }

}