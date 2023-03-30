import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';
import KeyModal from 'c/indicatorBundleKey';

import getIndicatorConfig from '@salesforce/apex/IndicatorController.getIndicatorBundle';

export default class IndicatorBundle extends LightningElement {

    @api bundleName;    // Value assigned by the property editor
    @api recordId;  // Record Id from the record page
    @api objectApiName; // sObject from the record page
    @api flexipageRegionWidth;  // Width of the container on record page
    @api indsSize = 'large';
    @api indsShape = 'base';
    @api showRefresh = false;
    bundleActive = true;    // Set default active status
    hasHeader = false;      // Hide header by default

    bundle;     // Stores CMDT Bundle, Items, and Extensions wrapper data
    card = {};  // Stores the details about the bundle's card to be displayed

    apiFieldnameDefinitions = [];   //Holds the Field Name and Object Name to use in the Wire Service
    results = [];   // stores the indicator results after performing logic check

    // Used for refreshing Apex
    wiredCmdt;
    wiredData;

    //Used to return an error back to the user
    errorOccurred = false;
    errorMessage = '';
    showIllustration = false;
    illustration = {};

    // Call the Apex Class to return the CMDT Bundle, Items, and Extensions wrapper.
    @wire(getIndicatorConfig, {bundleDevName : '$bundleName'})
    bundleWire (result) {
        this.wiredCmdt = result;
        const { data, error } = result;
        if(data) {
            if(Object.keys(data).length) {  // Used to confirm that values were returned, rather than an empty object
                console.dir(data);   // Retain for debug purposes

                this.bundle = data;
                this.bundleActive = true;
                this.errorOccurred = false;
                this.errorMessage = undefined;

                if(!this.bundle.IsActive){
                    this.showIllustration = true;
                    this.illustration = {
                        heading : 'Uh oh!',
                        messageBody: 'Bundle not found. Check if it\'s active.',
                        imageName: 'error:no_access'
                    }
                } else {
                    // Assign the values to the card
                    this.card = {
                        title : this.bundle.CardTitle,
                        icon: this.bundle.CardIcon,
                        body: this.bundle.CardText
                    }

                    if(this.bundle.CardTitle || this.bundle.CardIcon){
                        this.hasHeader = true;
                    }

                    // console.log(this.bundle.Items.length);

                    if(this.bundle.Items.length === 0){
                        this.showIllustration = true;
                        this.illustration = {
                            heading : 'Bundle has no items!',
                            messageBody: 'Better assign some Indicator Items to this Bundle.',
                            imageName: 'misc:no_content'
                        }
                    }
                    
                    // Loop through the returned CMDT indicator settings and assign the Api Fields which should be queried
                    for( let i = 0; i < this.bundle.Items.length; i++){
                        let apiFieldSyntax = '' + this.objectApiName + '.' + this.bundle.Items[i].FieldApiName;
                        // console.log('fieldSyntax',apiFieldSyntax); // Retain for debug purposes
                        this.apiFieldnameDefinitions = [...this.apiFieldnameDefinitions, apiFieldSyntax];
                    }

                }

         
            } else {
                console.log('No such Bundle');
                this.card = {
                    title : 'Uh Oh!',
                    icon: 'utility:error',
                    body: 'No results were found for the assigned indicator bundle.'
                }
                this.bundleActive = false;
            }
        } else if (error) {
            console.log('Error querying Bundle');
            this.bundle = undefined;
            this.bundleActive = false;
            this.errorOccurred = true;
            this.errorMessage = JSON.stringify(error);
        }
    }

    refreshCmdt(){
        console.log('Refresh');
        refreshApex(this.wiredCmdt);
        refreshApex(this.wiredData);
    }
 
    // Get the field values for the current record based on the configured fields in CMDT
    // Using 'optionalFields' ensures that if a user does not have access to a field, the indicator will not show.
    @wire(getRecord, { recordId: '$recordId', optionalFields: '$apiFieldnameDefinitions' })
    wiredRecord(result) {

        const {error,data} = result;
        this.wiredData = result;
        if (data) {
            console.dir(data);   // Retain for debug purposes
            let matchingFields = [];
            
            // Loop through the configured CMDT indicator items
            this.bundle.Items.forEach(
                item => 
                {
                    // console.dir(item);   // Retain for debug purposes
                                       
                    let dataField = this.objectApiName + "." + item.FieldApiName;
                    // console.log('DataField',dataField);   // Retain for debug purposes
                    
                    // Get the record's field value from the @wire using the current indicator item's field path
                    let dataValue = getFieldValue(data, dataField); 

                    if (item.ZeroBehavior === 'Treat Zeroes as Blanks' && dataValue === 0){
                        dataValue = null;
                    }
                    // console.log('DataValue',dataValue);   // Retain for debug purposes
                    
                    let showDefault = false;
                    if( item.HoverValue || item.TextValue || item.IconName || item.ImageUrl ){
                        showDefault = true;
                    }

                    let assignedHoverValue = item.HoverValue ? item.HoverValue : dataValue;

                    let matchedExtension;

                    // If the record has a value and the CMDT indicator setting has extensions
                    if((dataValue || dataValue === 0) && item.Extensions){
      
                        // Loop through each CMDT indicator setting extension
                        item.Extensions.forEach(
                            extension => 
                            {
                                let match = false;
                                let stringValue = JSON.stringify(dataValue);

                                // If the extension uses a String search, check if there is a match
                                if(extension.ContainsText) {
                                    // console.log('Value',dataValue + ' ' + extension.ContainsText);   // Retain for debug purposes
                                    if(stringValue.includes(extension.ContainsText)){
                                        match = true;
                                    }
                                } 
                                // Else if the extension uses a Minimum boundary
                                else if (extension.Minimum || extension.Minimum === 0 ) {
                                    // console.log('Values',dataValue + ' ' + extension.Minimum + ' ' + extension.Maximum);   // Retain for debug purposes
                                    // Check if there is a Maximum boundry and if the record's value falls within it.
                                    if(extension.Maximum || extension.Maximum === 0) {
                                        if(dataValue >= extension.Minimum && dataValue < extension.Maximum) {
                                            match = true;
                                        }
                                    } 
                                    // Else, check if the record's value is greater than the minimum
                                    else {
                                        if(dataValue >= extension.Minimum) {
                                            match = true;
                                        }
                                    }
                                }

                                // console.log('Match Status', match);   // Retain for debug purposes
                                if(match) {
                                    // If there is a match for an Extension, assign the extension's override values
                                    matchedExtension = {
                                        "IconName" : extension.ExtensionIconValue,
                                        "TextValue" : extension.ExtensionTextValue,
                                        "ImageUrl" : extension.ExtensionImageUrl,
                                        "HoverValue" : extension.ExtensionHoverText,
                                        "Priority" : extension.PriorityOrder
                                    };

                                    console.dir(matchedExtension);
                                }

                            }
                            
                        )
                        
                    }

                    matchingFields.push(
                    {
                        fName: item.FieldApiName,   // Retain for debug purposes
                        fTextValue: dataValue,      // Retain for debug purposes
                        ...dataValue || dataValue === 0  ? {
                                fImageURL: matchedExtension ? matchedExtension.ImageUrl : item.ImageUrl
                            } : {
                                fImageURL: item.DisplayFalse ? item.FalseImageUrl : ''
                            },
                        // ! If value is false, the false hover will be set.
                        ...dataValue || dataValue === 0  ? {
                                fHoverValue: (matchedExtension && matchedExtension.HoverValue) ? matchedExtension.HoverValue : assignedHoverValue
                            } : {
                                fHoverValue: item.DisplayFalse ? item.FalseHoverValue : ''
                            },
                        //If False Icon is not entered AND the boolean value is False or text value is empty, then do not display the Avatar
                        ...dataValue || dataValue === 0 ? {
                                fShowAvatar : matchedExtension ? true : showDefault
                            } : {
                                fShowAvatar: item.DisplayFalse
                            },
                        //If the value is false, the false icon will be set.
                        ...dataValue || dataValue === 0 ? {
                                fIconName : matchedExtension ? matchedExtension.IconName : item.IconName
                            } : {
                                fIconName: item.DisplayFalse ? item.FalseIcon : ''
                            },
                        //If the False Icon and False Text is entered and the Boolean is False or text value is empty, then set the False Text
                        //If the Icon Text is entered then show that
                        //If no Icon Text is entered if the field is a Boolean then show the icon otherwise show the field value    
                        ...dataValue || dataValue === 0 ? {
                            ...matchedExtension ? {
                                    fTextShown: matchedExtension.TextValue
                                } : {
                                ...dataValue && item.TextValue ? {
                                        fTextShown : item.TextValue 
                                    } : {
                                        ...item.EmptyStaticBehavior === 'Use Icon Only' ? { 
                                                fTextShown : '' 
                                            } : {
                                                fTextShown : typeof(dataValue) === 'boolean' ? '' : String(dataValue).toUpperCase().substring(0,3)
                                            }
                                    }
                                }
                            } : {
                            ...(dataValue === false || dataValue === null || dataValue === '') && item.DisplayFalse ? {
                                    fTextShown : item.FalseTextValue ? item.FalseTextValue : ''
                                } : {
                                    fTextShown : '' 
                                }
                            }
                    });
                });
            this.results = matchingFields;
            console.log('FieldValue => ', JSON.stringify(this.results));   // Retain for debug purposes
        } else if (error) {
            console.log('Error!');
            this.errorMessage = JSON.stringify(error);
            this.errorOccurred = true;
        } else {
            console.log('Just Else?!');
        }

    }

    async handleInfoKeyClick() {
        const result = await KeyModal.open({
            // `label` is not included here in this example.
            // it is set on lightning-modal-header instead
            size: 'medium',
            description: 'Accessible description of modal\'s purpose',
            bundleName: this.bundleName,
            bundle: this.bundle,
        });
        // if modal closed with X button, promise returns result = 'undefined'
        // if modal closed with OK button, promise returns result = 'okay'
        console.log(result);
    }

}