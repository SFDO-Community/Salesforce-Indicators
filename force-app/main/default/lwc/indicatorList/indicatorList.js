import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';

export default class IndicatorList extends LightningElement {
@api objectApiName;
@api recordId;
@api indicatorsListTitle = 'Indicators';
@api indicatorsListIcon = 'standard:marketing_actions';
@api indicatorsListHeading = '';
@api indicatorsSize = 'large';
@api indicatorsShape = 'base';
@api
get indicatorsFields() {
    return this._indicatorsFields;
}
set indicatorsFields(value) {
    this._indicatorsFields = value.split(";");
    //Use this value to compare the lengths across all other settings
    this._indicatorsSettingsCount = this._indicatorsFields.length;
}
@api
get indicatorsIcons() {
    return this._indicatorsIcons;
}
set indicatorsIcons(value) {
    this._indicatorsIcons = value.split(";");
}
@api 
get indicatorsTextValues() {
    return this._indicatorsTextValues;
}
set indicatorsTextValues(value) {
    this._indicatorsTextValues = value.split(";");
}
@api
get indicatorsImages() {
    return this._indicatorsImages;
}
set indicatorsImages(value) {
    this._indicatorsImages = value.split(";");
}
@api
get indicatorsHoverTextValues() {
    return this._indicatorsHoverTextValues;
}
set indicatorsHoverTextValues(value) {
    this._indicatorsHoverTextValues = value.split(";");
}

 //Holds the constructed indicators to be rendered.
indicatorsSettings = [];
//Holds the Field Name and Object Name to use in the Wire Service
apiFieldnameDefinitions = [];

//Used to return an error back to the user
errorOccurred = false;
errorMessage = '';
error = '';
indicatorResults = [];


@wire(getRecord, { recordId: '$recordId', optionalFields: '$apiFieldnameDefinitions' })
wiredRecord({data, error}) {
    if (data) {
        console.log('Data => ', JSON.stringify(data));
        let matchingFields = [];
        this.apiFieldnameDefinitions.forEach(definition => {
        matchingFields.push({
            indicatorDisplayFieldName: definition.fieldApiName,
            //This is not needed for the Component display but leaving it here for useful debugging
            indicatorDisplayFieldValue: getFieldValue(data, definition),
            indicatorDisplayTextValue: definition.indicatorConfigurationTextValue,
            indicatorDisplayIconName: definition.indicatorConfigurationIconName,
            indicatorDisplayImageURL: definition.indicatorConfigurationImageURL,
            indicatorDisplayHoverValue: definition.indicatorConfigurationHoverTextValue,
            //If the Field Value is "true" then show the Text Value from the Settings.
            //If the Text Value from Settings is empty the Image will be shown
            //If the Field Value is "false" the Avatar will not be shown 
            ...`${getFieldValue(data, definition)}` === 'true' ? {
                    indicatorDisplayText : definition.indicatorConfigurationTextValue
                } : {
                    indicatorDisplayText : `${getFieldValue(data, definition)}`.toUpperCase().substring(0,3)
                }
            });
        });
        this.indicatorResults = matchingFields;
    } else if (error) {
        this.errorMessage = JSON.stringify(error);
    }
}

connectedCallback() {
    //Check that all the Indicator settings are the same length
    if([this.indicatorsFields, this.indicatorsIcons, this.indicatorsTextValues, this.indicatorsImages, this.indicatorsHoverTextValues].every(this.indicatorsLengthSettingsMatch, this)) {
        //Set up the Settings Fields;
         for(let i = 0; i < this._indicatorsSettingsCount; i++) {
            this.indicatorsSettings.push({
                "indicatorsCount" : this.indicatorsSettings[i],
                "indicatorFieldName" : this.indicatorsFields.shift(),
                "indicatorIconName" : this.indicatorsIcons.shift(),
                "indicatorTextValue" : this.indicatorsTextValues.shift(),
                "indicatorImageURL" : this.indicatorsImages.shift(),
                "indicatorHoverTextValue" : this.indicatorsHoverTextValues.shift()
            });
        }
    }
    else {
        //Set the error for configuration issues
        this.errorOccurred = true;
        this.errorMessage = "Please ensure that when you fill out the fields icons, text, images and hovers that they all have the same number of semicolons.";
    }
    // Map the Settings along with the Fields Names into the one Object
    // TODO: I would like to see if this could all be done in the same setup as above
    this.apiFieldnameDefinitions = (this.indicatorsSettings).map(indicatorsConfigurations => 
       {
        let fieldNameDefinition = {
            fieldApiName: indicatorsConfigurations.indicatorFieldName,
            objectApiName: this.objectApiName,
            indicatorConfigurationTextValue: indicatorsConfigurations.indicatorTextValue,
            indicatorConfigurationIconName: indicatorsConfigurations.indicatorIconName,
            indicatorConfigurationImageURL: indicatorsConfigurations.indicatorImageURL,
            indicatorConfigurationHoverTextValue: indicatorsConfigurations.indicatorHoverTextValue
          };
          return fieldNameDefinition;
       });
}
    //Utility for checking setting lengths
    indicatorsLengthSettingsMatch(setting) {
        return setting.length === this._indicatorsSettingsCount;
    }
}