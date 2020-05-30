import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';

export default class IndicatorList extends LightningElement {
@api objectApiName;
@api recordId;
@api indsTitle = 'Indicators';
@api indsIcon = 'standard:marketing_actions';
@api indsHeading = '';
@api indsSize = 'large';
@api indsShape = 'base';
@api
get indFields() {
    return this._indFields;
}
set indFields(value) {
    this._indFields = value.split(";");
    //Use this value to compare the lengths across all other settings
    this._indSettingsCount = this._indFields.length;
}
@api
get indIcons() {
    return this._indIcons;
}
set indIcons(value) {
    this._indIcons = value.split(";");
}
@api 
get indTexts() {
    return this._indTexts;
}
set indTexts(value) {
    this._indTexts = value.split(";");
}
@api
get indImages() {
    return this._indImages;
}
set indImages(value) {
    this._indImages = value.split(";");
}
@api
get indHovers() {
    return this._indHovers;
}
set indHovers(value) {
    this._indHovers = value.split(";");
}

 //Holds the constructed indicators to be rendered.
inds = [];
fSettings = [];
//Holds the Field Name and Object Name to use in the Wire Service
apiFieldnameDefinitions = [];

//Used to return an error back to the user
errorOccurred = false;
errorMessage = '';
error = '';
results = [];


@wire(getRecord, { recordId: '$recordId', fields: '$apiFieldnameDefinitions' })
wiredRecord({data, error}) {
    if (data) {
        console.log('Data => ', JSON.stringify(data));
        let matchingFields = [];
        this.apiFieldnameDefinitions.forEach(definition => {
        matchingFields.push({
            fName: definition.fieldApiName,
            //This is not needed for the Component display but leaving it here for useful debugging
            fValue: getFieldValue(data, definition),
            fTextValue: definition.setTextVal,
            fIconName: definition.setIconName,
            fImageURL: definition.setImageURL,
            fHoverValue: definition.setHoverValue,
            //If the Field Value is "true" then show the Text Value from the Settings.
            //If the Text Value from Settings is empty the Image will be shown
            //If the Field Value is "false" the Avatar will not be shown 
            ...`${getFieldValue(data, definition)}` === 'true' ? {
                    fTextShown : definition.setTextVal
                } : {
                    fTextShown : `${getFieldValue(data, definition)}`.toUpperCase().substring(0,3)
                }
            });
        });
        this.results = matchingFields;
    } else if (error) {
        this.errorMessage = JSON.stringify(error);
    }
}

connectedCallback() {
    //Check that all the Indicator settings are the same length
    if([this.indFields, this.indIcons, this.indTexts, this.indImages, this.indHovers].every(this.indLengthSettingsMatch, this)) {
        //Set up the Settings Fields;
         for(let i = 0; i < this._indSettingsCount; i++) {
            this.inds.push({
                "indCount" : this.inds[i],
                "indFieldName" : this.indFields.shift(),
                "iconName" : this.indIcons.shift(),
                "textValue" : this.indTexts.shift(),
                "imageURL" : this.indImages.shift(),
                "hoverValue" : this.indHovers.shift()
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
    this.apiFieldnameDefinitions = (this.inds).map(indSetting => 
       {
        let fieldNameDefinition = {
            fieldApiName: indSetting.indFieldName,
            objectApiName: this.objectApiName,
            setTextVal: indSetting.textValue,
            setIconName: indSetting.iconName,
            setImageURL: indSetting.imageURL,
            setHoverValue: indSetting.hoverValue
          };
          return fieldNameDefinition;
       });
}
    //Utility for checking setting lengths
    indLengthSettingsMatch(setting) {
        return setting.length === this._indSettingsCount;
    }
}