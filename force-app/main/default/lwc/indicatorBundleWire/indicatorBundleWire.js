import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';

import getIndicatorConfig2 from '@salesforce/apex/IndicatorController.getIndicatorSettingsForBundle2';

export default class IndicatorList2 extends LightningElement {

    @api recordId;
    @api objectApiName;
    @api indsSize = 'large';
    @api indsShape = 'base';
    @api bundleId;
    bundleActive = true;
    hasHeader = false;

    configList = [];
    card = {};

    //Holds the Field Name and Object Name to use in the Wire Service
    apiFieldnameDefinitions = [];

    wiredValues;
    results = [];

    //Used to return an error back to the user
    errorOccurred = false;
    errorMessage = '';

    // ! THIS IS NO LONGER NEEDED - ALL HANDLED IN @wire CALLS
    connectedCallback(){
        // console.log('Connected Callback');
        // console.log('Bundle Id', this.bundleId);
        
        // getIndicatorConfig2({ bundleId : this.bundleId }).then(
        //     result =>
        //     {
        //         const {error, data} = result;

        //         if(data) {
        //             this.configList = data;
        //             this.errorOccurred = false;
        //             this.errorMessage = undefined;
        //             for( let i = 0; i < data.length; i++){
        //                 let apiFieldSyntax = '' + this.objectApiName + '.' + data[i].FieldApiName;
        //                 this.apiFieldnameDefinitions.push(apiFieldSyntax);
        //             }
        
        //             console.log('Api Fieldname Definitions');
        //             console.dir(this.apiFieldnameDefinitions);
        
        //         } else if (error) {
        //             this.configList = undefined;
        //             this.errorOccurred = true;
        //             this.errorMessage = JSON.stringify(error);

        //             console.log('Error',this.errorMessage);
        //         }
        //     }
        // );

        // refreshApex(this.wiredValues);
    }

    // Call the Apex Class to return the CMDT values for the assigned Bundle.
    @wire(getIndicatorConfig2, {bundleId : '$bundleId'})
    indicatorValues ({ error, data }) {
        if(data) {
            this.configList = data;
            this.errorOccurred = false;
            this.errorMessage = undefined;

            // Loop through the returned CMDT indicator settings and assign the Api Fields which should be queried
            for( let i = 0; i < data.length; i++){
                let apiFieldSyntax = '' + this.objectApiName + '.' + data[i].FieldApiName;
                // console.log('fieldSyntax',apiFieldSyntax);
                this.apiFieldnameDefinitions = [...this.apiFieldnameDefinitions, apiFieldSyntax];
            }

            // console.log('Api Fieldname Definitions');
            // console.dir(this.apiFieldnameDefinitions);

        } else if (error) {
            this.configList = undefined;
            this.errorOccurred = true;
            this.errorMessage = JSON.stringify(error);
        }
    }
 
    // ? Why do this, when you could change the SOQL in the Controller to return a Bundle with children and grand children?
    // Because of the Junction Object approach, we would either need to query twice in APEX or do it this way.
    // ! Using @wire on CMDT requires knowing the field API Names, you cannot import them from Schema at the time of writing this class (OCT-2022)
    @wire(getRecord, { recordId: '$bundleId', fields: ['Indicator_Bundle__mdt.Active__c','Indicator_Bundle__mdt.Card_Title__c','Indicator_Bundle__mdt.Card_Icon__c','Indicator_Bundle__mdt.Card_Text__c'] }) 
    bundle({error, data}) {
        if(error) {
            console.log(error);
            this.errorOccurred = true;
            let message = 'Unknown error';
            if (Array.isArray(error.body)) {
                message = error.body.map(e => e.message).join(', ');
            } else if (typeof error.body.message === 'string') {
                message = error.body.message;
            }
            this.errorMessage = message;
        } else if (data) {
            let metadataVal = data.fields;
            this.card = {
                title : metadataVal.Card_Title__c.value,
                icon: metadataVal.Card_Icon__c.value,
                body: metadataVal.Card_Text__c.value
            }
            if(metadataVal.Card_Title__c.value || metadataVal.Card_Icon__c.value){
                this.hasHeader = true;
            }
            this.bundleActive = metadataVal.Active__c.value;
            // console.log('Bundle metadata',this.card);
        }
    };

    // Get the field values for the current record based on the configured fields in CMDT
    // Using 'optionalFields' ensures that if a user does not have access to a field, the indicator will not show.
    @wire(getRecord, { recordId: '$recordId', optionalFields: '$apiFieldnameDefinitions' })
    wiredRecord(result) {
        this.wiredValues = result;  // TODO: This is used to allow for the Refresh Apex method - Is this a needed feature?
        const {error,data} = result;
        // console.log('Record', this.recordId);
        if (data) {
            // console.log('Data => ', JSON.stringify(data));
            let matchingFields = [];
            
            // Loop through the configured CMDT indicator settings
            this.configList.forEach(
                definition => 
                {
                    console.log('Def',definition);
                    
                    let showDefault = false;
                    if( definition.HoverValue || definition.TextValue || definition.IconName || definition.ImageURL ){
                        showDefault = true;
                    }
                    
                    let dataField = this.objectApiName + "." + definition.FieldApiName;
                    // console.log('DataField',dataField);
                    let dataValue = getFieldValue(data, dataField); // Get the record's field value for the current CMDT indicator setting
                    
                    if (definition.ZeroBehavior === 'Treat Zeroes as Blanks' && dataValue === 0){
                        dataValue = null;
                    }

                    let extValue;
                    // console.log('DataValue',dataValue);

                    // If the record has a value and the CMDT indicator setting has extensions
                    if((dataValue || dataValue === 0) && definition.Extensions){
                        // console.log('Inside If');
                        // extensionComparison(dataValue, definition.extensionOptions);
        
                        // Loop through each CMDT indicator setting extension
                        definition.Extensions.forEach(
                            ext => 
                            {
                                let match = false;
                                let stringValue = JSON.stringify(dataValue);
                                // console.log('StringValue',stringValue);
                                // If the extension uses a String search, check if there is a match
                                if(ext.ContainsText) {
                                    // console.log('Value',dataValue + ' ' + ext.ContainsText);
                                    if(stringValue.includes(ext.ContainsText)){
                                        match = true;
                                    }
                                } 
                                // Else if the extension uses a Minimum boundary
                                else if (ext.Minimum || ext.Minimum === 0 ) {
                                    // console.log('Values',dataValue + ' ' + ext.Minimum + ' ' + ext.Maximum);
                                    // Check if there is a Maximum boundry and if the record's value falls within it.
                                    if(ext.Maximum || ext.Maximum === 0) {
                                        // console.log('has Maximum');
                                        if(dataValue >= ext.Minimum && dataValue < ext.Maximum) {
                                            match = true;
                                        }
                                    } 
                                    // Else, check if the record's value is greater than the minimum
                                    else {
                                        // console.log('only Minimum');
                                        if(dataValue >= ext.Minimum) {
                                            match = true;
                                        }
                                    }
                                }

                                // console.log('Match Status',match);
                                if(match) {
                                    // If there is a match for an Extension, assign the extension's override values
                                    extValue = {
                                        "iconName" : ext.ExtensionIconValue,
                                        "textValue" : ext.ExtensionTextValue,
                                        "imageURL" : ext.ExtensionImageUrl,
                                        "hoverValue" : ext.ExtensionHoverText,
                                        "extPriority" : ext.PriorityOrder
                                    };

                                    // console.dir(extValue);
                                }

                            }
                            
                        )
                        
                    }

                    matchingFields.push(
                    {
                        fName: definition.FieldApiName,
                        fTextValue: dataValue,  // DEBUG PURPOSES
                        ...dataValue || dataValue === 0 ? {
                            ...(dataValue || dataValue === 0) && extValue ? {
                                fImageURL: extValue.imageURL
                                } : {
                                    fImageURL: definition.ImageURL
                                }
                            } : {
                                fImageURL: definition.FalseImageURL
                            },
                        // ! If value is false, the false hover will be set.
                        ...dataValue || dataValue === 0  ? {
                            ...(dataValue || dataValue === 0) && extValue ? {
                                fHoverValue: extValue.hoverValue ? extValue.hoverValue : dataValue
                                } : {
                                ...(dataValue || dataValue === 0) && definition.HoverValue ? {
                                    fHoverValue: definition.HoverValue
                                    } : {
                                    fHoverValue: dataValue
                                    }
                                }
                            }: {
                            ...(dataValue === false || dataValue === null || dataValue === '') && definition.DisplayFalse ? {
                                fHoverValue: definition.FalseHoverValue ? definition.FalseHoverValue : ''
                                } : {
                                fHoverValue: ''
                                }
                            },
                        //If False Icon is not entered AND the boolean value is False or text value is empty, then do not display the Avatar
                        // ...((dataValue  || dataValue === 0) && showDefault) || definition.DisplayFalse ? {
                        //     fShowAvatar : true
                        //     } : {
                        //     fShowAvatar : false
                        //     },
                        ...dataValue || dataValue === 0 ? {
                            ...dataValue && extValue ? {
                                fShowAvatar : true
                                } : {
                                fShowAvatar : showDefault
                                }
                            } : {
                            ...(dataValue === false || dataValue === null || dataValue === '') && definition.DisplayFalse ? {
                                fIconName : true
                                } : {
                                fIconName : false
                                }
                            },
                        //If the value is false, the false icon will be set.
                        ...dataValue || dataValue === 0 ? {
                            ...dataValue && extValue ? {
                                fIconName : extValue.iconName
                                } : {
                                fIconName : definition.IconName ? definition.IconName : ''
                                }
                            } : {
                            ...(dataValue === false || dataValue === null || dataValue === '') && definition.DisplayFalse ? {
                                fIconName : definition.FalseIcon ? definition.FalseIcon : ''
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
                                ...dataValue && definition.TextValue ? {
                                    fTextShown : definition.TextValue 
                                    } : {
                                        ...definition.EmptyStaticBehavior === 'Use Icon Only' ? { 
                                        fTextShown : '' 
                                        } : {
                                            fTextShown : typeof(dataValue) === 'boolean' ? '' : String(dataValue).toUpperCase().substring(0,3)
                                        }
                                    }
                                }
                            } : {
                            ...(dataValue === false || dataValue === null || dataValue === '') && definition.DisplayFalse ? {
                                fTextShown : definition.FalseTextValue ? definition.FalseTextValue : ''
                                } : {
                                fTextShown : '' 
                                }
                            }
                    });
                });
            this.results = matchingFields;
            console.log('FieldValue => ', JSON.stringify(this.results));
        } else if (error) {
            console.log('Error!');
            this.errorMessage = JSON.stringify(error);
            this.errorOccurred = true;
        } else {
            console.log('Just Else?!');
        }

    }


}