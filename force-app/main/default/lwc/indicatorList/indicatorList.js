import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';

export default class IndicatorList extends LightningElement {
@api objectApiName;
@api recordId;
@api indsTitle = '';
@api indsIcon = '';
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
@api
get falseIcons() {
    return this._falseIcons;
}
set falseIcons(value) {
    this._falseIcons = value.split(";");
}
@api 
get falseTexts() {
    return this._falseTexts;
}
set falseTexts(value) {
    this._falseTexts = value.split(";");
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
        let dataValue = getFieldValue(data, definition);
        matchingFields.push({
            fName: definition.fieldApiName,
            //This is not needed for the Component display but leaving it here for useful debugging
            fValue: getFieldValue(data, definition),
            fTextValue: dataValue,
            fImageURL: definition.setImageURL,
            fHoverValue: definition.setHoverValue,
            //If the value is false, the false icon will be set. Note: Avatar will not be shown unless False Text is also entered.
            ...dataValue === false ? {
                fIconName : definition.setFalseIcon 
                } : {
                fIconName : definition.setIconName 
                },
            //If the False Text is entered and the Boolean is False, then set the False Text
            //If the Icon Text is entered then show that
            //If no text is entered, then show the field value    
            ...definition.setTextVal != '' || definition.setFalseText != '' ? {
                ...dataValue === true ? {
                    fTextShown : definition.setTextVal 
                    } : {
                    fTextShown : definition.setFalseText 
                    }
                } : {
                ...dataValue === true || dataValue != '' ? {
                    fTextShown : dataValue.toUpperCase().substring(0,3)
                    } : {
                    fTextShown : '' 
                    }
                },
            //If False Text is not entered AND the boolean value is False, then do not display the Avatar
            ...dataValue === true || dataValue != '' || definition.setFalseText != '' ? {
                fShowAvatar : true
                } : {
                fShowAvatar : false
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
    //Check that all the Indicator settings are the same length
    if([this.indFields, this.indIcons, this.indTexts, this.indImages, this.indHovers, this.falseIcons, this.falseTexts].every(this.indLengthSettingsMatch, this)) {
        //Set up the Settings Fields;
         for(let i = 0; i < this._indSettingsCount; i++) {
            this.inds.push({
                "indCount" : this.inds[i],
                "indFieldName" : this.indFields.shift(),
                "iconName" : this.indIcons.shift(),
                "textValue" : this.indTexts.shift(),
                "imageURL" : this.indImages.shift(),
                "hoverValue" : this.indHovers.shift(),
                "falseIcon" : this.falseIcons.shift(),
                "falseText" : this.falseTexts.shift()
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
            setHoverValue: indSetting.hoverValue,
            setFalseIcon: indSetting.falseIcon,
            setFalseText: indSetting.falseText
          };
          return fieldNameDefinition;
       });
       console.log('Definitions => ', JSON.stringify(this.apiFieldnameDefinitions));
}
    //Utility for checking setting lengths
    indLengthSettingsMatch(setting) {
        return setting.length === this._indSettingsCount;
    }
}