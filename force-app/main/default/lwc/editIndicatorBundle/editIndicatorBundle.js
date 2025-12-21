/**
 * Created by robertwright on 10/31/23.
 */

import {LightningElement, api, wire, track} from 'lwc';
import { getObjectInfo } from "lightning/uiObjectInfoApi";
import deployIndicatorBundles from '@salesforce/apex/MetadataUtility.deployIndicatorBundles';

import Indicator_Bundle from "@salesforce/schema/Indicator_Bundle__mdt";

import Active_FIELD from "@salesforce/schema/Indicator_Bundle__mdt.Active__c";
import Card_Icon_FIELD from "@salesforce/schema/Indicator_Bundle__mdt.Card_Icon__c";
import Card_Icon_Background_FIELD from "@salesforce/schema/Indicator_Bundle__mdt.Card_Icon_Background__c";
import Card_Icon_Foreground_FIELD from "@salesforce/schema/Indicator_Bundle__mdt.Card_Icon_Foreground__c";
import Card_Text_FIELD from "@salesforce/schema/Indicator_Bundle__mdt.Card_Text__c";
import Card_Title_FIELD from "@salesforce/schema/Indicator_Bundle__mdt.Card_Title__c";
import Description_FIELD from "@salesforce/schema/Indicator_Bundle__mdt.Description__c";
import sObject_FIELD from "@salesforce/schema/Indicator_Bundle__mdt.sObject__c";
import {NavigationMixin} from "lightning/navigation";

export default class EditIndicatorBundle extends LightningElement {

    showSpinner = false;
    
    get modalTitle() {
        return this.indicator_Bundle.Label || 'Edit Bundle';
    }
    
    get indicatorBundleObjectApiName() {
        return Indicator_Bundle.objectApiName.replace('__c','__mdt')
    }

    objectInfo = {};
    @wire(getObjectInfo, { objectApiName: '$indicatorBundleObjectApiName' }) setObjectInfo({ error, data }) {
        if (error) {
            let message = 'Unknown error';
            if (Array.isArray(error.body)) {
                message = error.body.map(e => e.message).join(', ');
            } else if (typeof error.body.message === 'string') {
                message = error.body.message;
            }
        } else if (data) {
            this.objectInfo = data;
        }
    };


    @track indicator_Bundle = {};
    
    @api get bundle() {
        return this.indicator_Bundle;
    }
    
    set bundle(value) {
        if (value) {
            console.log('🔧 EditIndicatorBundle: bundle setter called with:', value);
            console.log('🔧 EditIndicatorBundle: bundle value type:', typeof value);
            console.log('🔧 EditIndicatorBundle: bundle stringified:', JSON.stringify(value, null, 2));
            this.indicator_Bundle = { ...value };
            console.log('🔧 EditIndicatorBundle: indicator_Bundle after assignment:', this.indicator_Bundle);
        } else {
            console.log('🔧 EditIndicatorBundle: bundle setter called with null/undefined');
            this.indicator_Bundle = {};
        }
    }
    getdataType(fieldApiName) {
        const fieldObject = this.objectInfo?.fields[fieldApiName] || {};
        switch (fieldObject.dataType) {
            case 'String': return 'text';
            case 'Boolean': return 'checkbox-button';
            default:
                return "text";
        }
    }
    get bundleInfo() {
        const result = {
            Label : {
                fieldApiName : 'Label',
                label: 'Label',
                value: this.indicator_Bundle['Label'],
                dataType: 'text'
            },
            QualifiedApiName : {
                fieldApiName : 'QualifiedApiName',
                label: 'QualifiedApiName',
                value: this.indicator_Bundle['QualifiedApiName'],
                dataType: 'text'
            },
            Active_FIELD : {
                fieldApiName : Active_FIELD.fieldApiName,
                label: this.objectInfo?.fields[Active_FIELD.fieldApiName]?.label,
                inlineHelpText: this.objectInfo?.fields[Active_FIELD.fieldApiName]?.inlineHelpText,
                value: this.indicator_Bundle[Active_FIELD.fieldApiName],
                dataType: this.getdataType(Active_FIELD.fieldApiName),
                required: this.objectInfo?.fields[Active_FIELD.fieldApiName]?.required
            },
            Card_Icon_FIELD : {
                fieldApiName : Card_Icon_FIELD.fieldApiName,
                label: this.objectInfo?.fields[Card_Icon_FIELD.fieldApiName]?.label,
                inlineHelpText: this.objectInfo?.fields[Card_Icon_FIELD.fieldApiName]?.inlineHelpText,
                value: this.indicator_Bundle[Card_Icon_FIELD.fieldApiName],
                dataType: this.getdataType(Card_Icon_FIELD.fieldApiName),
                required: this.objectInfo?.fields[Card_Icon_FIELD.fieldApiName]?.required
            },
            Card_Icon_Background_FIELD : {
                fieldApiName : Card_Icon_Background_FIELD.fieldApiName,
                label: this.objectInfo?.fields[Card_Icon_Background_FIELD.fieldApiName]?.label,
                inlineHelpText: this.objectInfo?.fields[Card_Icon_Background_FIELD.fieldApiName]?.inlineHelpText,
                value: this.indicator_Bundle[Card_Icon_Background_FIELD.fieldApiName],
                dataType: this.getdataType(Card_Icon_Background_FIELD.fieldApiName),
                required: this.objectInfo?.fields[Card_Icon_Background_FIELD.fieldApiName]?.required
            },
            Card_Icon_Foreground_FIELD : {
                fieldApiName : Card_Icon_Foreground_FIELD.fieldApiName,
                label: this.objectInfo?.fields[Card_Icon_Foreground_FIELD.fieldApiName]?.label,
                inlineHelpText: this.objectInfo?.fields[Card_Icon_Foreground_FIELD.fieldApiName]?.inlineHelpText,
                value: this.indicator_Bundle[Card_Icon_Foreground_FIELD.fieldApiName],
                dataType: this.getdataType(Card_Icon_Foreground_FIELD.fieldApiName),
                required: this.objectInfo?.fields[Card_Icon_Foreground_FIELD.fieldApiName]?.required
            },
            Card_Text_FIELD : {
                fieldApiName : Card_Text_FIELD.fieldApiName,
                label: this.objectInfo?.fields[Card_Text_FIELD.fieldApiName]?.label,
                inlineHelpText: this.objectInfo?.fields[Card_Text_FIELD.fieldApiName]?.inlineHelpText,
                value: this.indicator_Bundle[Card_Text_FIELD.fieldApiName],
                dataType: this.getdataType(Card_Text_FIELD.fieldApiName),
                required: this.objectInfo?.fields[Card_Text_FIELD.fieldApiName]?.required
            },
            Card_Title_FIELD : {
                fieldApiName : Card_Title_FIELD.fieldApiName,
                label: this.objectInfo?.fields[Card_Title_FIELD.fieldApiName]?.label,
                inlineHelpText: this.objectInfo?.fields[Card_Title_FIELD.fieldApiName]?.inlineHelpText,
                value: this.indicator_Bundle[Card_Title_FIELD.fieldApiName],
                dataType: this.getdataType(Card_Title_FIELD.fieldApiName),
                required: this.objectInfo?.fields[Card_Title_FIELD.fieldApiName]?.required
            },
            Description_FIELD : {
                fieldApiName : Description_FIELD.fieldApiName,
                label: this.objectInfo?.fields[Description_FIELD.fieldApiName]?.label,
                inlineHelpText: this.objectInfo?.fields[Description_FIELD.fieldApiName]?.inlineHelpText,
                value: this.indicator_Bundle[Description_FIELD.fieldApiName],
                dataType: this.getdataType(Description_FIELD.fieldApiName),
                required: this.objectInfo?.fields[Description_FIELD.fieldApiName]?.required
            },
            sObject_FIELD : {
                fieldApiName : sObject_FIELD.fieldApiName,
                label: this.objectInfo?.fields[sObject_FIELD.fieldApiName]?.label,
                inlineHelpText: this.objectInfo?.fields[sObject_FIELD.fieldApiName]?.inlineHelpText,
                value: this.indicator_Bundle[sObject_FIELD.fieldApiName],
                dataType: this.getdataType(sObject_FIELD.fieldApiName),
                required: this.objectInfo?.fields[sObject_FIELD.fieldApiName]?.required
            }
        };
        return result;
    }


    connectedCallback() {
        console.log(this.indicatorBundleObjectApiName);
        console.log(Active_FIELD);
        console.log(Card_Icon_FIELD);
        console.log(Card_Icon_Background_FIELD);
        console.log(Card_Icon_Foreground_FIELD);
        console.log(Card_Text_FIELD);
        console.log(Card_Title_FIELD);
        console.log(Description_FIELD);
        console.log(sObject_FIELD);
    }


    replaceWhiteSpace(value) {
        const returnValue = (value || '').replaceAll('_',' ')
            .replaceAll('_',' ')
            .replaceAll(/[\W_]+/g," ")
            .trim()
            .replaceAll(/  +/g,' ')
            .replaceAll(' ','_');

        return (returnValue.length > 40) ? returnValue.substring(0,40) : returnValue;
    }

    handleLabelChange(event) {
        const value = event.detail.value;
        this.indicator_Bundle['Label'] = (value.length > 40) ? value.substring(0,40) : value;
        this.indicator_Bundle['QualifiedApiName'] = this.replaceWhiteSpace(value);
    }
    handleChange(event) {
        const value = event.detail.value;
        const fieldName = (event.target.dataset || {}).fieldApiName;
        this.indicator_Bundle[fieldName] = value;
    }
    handleCancel() {
        // Dispatch event to close modal
        this.dispatchEvent(new CustomEvent('cancel'));
    }
    
    handleSave(event) {
        console.log('🔧 EditIndicatorBundle: handleSave called');
        console.log('🔧 EditIndicatorBundle: indicator_Bundle data:', JSON.stringify(this.indicator_Bundle, null, 2));
        this.showSpinner = true;
        this.saveMetaDataRecord();
    }



    saveMetaDataRecord() {
        console.log('🔧 EditIndicatorBundle: saveMetaDataRecord called');
        
        // Create a clean bundle object with only the editable fields
        const bundleToSave = {
            Id: this.indicator_Bundle.Id,
            QualifiedApiName: this.indicator_Bundle.QualifiedApiName,
            Label: this.indicator_Bundle.Label,
            Active__c: this.indicator_Bundle.Active__c,
            Card_Icon__c: this.indicator_Bundle.Card_Icon__c,
            Card_Title__c: this.indicator_Bundle.Card_Title__c,
            Description__c: this.indicator_Bundle.Description__c,
            sObject__c: this.indicator_Bundle.sObject__c,
            Delete__c: false
        };
        
        console.log('🔧 EditIndicatorBundle: Clean bundle object to save:', JSON.stringify({ 'indicatorBundle': bundleToSave }, null, 2));
        
        deployIndicatorBundles({ wrapper: JSON.stringify({ 'indicatorBundle': bundleToSave }) })
            .then(result => {
                console.log('🔧 EditIndicatorBundle: Deploy success, deploymentId =', result);
                // Dispatch event to close modal with success
                this.dispatchEvent(new CustomEvent('save', { detail: result }));
            })
            .catch(error => {
                console.error('🔧 EditIndicatorBundle: Deploy error:', error);
            })
            .finally(() => {
                console.log('🔧 EditIndicatorBundle: Deploy completed, hiding spinner');
                this.showSpinner = false;
            });
    }




}