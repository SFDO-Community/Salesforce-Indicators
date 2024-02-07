import { LightningElement, api, track, wire } from 'lwc';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import getObjectFields from '@salesforce/apex/ObjectFieldSelectorController.getObjectFields';
import { DISPLAY_TYPE_OPTIONS, AVAILABLE_OBJECT_OPTIONS, FIELD_TYPES, LAYOUT_OPTIONS, transformConstantObject } from 'c/fsc_objectFieldSelectorUtils';
import { setValuesFromMultipleInput, setValuesFromSingularInput, includesIgnoreCase } from 'c/fsc_comboboxUtils';

const DATA_TYPE_ICONS = {
    Address: 'utility:location',
    Boolean: 'utility:check',
    ComboBox: 'utility:picklist_type',
    Currency: 'utility:currency',
    Date: 'utility:date_input',
    DateTime: 'utility:date_time',
    Double: 'utility:number_input',
    Email: 'utility:email',
    Int: 'utility:number_input',
    Location: 'utility:location',
    MultiPicklist: 'utility:multi_picklist',
    Percent: 'utility:percent',
    Phone: 'utility:phone_portrait',
    Picklist: 'utility:picklist_type',
    Reference: 'utility:record_lookup',
    Time: 'utility:clock',
    Url: 'utility:link'
}
const DEFAULT_ICON = 'utility:text';

const INVALID_TYPE_ERROR = 'INVALID_TYPE';

export default class Fsc_fieldSelector2 extends LightningElement {
    @api name;
    @api allowMultiselect = false;
    @api required = false;
    @api label = 'Select Field';
    @api showSelectedCount;
    @api publicClass;
    @api publicStyle;
    @api placeholder = 'Type to search fields';
    @api fieldLevelHelp;
    @api valueDelimiter = ',';
    @api fieldTypeDelimiter = ';'; // Sometimes an array of availableFieldTypes will contain more than one field type value in a single element, so this allows a separate delimiter to be used to split within the element
    @api hideIcons = false;
    @api isLoading = false;
    @api disabled = false;
    @api hidePills = false; // If true, list of selected pills in multiselect mode will not be displayed (generally because a parent component wants to display them differently).
    @api excludeSublabelInFilter = false;   // If true, the 'sublabel' text of an option is not included when determining if an option is a match for a given search text.
    @api includeValueInFilter = false;  // If true, the 'value' text of an option is included when determining if an option is a match for a given search text.
<<<<<<< HEAD
    @api allowReferenceLookups = false;
=======
    @api allowReferenceLookups = false; 
>>>>>>> 73e5f784ff3ef05a4d7d8281abdb8191f0999bef
    @track fields = [];
    @track _values = [];
    @track _availableFieldTypes = [];
    @track _availableReferenceTypes = [];

    @api builderContext;

    fieldTypes = transformConstantObject(FIELD_TYPES);
    _objectName;
    isNotFirstObjectLoad;
    errorMessage;

    @api
    get objectName() {
        return this._objectName;
    }
    set objectName(value) {
        this._objectName = value;
        if (!this.objectName) {
            this.clearValues();
        }
    }

    @api
    get values() {
        return this._values || [];
    }
    set values(values) {
        this._values = setValuesFromMultipleInput(values);
    }
    @track _values = [];

    @api
    get value() {
        return this.values.join(this.valueDelimiter);
    }
    set value(value) {
        this.values = setValuesFromSingularInput(value, this.valueDelimiter, this.allowMultiselect);
    }

    @api
    get availableFieldTypes() {
        return this._availableFieldTypes;
    }
    set availableFieldTypes(value) {
        if (!value) {
            this._availableFieldTypes = [];
        } else if (Array.isArray(value)) {
            this._availableFieldTypes = value;
        } else {
            let types = [];
            value.split(this.valueDelimiter).forEach(value => {
                types.push(...value.split(this.fieldTypeDelimiter).map(fieldType => fieldType.toLowerCase()));
            })
            this._availableFieldTypes = types;
        }
    }

    @api
    get availableReferenceTypes() {
        return this._availableReferenceTypes;
    }
    set availableReferenceTypes(value) {
        if (!value) {
            this.values = [];
        } else {
            this._availableReferenceTypes = value.split(this.valueDelimiter).map(val => val.trim());
        }
    }

    @api
    reportValidity() {
        return this.template.querySelector('c-fsc_combobox').reportValidity();
    }

    @api
    validate() {
        // console.log('in fieldSelector validate, returning '+ JSON.stringify(this.template.querySelector('c-fsc_combobox').validate()));
        return this.template.querySelector('c-fsc_combobox').validate();
    }

    get isLoadingOrDisabled() {
        return this.isLoading || this.disabled || !this.objectName;
    }

    get computedPlaceholder() {
        if (!this.objectName) {
            return 'No object selected, please select an object';
        } else if (this.isLoading) {
            return 'Loading...';
        } else {
            return this.placeholder;
        }
    }

    @wire(getObjectInfo, { objectApiName: '$objectName' })
    handleGetObjectInfo({ error, data }) {
        if (error) {
            console.log('Fieldselector error: ' + JSON.stringify(error));
            if (error.body.errorCode === INVALID_TYPE_ERROR) {
                this.loadObjectInfo();
            } else {
                this.errorMessage = 'Unknown error';
                if (Array.isArray(error.body)) {
                    this.errorMessage = error.body.map(e => e.message).join(', ');
                } else if (typeof error.body.message === 'string') {
                    this.errorMessage = error.body.message;
                }
            }
        } else if (data) {
            console.log(JSON.stringify(Object.values(data.fields).filter(field => field.relationshipName)[0]));
            this.processFields(Object.values(data.fields));
        } else {
            console.log('neither data nor error');
        }
        this.isLoading = false;
    }

    loadObjectInfo() {
        if (!this.objectName || this.isNotFirstObjectLoad) {
            this.clearValues();
        }
        if (this.objectName) {
            this.isLoading = true;
            this.disabled = false;
            this.isNotFirstObjectLoad = true;
            getObjectFields({ objectName: this.objectName })
                .then(result => {
                    this.processFields(result.fields);
                }).catch(error => {
                    console.log('getObjectFields error: ' + JSON.stringify(error));
                    this.errorMessage = error.errorMessage || 'Unknown error';
                }).finally(() => {
                    this.isLoading = false;
                    console.log('finished loadObjectInfo');
                })
        }
    }

    /* EVENT HANDLERS */
    handleComboboxChange(event) {
        this.values = event.detail.values;
        this.dispatchFields();
    }

    /* ACTION FUNCTIONS */
    processFields(fields) {
        if (this.availableFieldTypes?.length) {
            fields = fields.filter(field => includesIgnoreCase(this.availableFieldTypes, field.dataType));
            if (this.availableReferenceTypes?.length) {
                fields = fields.filter(field => !field.referenceToInfos.length || field.referenceToInfos.some(ref => includesIgnoreCase(this.availableReferenceTypes, ref.apiName)));
            }
        }
<<<<<<< HEAD
        this.fields = fields.map(field => this.newField(field.label, field.apiName, field.apiName, field.dataType, this.hideIcons ? null : this.getIconFromDataType(field.dataType)));
=======
        this.fields = fields.map(field => this.newField(field.label, field.apiName, field.apiName, this.hideIcons ? null : this.getIconFromDataType(field.dataType)));
>>>>>>> 73e5f784ff3ef05a4d7d8281abdb8191f0999bef
        this.fields.sort((a, b) => {
            return a.label.toLowerCase() > b.label.toLowerCase() ? 1 : -1;
        });

    }

    clearValues() {
        console.log('in clearValues');
        if (this.values.length) {
            console.log('actually clearing because there are values to clear (' + this.values + ')');
            this.values = [];
            this.dispatchFields();
        }
    }

    dispatchFields() {
<<<<<<< HEAD
        let fieldData;
        if (this.values.length) {
            fieldData = this.fields.filter(field => this.values.includes(field.value));
            //     {
            //     return this.values.find(value => field.apiName == value)
            // });
        }
        let detail = {
            value: this.value,
            values: this.values,
            fieldData: fieldData
        }
        this.dispatchEvent(new CustomEvent('change', { detail }));
    }
=======
        let detail = {
            value: this.value,
            values: this.values,
        }
        this.dispatchEvent(new CustomEvent('change', { detail }));
    }    
>>>>>>> 73e5f784ff3ef05a4d7d8281abdb8191f0999bef

    /* UTILITY FUNCTIONS */
    getIconFromDataType(type) {
        let matchingType = this.fieldTypes.options.find(fieldType => includesIgnoreCase(fieldType.value.split(this.fieldTypeDelimiter), type));
        return matchingType?.icon || DEFAULT_ICON;
    }

<<<<<<< HEAD
    newField(label, sublabel, value, dataType, icon) {
        return { label, sublabel, value, dataType, icon }
=======
    newField(label, sublabel, value, icon) {
        return { label, sublabel, value, icon }
>>>>>>> 73e5f784ff3ef05a4d7d8281abdb8191f0999bef
    }
}