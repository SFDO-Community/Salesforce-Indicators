import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import CARD_TITLE_FIELD from '@salesforce/schema/Indicator_Bundle__mdt.Card_Title__c';
import CARD_ICON_FIELD from '@salesforce/schema/Indicator_Bundle__mdt.Card_Icon__c';
import CARD_TEXT_FIELD from '@salesforce/schema/Indicator_Bundle__mdt.Card_Text__c';

import getIndicatorConfig from '@salesforce/apex/IndicatorController.getIndicatorSettingsForBundle';
import getIndicatorConfig2 from '@salesforce/apex/IndicatorController.getIndicatorSettingsForBundle2';

const FIELDS = [CARD_TITLE_FIELD, CARD_ICON_FIELD, CARD_TEXT_FIELD];

export default class IndicatorList extends LightningElement {
    @api objectApiName;
    @api recordId;
    @api indsSize = 'large';
    @api indsShape = 'base';
    @api bundleId;

    configList = [];
    bundleMetaObj = {};

    // @wire(getRecord, {recordId: '$bundleId', fields: FIELDS })  // ? Why doesn't this work?
    @wire(getRecord, {recordId: '$bundleId', fields: ['Indicator_Bundle__mdt.Card_Title__c','Indicator_Bundle__mdt.Card_Icon__c','Indicator_Bundle__mdt.Card_Text__c'] }) 
    bundle({error, data}) {
        if(error) {
            this.errorOccurred = true;
            let message = 'Unknown error';
            if (Array.isArray(error.body)) {
                message = error.body.map(e => e.message).join(', ');
            } else if (typeof error.body.message === 'string') {
                message = error.body.message;
            }
            this.errorMessage = message;
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error loading bundle',
                    message,
                    variant: 'error',
                    mode: 'sticky'
                }),
            );
        } else if (data) {
            let metadataVal = data.fields;
            this.bundleMetaObj = {
                Card_Title__c : metadataVal.Card_Title__c.value,
                Card_Icon__c: metadataVal.Card_Icon__c.value,
                Card_Text__c: metadataVal.Card_Text__c.value
            }
            // console.log('We have data!');
            // console.log('bundleMetaObj',this.bundleMetaObj);
        }
    };

    get cardTitle(){
        // return getFieldValue(this.bundle.data, CARD_TITLE_FIELD);
        return this.bundleMetaObj.Card_Title__c;
    }

    get cardIcon(){
        // return getFieldValue(this.bundle.data, CARD_ICON_FIELD);
        return this.bundleMetaObj.Card_Icon__c;
    }

    get cardText(){
        // return getFieldValue(this.bundle.data, CARD_TEXT_FIELD);
        return this.bundleMetaObj.Card_Text__c;
    }

    refreshComponent(event){
        eval("$A.get('e.force:refreshView').fire();");
    }

    //Holds the constructed indicators to be rendered.
    inds = [];
    indExts = [];
    fSettings = [];
    //Holds the Field Name and Object Name to use in the Wire Service
    apiFieldnameDefinitions = [];

    //Used to return an error back to the user
    errorOccurred = false;
    errorMessage = '';
    results = [];


    @wire(getRecord, { recordId: '$recordId', optionalFields: '$apiFieldnameDefinitions' })
    wiredRecord({data, error}) {
        if (data) {
            // console.log('Data => ', JSON.stringify(data));
            let matchingFields = [];
            
            this.apiFieldnameDefinitions.forEach(
                definition => 
                {
                    let dataValue = getFieldValue(data, definition);
                    let extValue;

                    if((dataValue || dataValue === 0) && definition.extensionOptions){
                        // console.log('Arr: ', definition.extensionOptions);
                        // extensionComparison(dataValue, definition.extensionOptions);
        
                        definition.extensionOptions.forEach(
                            
                            ext => 
                            {
                                let match = false;
                                let stringValue = JSON.stringify(dataValue);
                                // console.log('StringValue',stringValue);
                                if(ext.Contains_Text__c) {
                                    // console.log('Value',dataValue + ' ' + ext.Contains_Text__c);
                                    if(stringValue.includes(ext.Contains_Text__c)){
                                        match = true;
                                    }
                                } else if (ext.Minimum__c || ext.Minimum__c === 0 ) {
                                    // console.log('Values',dataValue + ' ' + ext.Minimum__c + ' ' + ext.Maximum__c);
                                    if(ext.Maximum__c || ext.Maximum__c === 0) {
                                        // console.log('has Maximum');
                                        if(dataValue >= ext.Minimum__c && dataValue < ext.Maximum__c) {
                                            match = true;
                                        }
                                    } else {
                                        // console.log('only Minimum');
                                        if(dataValue >= ext.Minimum__c) {
                                            match = true;
                                        }
                                    }
                                }

                                // console.log('Match Status',match);
                                if(match) {
                                    extValue = {
                                        "iconName" : ext.Icon_Value__c,
                                        "textValue" : ext.Static_Text__c,
                                        "imageURL" : ext.Image__c,
                                        "hoverValue" : ext.Hover_Text__c,
                                        "extPriority" : ext.Priority__c
                                    };

                                    // console.dir(extValue);
                                }

                            }
                            
                        )
                        
                    }

                    matchingFields.push(
                    {
                        fName: definition.fieldApiName,
                        //This is not needed for the Component display but leaving it here for useful debugging
                        fValue: getFieldValue(data, definition),
                        fTextValue: dataValue,
                        ...dataValue || dataValue === 0 ? {
                            ...(dataValue || dataValue === 0) && extValue ? {
                                fImageURL: extValue.imageURL
                                } : {
                                    fImageURL: definition.setImageURL
                                }
                            } : {
                                fImageURL: definition.setFalseImageURL
                            },
                        // ! If value is false, the false hover will be set.
                        ...dataValue || dataValue === 0  ? {
                            ...(dataValue || dataValue === 0) && extValue ? {
                                fHoverValue: extValue.hoverValue ? extValue.hoverValue : dataValue
                                } : {
                                ...(dataValue || dataValue === 0) && definition.setHoverValue ? {
                                    fHoverValue: definition.setHoverValue
                                    } : {
                                    fHoverValue: dataValue
                                    }
                                }
                            }: {
                            ...(dataValue === false || dataValue === null || dataValue === '') && definition.showFalse ? {
                                fHoverValue: definition.setFalseHoverValue ? definition.setFalseHoverValue : ''
                                } : {
                                fHoverValue: ''
                                }
                            },
                        //If False Icon is not entered AND the boolean value is False or text value is empty, then do not display the Avatar
                        ...dataValue  || dataValue === 0 || definition.showFalse ? {
                            fShowAvatar : true
                            } : {
                            fShowAvatar : false
                            },
                        //If the value is false, the false icon will be set.
                        ...dataValue || dataValue === 0? {
                            ...dataValue && extValue ? {
                                fIconName : extValue.iconName
                                } : {
                                fIconName : definition.setIconName
                                }
                            } : {
                            ...(dataValue === false || dataValue === null || dataValue === '') && definition.showFalse ? {
                                fIconName : definition.setFalseIcon ? definition.setFalseIcon : ''
                                } : {
                                fIconName : ''
                                }
                            },
                        //If the False Icon and False Text is entered and the Boolean is False or text value is empty, then set the False Text
                        //If the Icon Text is entered then show that
                        //If no Icon Text is entered if the field is a Boolean then show the icon otherwise show the field value    
                        ...dataValue || dataValue === 0 ? {
                            ...dataValue && extValue ? {
                                fTextShown: extValue.textValue
                                } : {
                                ...dataValue && definition.setTextVal ? {
                                    fTextShown : definition.setTextVal 
                                    } : {
                                    fTextShown : typeof(dataValue) === 'boolean' ? '' : String(dataValue).toUpperCase().substring(0,3) 
                                    }
                                }
                            } : {
                            ...(dataValue === false || dataValue === null || dataValue === '') && definition.showFalse ? {
                                fTextShown : definition.setFalseText ? definition.setFalseText : ''
                                } : {
                                fTextShown : '' 
                                }
                            }
                    });
                });
            this.results = matchingFields;
            console.log('FieldValue => ', JSON.stringify(this.results));
        } else if (error) {
            this.errorMessage = JSON.stringify(error);
            this.errorOccurred = true;
        }
    }

    connectedCallback() {

        getIndicatorConfig2({bundleId:this.bundleId}).then(
            result =>
            {
                console.log('Config2');
                console.dir(result);
            });

        // console.log('BundleId', this.bundleId);
        getIndicatorConfig({bundleId:this.bundleId}).then(
            result =>
            {
                this.configList = result;
                this.errorOccurred = false;
                this.errorMessage = undefined;
                // console.log(JSON.stringify(result));

                //Set up the Settings Fields;
                for(let i = 0; i < result.length; i++) {
                    // console.log(result[i]);
                    this.inds.push({
                        // "indCount" : this.inds[i],
                        "indFieldName" : result[i].Field__r.QualifiedApiName,
                        "iconName" : result[i].Icon_Value__c,
                        "textValue" : result[i].Static_Text__c,
                        "imageURL" : result[i].Image__c,
                        "hoverValue" : result[i].Hover_Text__c,
                        "falseDisplay" : result[i].Show_False_or_Blank__c,
                        "falseIcon" : result[i].Inverse_Icon_Value__c,
                        "falseText" : result[i].Inverse_Static_Text__c,
                        "falseHoverValue" : result[i].Inverse_Hover_Text__c,
                        "falseImageURL": result[i].Inverse_Image__c,
                        "indOrder" : result[i].Indicator_Bundle_Items__r[0].Order__c,
                        "indExtension" : result[i].Indicator_Item_Extensions__r
                    });

                    // TODO: Sorting only partially works.
                    this.inds.sort((a, b) => {
                        if(a.indOrder - b.indOrder) {
                            if(a.indFieldName > b.indFieldName) {
                                return 1
                            } else {
                                return -1
                            }
                        } else {
                            return -1
                        }
                    });

                    // console.log('sObjects match', this.objectApiName == result[i].sObject__r.QualifiedApiName);

                    // When the record page's sObject equals the bundle's sObject
                    // Map the Settings along with the Fields Names into the one Object
                    if(this.objectApiName == result[i].sObject__r.QualifiedApiName ){
                        
                        // Attempt 1:
                        // let fieldNameDefinition = {
                        //     fieldApiName: result[i].Field__r.QualifiedApiName,
                        //     objectApiName: this.objectApiName
                        // };
                        // this.apiFieldnameDefinitions.push({ fieldNameDefinition });

                        // Attempt 2:
                        // this.apiFieldnameDefinitions.push({ 
                        //     "fieldApiName" : result[i].Field__r.QualifiedApiName,
                        //     "objectApiName": this.objectApiName
                        // });

                        // Attempt 3:
                        //let fieldNameDefinition = this.objectApiName + '.' + result[i].Field__r.QualifiedApiName;

                        // this.apiFieldnameDefinitions.push({ fieldNameDefinition });

                        // Attempt 4:
                        this.apiFieldnameDefinitions = (this.inds).map(indSetting => 
                        {
                            let fieldNameDefinition = {
                                fieldApiName: indSetting.indFieldName,
                                objectApiName: this.objectApiName,
                                setTextVal: indSetting.textValue,
                                setIconName: indSetting.iconName,
                                setImageURL: indSetting.imageURL,
                                setHoverValue: indSetting.hoverValue,
                                showFalse: indSetting.falseDisplay,
                                setFalseIcon: indSetting.falseIcon,
                                setFalseText: indSetting.falseText,
                                setFalseHoverValue: indSetting.falseHoverValue,
                                setFalseImageURL: indSetting.falseImageURL,
                                extensionOptions: indSetting.indExtension
                            };
                            return fieldNameDefinition;
                        });

                    }

                }

            }).catch(error=>{
                this.configList = undefined;
                this.errorOccurred = true;
                this.errorMessage = JSON.stringify(error);
                console.log(error);
            })


        // console.log('DefinitionArray => ',this.apiFieldnameDefinitions);
        // console.log('Definitions => ', JSON.stringify(this.apiFieldnameDefinitions));
    }

    extensionComparison(dataValue, extensions) {

        /*
        Extension Values:
            Contains_Text__c, 
            Maximum__c, 
            Minimum__c, 
            Priority__c,
            Hover_Text__c,
            Icon_Value__c,
            Image__c,
            Static_Text__c
        */
        let extValues = [];
        

        extensions.forEach(
            ext => 
            {
                let match = false;

                if(ext.Contains_Text__c) {
                    if(dataValue.includes(ext.Contains_Text__c)){
                        match = true;
                    }
                } else if (ext.Minimum__c) {
                    if(ext.Maximum__c) {
                        if(dataValue >= ext.Minimum__c && dataValue < ext.Maximum__c) {
                            match = true;
                        }
                    } else {
                        if(dataValue >= ext.Minimum__c) {
                            match = true;
                        }
                    }
                }

                if(match) {
                    extValues.push({
                        "iconName" : ext.Icon_Value__c,
                        "textValue" : ext.Static_Text__c,
                        "imageURL" : ext.Image__c,
                        "hoverValue" : ext.Hover_Text__c,
                        "extPriority" : ext.Priority__c
                    });
                }
            }
        )
        // console.dir(extValues);

        return;
    } 
    
}