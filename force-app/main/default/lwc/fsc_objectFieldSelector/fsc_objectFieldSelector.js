import { LightningElement, api, track } from 'lwc';
// import { FlowAttributeChangeEvent } from 'lightning/flowSupport';

import { DISPLAY_TYPE_OPTIONS, AVAILABLE_OBJECT_OPTIONS, FIELD_TYPES, LAYOUT_OPTIONS, transformConstantObject } from 'c/fsc_objectFieldSelectorUtils';
import { setValuesFromMultipleInput, setValuesFromSingularInput } from 'c/fsc_comboboxUtils';

export default class Fsc_objectFieldSelector extends LightningElement {
    availableObjectOptions = transformConstantObject(AVAILABLE_OBJECT_OPTIONS);

    @api name;
    @api masterLabel;
    @api objectLabel = 'Select Object';
    @api fieldLabel = 'Select Field';
    @api valueDelimiter = ',';

    @api disabled;
    @api disableObjectPicklist = false;
    @api disableFieldPicklist = false;
    @api hideObjectPicklist = false;
    @api hideFieldPicklist = false;
    @api objectAllowMultiselect = false;
    @api fieldAllowMultiselect = false;
    @api required = false;
    @api notifyOnClear = false;

    @api availableObjectSelection = this.availableObjectOptions.default?.value;
    @api availableObjects;
    @api availableFieldTypes;
    @api availableReferenceTypes;
    // @api lockDefaultObject;  Redundant, same as disableObjectPicklist
    @api defaultToNameField;
    @api layout = LAYOUT_OPTIONS.VERTICAL.value;

    @api
    get builderContext() {
        return this._builderContext;
    }
    set builderContext(value) {
        console.log('setting builderContext');
        console.log(JSON.stringify(value));
        this._builderContext = value;
    }
    _builderContext;

    @api
    get objectValues() {
        return this._objectValues || [];
    }
    set objectValues(values) {
        this._objectValues = setValuesFromMultipleInput(values);
    }
    @track _objectValues = [];

    @api
    get objectValue() {
        return this.objectValues.join(this.valueDelimiter);
    }
    set objectValue(value) {
        this.objectValues = setValuesFromSingularInput(value, this.valueDelimiter, this.objectAllowMultiselect);
    }

    @api
    get fieldValues() {
        return this._fieldValues || [];
    }
    set fieldValues(values) {
        this._fieldValues = setValuesFromMultipleInput(values);
    }
    @track _fieldValues = [];

    @api
    get fieldValue() {
        return this.fieldValues.join(this.valueDelimiter);
    }
    set fieldValue(value) {
        this.fieldValues = setValuesFromSingularInput(value, this.valueDelimiter, this.fieldAllowMultiselect);
    }


    @api
    get displayType() {
        return this._displayType;
    }
    set displayType(value) {
        this._displayType = value;
        if (this.displayType === DISPLAY_TYPE_OPTIONS.FIELD.value) {
            this.hideObjectPicklist = true;
        }
        if (this.displayType === DISPLAY_TYPE_OPTIONS.OBJECT.value) {
            this.hideFieldPicklist = true;
        }
    }

    @api
    reportValidity() {
        let isValid = true;
        if (this.objectSelector) {
            isValid = this.objectSelector.reportValidity() && isValid;
        }
        if (this.fieldSelector) {
            isValid = this.fieldSelector.reportValidity() && isValid;
        }
        return isValid;
    }

    @api
    validate() {
        let errorMessages = []
        const validateComponents = [this.objectSelector, this.fieldSelector];
        validateComponents.forEach(cmp => {
            if (cmp?.validate().errorMessage) {
                errorMessages.push(cmp.validate().errorMessage)
            }
        })
        // if (this.objectSelector && this.objectSelector.validate().errorMessage) {
        //     errorMessages.push(this.objectSelector.validate().errorMessage)
        // }
        // if (this.fieldSelector && this.fieldSelector.validate().errorMessage) {
        //     errorMessages.push(this.fieldSelector.validate().errorMessage)
        // }
        console.log('in ofsValidate, errorMessages = ' + errorMessages);
        if (errorMessages.length) {
            return {
                isValid: false,
                errorMessage: errorMessages.join(' ')
            };
        } else {
            return { isValid: true };
        }
    }

    @api
    clearFieldSelection() {
        this.fieldSelector.clearSelection();
    }

    @api
    clearObjectSelection() {
        this.objectSelector.clearSelection();
    }

    get computedColClass() {
        let classString = 'slds-col';
        if (this.displayType === DISPLAY_TYPE_OPTIONS.BOTH.value && this.layout === LAYOUT_OPTIONS.HORIZONTAL.value) {
            classString += ' slds-size_1-of-2';
        } else {
            classString += ' slds-size_1-of-1';
        }
        return classString;
    }

    get objectSelector() {
        return this.template.querySelector('c-fsc_object-selector');
    }

    get fieldSelector() {
        return this.template.querySelector('c-fsc_field-selector2');
    }

    get objectPicklistIsDisabled() {
        return this.disableObjectPicklist || this.disabled;
    }

    get fieldPicklistIsDisabled() {
        return this.disableFieldPicklist || this.disabled;
    }

    handleObjectChange(event) {
        this.objectValue = event.detail.value;
        // const attributeChangeEvent = new FlowAttributeChangeEvent(
        //     'objectValue',
        //     this.objectValue
        // );
        // this.dispatchEvent(attributeChangeEvent);
        this.dispatchValues();
    }

    handleFieldChange(event) {
        this.fieldValue = event.detail.value;
        // const attributeChangeEvent = new FlowAttributeChangeEvent(
        //     'fieldValue',
        //     this.fieldValue
        // );
        // this.dispatchEvent(attributeChangeEvent);
        this.dispatchValues();
    }

    handleFieldClearRequest() {
        console.log(`in objectFieldSelector handleFieldClearRequest`);
        this.dispatchEvent(new CustomEvent('fieldclearrequest'));
    }

    handleObjectClearRequest() {
        console.log(`in objectFieldSelector handleObjectClearRequest`);
        this.dispatchEvent(new CustomEvent('objectclearrequest'));
    }

    dispatchValues() {
        let detail = {
            objectValue: this.objectValue,
            objectValues: this.objectValues,
            fieldValue: this.fieldValue,
            fieldValues: this.fieldValues
        }
        this.dispatchEvent(new CustomEvent('change', { detail }));
    }


    connectedCallback() {
        // console.log('displayType = ' + this.displayType);
        // console.log('objectValue = ' + this.objectValue);
        // console.log('availableFieldTypes = ' + this.availableFieldTypes);
        // console.log('availableReferenceTypes = ' + this.availableReferenceTypes);
        // console.log('hideObjectPicklist = ' + this.hideObjectPicklist);
        // console.log('hideFieldPicklist = ' + this.hideFieldPicklist);
    }
}