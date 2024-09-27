import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';

export default class FieldIndicatorBundle extends LightningElement {
    @api bundleName;    // Value assigned by the property editor
    @api recordId;  // Record Id from the record page
    @api objectApiName; // sObject from the record page
    @api flexipageRegionWidth;  // Width of the container on record page
    @api showDescription;
    @api showTitle;
    @api indsSize = 'large';
    @api indsShape = 'base';
    @api showRefresh = false;
    @api mappedField = '';  // API Field Name for the record

    targetIdField;     // Syntax of template field:  sObject.Field_Name__c
    targetIdValue;

    // Set field to be used when querying for record's mapped value.
    connectedCallback() {
        if(this.mappedField == null || this.mappedField.trim() == ""){
            // THROW ERROR THAT IT'S NOT CONFIGURED
            // this.errors = ['Missing field configuration'];
            // this.notifyUser('Lookup Configuration Error', 'Selector is not mapped to a ' + objectApiName + ' field.', 'error');
            console.log('Configuration Error'); 
        } else {
            this.targetIdField = this.objectApiName + '.' + this.mappedField;
            console.log('Target Id Field: ', this.targetIdField);
        }
    }

     // Check the record for an existing value in order to initialize it.
     @wire(getRecord, { recordId: '$recordId', fields: '', optionalFields: '$targetIdField' }) 
     record ({error, data}) {
         if(error) {
             console.log('ERROR');
             this.errors = [error];
             this.targetIdValue = undefined;
            //  this.notifyUser('Get Source Value Error', 'Get Record Error.', 'error');
         } else if (data) {
             this.targetIdValue = getFieldValue(data, this.targetIdField);
             console.log(this.targetIdValue);
            //  this.errors = [];
         }
     }
}