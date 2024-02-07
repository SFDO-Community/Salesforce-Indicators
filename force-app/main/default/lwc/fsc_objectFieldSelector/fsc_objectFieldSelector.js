import { LightningElement, api, track } from 'lwc';
import { FlowAttributeChangeEvent } from 'lightning/flowSupport';

import { DISPLAY_TYPE_OPTIONS, AVAILABLE_OBJECT_OPTIONS, FIELD_TYPES, LAYOUT_OPTIONS, transformConstantObject } from 'c/fsc_objectFieldSelectorUtils';
import { setValuesFromMultipleInput, setValuesFromSingularInput } from 'c/fsc_comboboxUtils';

export default class Fsc_objectFieldSelector extends LightningElement {
    availableObjectOptions = transformConstantObject(AVAILABLE_OBJECT_OPTIONS);
<<<<<<< HEAD
    displayTypeOptions = transformConstantObject(DISPLAY_TYPE_OPTIONS);
=======
>>>>>>> 73e5f784ff3ef05a4d7d8281abdb8191f0999bef

    @api name;
    @api masterLabel;
    @api objectLabel = 'Select Object';
    @api fieldLabel = 'Select Field';
    @api valueDelimiter = ',';

    @api disableObjectPicklist = false;
    @api hideObjectPicklist = false;
    @api hideFieldPicklist = false;
    @api objectAllowMultiselect = false;
    @api fieldAllowMultiselect = false;
<<<<<<< HEAD
    @api allowReferenceLookups = false;
=======
>>>>>>> 73e5f784ff3ef05a4d7d8281abdb8191f0999bef
    @api required = false;

    @api availableObjectSelection = this.availableObjectOptions.default?.value;
    @api availableObjects;
    @api availableFieldTypes;
    @api availableReferenceTypes;
    @api lockDefaultObject;
    @api defaultToNameField;
    @api layout = LAYOUT_OPTIONS.VERTICAL.value;

<<<<<<< HEAD
    @track fieldData; // used to retain all data from each seleted field, such as field data type

=======
>>>>>>> 73e5f784ff3ef05a4d7d8281abdb8191f0999bef
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
<<<<<<< HEAD
=======
        console.log('in set objectValue');
        console.log(value);
>>>>>>> 73e5f784ff3ef05a4d7d8281abdb8191f0999bef
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
<<<<<<< HEAD
    _displayType = this.displayTypeOptions.default?.value;
=======
>>>>>>> 73e5f784ff3ef05a4d7d8281abdb8191f0999bef

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
<<<<<<< HEAD
        // console.log('in ofsValidate, errorMessages = ' + errorMessages);
=======
        console.log('in ofsValidate, errorMessages = ' + errorMessages);
>>>>>>> 73e5f784ff3ef05a4d7d8281abdb8191f0999bef
        if (errorMessages.length) {
            return {
                isValid: false,
                errorMessage: errorMessages.join(' ')
            };
        } else {
            return { isValid: true };
        }
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

    handleObjectChange(event) {
        this.objectValue = event.detail.value;
        const attributeChangeEvent = new FlowAttributeChangeEvent(
            'objectValue',
            this.objectValue
        );
        this.dispatchEvent(attributeChangeEvent);
        this.dispatchValues();
    }

    handleFieldChange(event) {
        this.fieldValue = event.detail.value;
<<<<<<< HEAD
        this.fieldData = event.detail.fieldData;
        // console.log(`fieldData = ${JSON.stringify(this.fieldData)}`);
=======
>>>>>>> 73e5f784ff3ef05a4d7d8281abdb8191f0999bef
        const attributeChangeEvent = new FlowAttributeChangeEvent(
            'fieldValue',
            this.fieldValue
        );
        this.dispatchEvent(attributeChangeEvent);
        this.dispatchValues();
    }

    dispatchValues() {
        this.dispatchEvent(new CustomEvent('change', {
            detail: {
                objectValue: this.objectValue,
                objectValues: this.objectValues,
                fieldValue: this.fieldValue,
<<<<<<< HEAD
                fieldValues: this.fieldValues,
                fieldData: this.fieldData

=======
                fieldValues: this.fieldValues
>>>>>>> 73e5f784ff3ef05a4d7d8281abdb8191f0999bef
            }
        }));
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