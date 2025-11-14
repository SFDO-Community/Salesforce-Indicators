// TODO: set "display logic" to only show appropriate filters based on field type
// TODO: incorporate all data from saved Indicator Item metadata
// TODO: fix lag on combobox load
// TODO: add re-ordering of variants (drag/drop or arrows)

import { LightningElement, api, track, wire } from 'lwc';
import getSldsIcons from '@salesforce/apex/SldsIconController.getIconOptions';
import deployIndicatorBundles from '@salesforce/apex/MetadataUtility.deployIndicatorBundles';
import { FIELD_TYPES } from 'c/fsc_objectFieldSelectorUtils';
import {getObjectInfo} from "lightning/uiObjectInfoApi";
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

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
    TEXT: ['Reference', 'Address', 'Email', 'Location', 'Phone', 'Picklist', 'ComboBox', 'MultiPicklist', 'String', 'TextArea', 'EncryptedString', 'URL', 'STRING', 'TEXT', 'TEXTAREA', 'PICKLIST', 'MULTIPICKLIST'],
    NUMERIC: ['Currency', 'Number', 'Percent', 'Integer', 'Double', 'Int', 'Long', 'CURRENCY', 'NUMBER', 'PERCENT', 'INTEGER', 'DOUBLE'],
    DATE: ['Date', 'DateTime', 'Time', 'DATE', 'DATETIME', 'TIME'],
    BOOLEAN: ['Boolean', 'BOOLEAN'],
}
export default class IndicatorBuilder extends LightningElement {

    @api get indicator() {
        return this._indicator;
    }
    set indicator(value) {
        if(value) {
            this._indicator = value;
            // Convert extensions to itemVariants if they exist
            if (value.Extensions && value.Extensions.length > 0) {
                this.itemVariants = value.Extensions.map((extension, index) => {
                    let whenToDisplay = this.convertTextOperatorToWhenToDisplay(
                        extension.TextOperator, 
                        value.FieldType || 'String'
                    );
                    
                    // Determine icon source based on what fields are populated
                    let iconSource = 'staticText'; // default
                    let sourceValue = extension.ExtensionTextValue;

                    if (extension.ExtensionIconValue) {
                        iconSource = 'sldsIcon';
                        sourceValue = extension.ExtensionIconValue;
                    } else if (extension.ExtensionImageUrl) {
                        iconSource = 'url';
                        sourceValue = extension.ExtensionImageUrl;
                    } else if (extension.ExtensionTextValue) {
                        iconSource = 'staticText';
                        sourceValue = extension.ExtensionTextValue;
                    }
                    
                    const variant = {
                        // Store original extension identifiers for updates
                        ExtensionId: extension.ExtensionId,
                        QualifiedApiName: extension.QualifiedApiName,
                        Indicator_Item__c: value.QualifiedApiName, 
                        label: extension.ExtensionDescription, 
                        whenToDisplay: whenToDisplay,
                        TextOperator: extension.TextOperator,
                        ContainsText: extension.ContainsText,
                        Minimum: extension.Minimum,
                        Maximum: extension.Maximum,
                        isActive: extension.IsActive !== false,
                        iconSource: iconSource,
                        sourceValue: sourceValue,
                        hoverText: extension.ExtensionHoverText || '',
                        foregroundColour: extension.ForegroundColor,
                        backgroundColour: extension.BackgroundColor,
                        overrideColours: !!(extension.ForegroundColor || extension.BackgroundColor),
                        
                        get iconSourceIs() {
                            return { [this.iconSource]: true }
                        },
                        get filterTypeIs() {
                            // Since we don't have a direct parent reference, access the component's methods indirectly
                            // We'll use the computed whenToDisplay based on TextOperator
                            const fieldType = 'String'; // Default fallback, will be improved with proper field type detection
                            let computedWhenToDisplay = this.whenToDisplay;
                            
                            // Convert TextOperator to whenToDisplay if needed
                            if (this.TextOperator && !computedWhenToDisplay) {
                                if (this.TextOperator === 'Equals') {
                                    computedWhenToDisplay = 'equalsText';
                                } else if (this.TextOperator === 'Contains') {
                                    computedWhenToDisplay = 'containsText';
                                }
                            }
                            
                            
                            // Simple mapping of whenToDisplay to showMatch types
                            const typeMap = {
                                'equalsText': 'text',
                                'containsText': 'text',
                                'equalsNumber': 'number',
                                'greaterThan': 'number',
                                'lessThan': 'number',
                                'inRange': 'numericRange',
                                'isTrue': 'boolean',
                                'isFalse': 'boolean',
                                'notBlank': 'boolean',
                                'isBlank': 'boolean'
                            };
                            
                            const showMatch = typeMap[computedWhenToDisplay];
                            return showMatch ? { [showMatch]: true } : {};
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
                    };
                
                    // Check if the sourceValue will be found in iconOptions
                    if (variant.iconSource === 'sldsIcon' && this.iconOptions) {
                        const foundIcon = this.iconOptions.find(icon => 
                            icon.value === variant.sourceValue || 
                            icon.label === variant.sourceValue ||
                            icon.value === variant.sourceValue.replace('utility:', '') ||
                            icon.label === variant.sourceValue.replace('utility:', '')
                        );
                    }
                    
                    return variant;
                });
                
                // Set the first variant as active
                if (this.itemVariants.length > 0) {
                    this.itemVariants[0].isActive = true;
                    this.activeVariantTabIndex = 0;
                }
            } else {
                // No extensions found, add default variants if none exist
                if (this.itemVariants.length === 0) {
                    this.addNewVariant('When field has value', 'notBlank');
                    this.addNewVariant('When field is blank', 'isBlank');
                    this.activeVariantTabIndex = 0;
                }
            }
        } else {
            this._indicator = {}
        }
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
        const result = {
            value :this._indicator?.Label,
            label : this.objectInfoFields?.Label?.label,
            inlineHelpText : '',
            apiName : 'Label'
        };
        return result;
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
    @track saveInProgress = false;

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

    // Computed whenToDisplay value for the active variant
    get activeVariantWhenToDisplay() {
        const variant = this.activeVariant;
        
        if (!variant) {
            return null;
        }
        
        // If TextOperator exists, prioritize converting it (this should be the primary source)
        if (variant.TextOperator) {
            const fieldType = this.indicator_Field.dataType || 'String';
            return this.convertTextOperatorToWhenToDisplay(variant.TextOperator, fieldType);
        }
        
        // Fallback to existing whenToDisplay
        if (variant.whenToDisplay) {
            return variant.whenToDisplay;
        }
        
        return null;
    }
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
        const fieldDataType = this.indicator_Field.dataType;
        
        // If we don't have a field type, return text options as default
        if (!fieldDataType) {
            return this.whenToDisplayOptions.filter(option => option.fieldTypes.includes('String'));
        }
        
        // Normalize the field type for consistent matching
        const normalizedFieldType = this.normalizeFieldType(fieldDataType);
        
        const filteredOptions = this.whenToDisplayOptions.filter(option => option.fieldTypes.includes(normalizedFieldType));
        
        // If no matches, fall back to text options
        if (filteredOptions.length === 0) {
            return this.whenToDisplayOptions.filter(option => option.fieldTypes.includes('String'));
        }
        
        return filteredOptions;
    }

    /* LIFECYCLE HOOKS */
    connectedCallback() {
        // this.processIconOptions();
        // Don't add default variants here - let the indicator setter handle it
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

            // let variantToUpdate = this.itemVariants[target.dataset.index];
            let variantToUpdate = this.activeVariant;
            if (variantToUpdate) {
                variantToUpdate[target.dataset.property] = value;
                
                // Special handling for whenToDisplay - convert back to TextOperator
                if (target.dataset.property === 'whenToDisplay') {
                    const fieldType = this._indicator.FieldType || 'String';
                    variantToUpdate.TextOperator = this.convertWhenToDisplayToTextOperator(value, fieldType);
                }
                
                if (target.dataset.property === 'iconSource') {
                    variantToUpdate.sourceValue = null;
                }
                this.itemVariants = [...this.itemVariants];
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
        return newVariant;
    }

    // Helper method to convert backend TextOperator to frontend whenToDisplay value
    // Helper method to normalize field type for consistent matching
    normalizeFieldType(fieldType) {
        if (!fieldType) return 'String';
        
        // Handle common variations
        const typeMap = {
            'STRING': 'String',
            'TEXT': 'String', 
            'TEXTAREA': 'TextArea',
            'PICKLIST': 'Picklist',
            'MULTIPICKLIST': 'MultiPicklist',
            'NUMBER': 'Number',
            'DECIMAL': 'Number',
            'INTEGER': 'Integer',
            'CURRENCY': 'Currency',
            'PERCENT': 'Percent',
            'DATE': 'Date',
            'DATETIME': 'DateTime',
            'BOOLEAN': 'Boolean'
        };
        
        return typeMap[fieldType.toUpperCase()] || fieldType;
    }

    convertTextOperatorToWhenToDisplay(textOperator, fieldType) {
        const normalizedFieldType = this.normalizeFieldType(fieldType);
        
        if (!textOperator) {
            return null;
        }
        
        // Handle universal operators first
        switch (textOperator) {
            case 'Not Blank': 
                return 'notBlank';
            case 'Is Blank': 
                return 'isBlank';
        }
        
        if (FIELD_TYPE_CATEGORIES.TEXT.includes(normalizedFieldType)) {
            switch (textOperator) {
                case 'Contains': 
                    return 'containsText';
                case 'Equals': 
                    return 'equalsText';
                default: 
                    return 'containsText';
            }
        } else if ([...FIELD_TYPE_CATEGORIES.NUMERIC, ...FIELD_TYPE_CATEGORIES.DATE].includes(normalizedFieldType)) {
            switch (textOperator) {
                case 'Equals': return 'equalsNumber';
                case 'Greater Than': return 'greaterThan';
                case 'Less Than': return 'lessThan';
                case 'Range': return 'inRange';
                default: return 'equalsNumber';
            }
        } else if (FIELD_TYPE_CATEGORIES.BOOLEAN.includes(normalizedFieldType)) {
            switch (textOperator) {
                case 'True': return 'isTrue';
                case 'False': return 'isFalse';
                default: return 'isTrue';
            }
        }
        
        return textOperator; // fallback
    }

    // Helper method to convert frontend whenToDisplay value back to backend TextOperator
    convertWhenToDisplayToTextOperator(whenToDisplay, fieldType) {
        if (!whenToDisplay) return null;
        
        // Handle universal operators first
        switch (whenToDisplay) {
            case 'notBlank': return 'Not Blank';
            case 'isBlank': return 'Is Blank';
        }
        
        if (FIELD_TYPE_CATEGORIES.TEXT.includes(fieldType)) {
            switch (whenToDisplay) {
                case 'containsText': return 'Contains';
                case 'equalsText': return 'Equals';
                default: return 'Contains';
            }
        } else if ([...FIELD_TYPE_CATEGORIES.NUMERIC, ...FIELD_TYPE_CATEGORIES.DATE].includes(fieldType)) {
            switch (whenToDisplay) {
                case 'equalsNumber': return 'Equals';
                case 'greaterThan': return 'Greater Than';
                case 'lessThan': return 'Less Than';
                case 'inRange': return 'Range';
                default: return 'Equals';
            }
        } else if (FIELD_TYPE_CATEGORIES.BOOLEAN.includes(fieldType)) {
            switch (whenToDisplay) {
                case 'isTrue': return 'True';
                case 'isFalse': return 'False';
                default: return 'True';
            }
        }
        
        return whenToDisplay; // fallback
    }

    /* SAVE FUNCTIONS */
    handleSaveIndicator() {
        this.saveInProgress = true;
        
        try {
            // Convert variants back to extension format
            const indicatorItemExtensions = this.itemVariants.map((variant, index) => {
                const baseApiName = this._indicator.QualifiedApiName || 'DefaultIndicator';
                
                // Use existing QualifiedApiName if this is an existing extension, otherwise generate new one
                let extensionApiName;
                if (variant.QualifiedApiName) {
                    // Existing extension - preserve the QualifiedApiName
                    extensionApiName = variant.QualifiedApiName;
                } else {
                    // New extension - generate a new developer-friendly name with timestamp
                    const safeName = variant.label ? variant.label.replace(/[^a-zA-Z0-9]/g, '_') : 'Extension';
                    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
                    
                    // Avoid duplicating the base name if the extension label matches the indicator name
                    if (safeName.toLowerCase() === baseApiName.toLowerCase()) {
                        extensionApiName = `${baseApiName}_${timestamp}_${index + 1}`;
                    } else {
                        extensionApiName = `${baseApiName}_${safeName}_${timestamp}_${index + 1}`;
                    }
                }
                
                const extension = {
                    QualifiedApiName: extensionApiName,
                    Label: variant.label || `Extension ${index + 1}`,
                    Indicator_Item__c: baseApiName, // Use indicator item QualifiedApiName for Custom Metadata deployment
                    Active__c: variant.isActive !== false,
                    Priority__c: index + 1,
                    Description__c: variant.label || `Extension ${index + 1}`
                };
                
                // Add field values - only include non-null/non-empty values to avoid metadata deployment issues
                const textOperator = this.convertWhenToDisplayToTextOperator(variant.whenToDisplay || variant.TextOperator, this._indicator.FieldType || 'String');
                if (textOperator) extension.Text_Operator__c = textOperator;
                if (variant.ContainsText) extension.Contains_Text__c = variant.ContainsText;
                if (variant.Minimum) extension.Minimum__c = variant.Minimum;
                if (variant.Maximum) extension.Maximum__c = variant.Maximum;
                if (variant.hoverText) extension.Hover_Text__c = variant.hoverText;
                
                // Handle icon/image/text based on iconSource - only add if not null
                if (variant.iconSource === 'sldsIcon' && variant.sourceValue) {
                    extension.Icon_Value__c = variant.sourceValue;
                }
                if (variant.iconSource === 'url' && variant.sourceValue) {
                    extension.Image__c = variant.sourceValue;
                }
                if (variant.iconSource === 'staticText' && variant.sourceValue) {
                    extension.Static_Text__c = variant.sourceValue;
                }
                if (variant.backgroundColour) extension.Icon_Background__c = variant.backgroundColour;
                if (variant.foregroundColour) extension.Icon_Foreground__c = variant.foregroundColour;
                
                return extension;
            });
            
            // Ensure the indicator item has all required fields and preserve existing data
            const indicatorItem = JSON.parse(JSON.stringify(this._indicator));
            
            // Ensure required fields are present
            if (!indicatorItem.QualifiedApiName) {
                throw new Error('Indicator must have a QualifiedApiName');
            }
            if (!indicatorItem.Label) {
                indicatorItem.Label = indicatorItem.QualifiedApiName;
            }
            
            // Remove Extensions array - it's handled separately and doesn't belong on Indicator_Item__mdt
            delete indicatorItem.Extensions;
            
            // Remove Salesforce record Id - metadata deployment doesn't need this
            delete indicatorItem.Id;
            
            // Clean up any undefined values that could cause issues
            Object.keys(indicatorItem).forEach(key => {
                if (indicatorItem[key] === undefined) {
                    delete indicatorItem[key];
                }
            });
            
            // Create deployment wrapper with both indicator item and extensions
            const wrapper = {
                indicatorItem: indicatorItem,
                indicatorItemExtensions: indicatorItemExtensions
            };
            
            deployIndicatorBundles({ wrapper: JSON.stringify(wrapper) })
                .then(result => {
                    console.log('Save successful, deploymentId:', result);
                    this.showToast('Success', 'Indicator saved successfully', 'success');
                    this.dispatchEvent(new CustomEvent('indicatorsaved', { 
                        detail: { deploymentId: result, indicator: this._indicator } 
                    }));
                })
                .catch(error => {
                    console.error('Save error:', error);
                    console.error('Full error object:', JSON.stringify(error, null, 2));
                    console.error('Error body:', error.body);
                    console.error('Error message:', error.message);
                    
                    let errorMessage = 'Failed to save indicator';
                    if (error.body && error.body.message) {
                        errorMessage += ': ' + error.body.message;
                    } else if (error.message) {
                        errorMessage += ': ' + error.message;
                    }
                    
                    this.showToast('Error', errorMessage, 'error');
                })
                .finally(() => {
                    this.saveInProgress = false;
                });
                
        } catch (error) {
            console.error('Save preparation error:', error);
            this.showToast('Error', 'Failed to prepare save data: ' + error.message, 'error');
            this.saveInProgress = false;
        }
    }
    
    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(event);
    }

    /* WIRE FUNCTIONS */
    @wire(getSldsIcons, {})
    iconOptions({ error, data }){
        if(data){
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