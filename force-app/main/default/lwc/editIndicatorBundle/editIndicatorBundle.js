/**
 * Created by robertwright on 10/31/23.
 */

import {LightningElement, wire, track} from 'lwc';
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
            console.log(message);
        } else if (data) {
            console.log(data);
            console.log(JSON.parse(JSON.stringify(data)));
            this.objectInfo = data;
        }
    };


    @track indicator_Bundle = {};
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
        return {
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
        }
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
    handleSave(event) {
        this.showSpinner = true;
        this.saveMetaDataRecord();
    }



    saveMetaDataRecord() {
        deployIndicatorBundles({wrapper: [this.indicator_Bundle]})
            .then(result => {
                console.log('deploymentId = result');
            })
            .catch(error => {
                console.log(error);
            })
            .finally(() => {
                this.showSpinner = false;
            });
    }




}