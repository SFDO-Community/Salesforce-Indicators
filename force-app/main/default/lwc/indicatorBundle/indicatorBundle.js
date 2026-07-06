import { LightningElement, api, wire, track } from 'lwc';
import { getRecord, getFieldValue, notifyRecordUpdateAvailable } from 'lightning/uiRecordApi';
import { NavigationMixin } from 'lightning/navigation';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { refreshApex } from '@salesforce/apex';
import KeyModal from 'c/indicatorBundleKey';
import FlowModal from 'c/flowModal';
import { applyColorVars } from 'c/indicatorCssVars';

import hasManagePermission from '@salesforce/customPermission/Manage_Indicator_Key';
import getIndicatorConfig from '@salesforce/apex/IndicatorController.getIndicatorBundle';

// Pure helpers used by wiredRecord() to resolve one indicator's display values from the
// record's field value, falling back to the item's "false/blank" (inverse) values when there
// isn't one, and to a matched Extension's override values when one applies.
function hasValue(dataValue) {
    return dataValue || dataValue === 0;
}

// Returns true when a value from getFieldValue looks like a Date or DateTime (YYYY-MM-DD[T...]).
// Used to decide whether to do date comparison vs. string comparison for relative-date extensions.
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T|$)/;
function isDateValue(v) { return v != null && ISO_DATE_RE.test(String(v)); }

// Normalises Date ("2026-06-26") and DateTime ("2026-06-26T12:34:56.000Z") to "YYYY-MM-DD"
// for lexicographic comparison against Apex-serialised StartDate/EndDate strings.
function toDateKey(v) { return String(v).substring(0, 10); }

function resolveImage(item, dataValue, matchedExtension) {
    return hasValue(dataValue)
        ? { fImageURL: matchedExtension ? matchedExtension.ImageUrl : item.ImageUrl }
        : { fImageURL: item.DisplayFalse ? item.FalseImageUrl : '' };
}

function resolveHoverValue(item, dataValue, matchedExtension) {
    return hasValue(dataValue)
        ? { fHoverValue: (matchedExtension && matchedExtension.HoverValue) ? matchedExtension.HoverValue : dataValue }
        : { fHoverValue: item.DisplayFalse ? item.FalseHoverValue : '' };
}

function resolveShowAvatar(item, dataValue, matchedExtension, showDefault) {
    return hasValue(dataValue)
        ? { fShowAvatar: matchedExtension ? true : showDefault }
        : { fShowAvatar: item.DisplayFalse };
}

function resolveIconName(item, dataValue, matchedExtension) {
    return hasValue(dataValue)
        ? { fIconName: matchedExtension ? matchedExtension.IconName : item.IconName }
        : { fIconName: item.DisplayFalse ? item.FalseIcon : '' };
}

function resolveIconColors(item, dataValue, matchedExtension) {
    return hasValue(dataValue)
        ? {
            fIconBackground: matchedExtension ? matchedExtension.IconBackground : item.BackgroundColor,
            fIconForeground: matchedExtension ? matchedExtension.IconForeground : item.ForegroundColor
        }
        : {
            fIconBackground: item.DisplayFalse ? item.InverseBackgroundColor : item.BackgroundColor,
            fIconForeground: item.DisplayFalse ? item.InverseForegroundColor : item.ForegroundColor
        };
}

function resolveBadgeStyle(item, dataValue, matchedExtension) {
    return hasValue(dataValue)
        ? {
            fTextColor: matchedExtension ? matchedExtension.BadgeTextColor : item.BadgeTextColor,
            fIconPosition: matchedExtension ? matchedExtension.BadgeIconPosition : item.BadgeIconPosition
        }
        : {
            fTextColor: item.DisplayFalse ? item.FalseBadgeTextColor : item.BadgeTextColor,
            fIconPosition: item.DisplayFalse ? item.FalseBadgeIconPosition : item.BadgeIconPosition
        };
}

// If the False Icon and False Text is entered and the Boolean is False or text value is empty, then set the False Text
// If the Icon Text is entered then show that
// If no Icon Text is entered if the field is a Boolean then show the icon otherwise show the field value
function resolveTextShown(item, dataValue, matchedExtension, indsStyle) {
    const truncate = (text) => (indsStyle === 'avatar' ? text.substring(0, 3) : text);

    if (hasValue(dataValue)) {
        if (matchedExtension) {
            return { fTextShown: matchedExtension.TextValue ? matchedExtension.TextValue.substring(0, 3) : '' };
        }
        if (dataValue && item.TextValue) {
            return { fTextShown: truncate(item.TextValue) };
        }
        if (item.EmptyStaticBehavior === 'Use Icon Only') {
            return { fTextShown: '' };
        }
        if (item.EmptyStaticBehavior === 'Use Field Value') {
            return { fTextShown: truncate(String(dataValue)) };
        }
        return { fTextShown: item.FalseTextValue ? truncate(item.FalseTextValue) : '' };
    }

    if ((dataValue === false || dataValue === null || dataValue === '') && item.DisplayFalse) {
        return { fTextShown: item.FalseTextValue ? truncate(item.FalseTextValue) : '' };
    }
    return { fTextShown: '' };
}

export default class IndicatorBundle extends NavigationMixin(LightningElement) {

    @api bundleName;    // Value assigned by the property editor
    @api recordId;  // Record Id from the record page
    @api objectApiName; // sObject from the record page
    @api flexipageRegionWidth;  // Width of the container on record page
    @api showDescription;
    @api showTitle;
    @api titleStyle = 'Lightning Card';
    @api indsStyle = 'avatar';
    @api indsSize = 'large';
    @api indsShape = 'base';
    @api showRefresh = false;
    @api mappedField = ''; // API Field Name for the record
    @api showFooter = false;

    targetIdField;     // Syntax of template field:  sObject.Field_Name__c
    targetIdValue;
    targetMessage;

    bundleActive = true;    // Set default active status
    hasHeader = false;      // Hide header by default

    bundle;     // Stores CMDT Bundle, Items, and Extensions wrapper data
    itemsById = {};
    card = {};  // Stores the details about the bundle's card to be displayed

    apiFieldnameDefinitions = [];   //Holds the Field Name and Object Name to use in the Wire Service
    results = [];   // stores the indicator results after performing logic check
    suppressedItemIds = [];   // IndicatorIds skipped because the user lacks FLS access to the field

    // Used for refreshing Apex
    wiredCmdt;
    wiredData;

    //Used to return an error back to the user
    errorOccurred = false;
    errorMessage = '';
    showIllustration = false;
    @track illustration = {};

    connectedCallback(){
        if(this.mappedField == null || this.mappedField.trim() == ""){
            this.targetIdValue = this.recordId;
        } else {
            this.targetIdField = this.objectApiName + '.' + this.mappedField;
            // console.log(this.targetIdField);
        }

        if(!this.bundleName){
            this.errorOccurred = true;
            this.showIllustration = true;
            this.illustration = {
                heading : 'LOOK OUT!',
                messageBody: 'Bundle not assigned... select one.',
                imageName: 'misc:no_preview'
            }
        } else {
            this.showIllustration=false;
            // this.illustration = {};
        }
    }

    // Check the record for an existing field value in order to initialize it.
    @wire(getRecord, { recordId: '$recordId', fields: '', optionalFields: '$targetIdField' })
    record ({error, data}) {
        if(error) {
            console.log('ERROR');
            this.errorOccurred = true;
            this.showIllustration = true;
            this.illustration = {
                heading : 'Errors Using the Mapped Field',
                messageBody: 'Check the API Name for the custom field API name: ' + this.mappedField,
                imageName: 'custom:setup'
            }
        } else if (data) {
            if( JSON.stringify(data.fields) === '{}' ) {
                this.errorOccurred = true;
                this.showIllustration = true;
                this.illustration = {
                    heading : 'Problem Using Mapped Field',
                    messageBody: 'Check the case-sensitive API Name for the mapped field API name: ' + this.mappedField,
                    imageName: 'custom:setup'
                };
            } else {
                this.targetMessage = 'This Indicator Bundle displays indicators based on the record id (' + data.fields[this.mappedField].value + ') in the mapped field \"' + this.mappedField + '\" from the ' + data.apiName + ' object.';
                this.targetIdValue = getFieldValue(data, this.targetIdField);
                this.showIllustration=false;
                this.illustration = {};
            }
        }
    }

    renderedCallback() {
        if(this.bundle){
            this.initCSSVariables();
        }
    }

    get isStandardUsage(){
        return this.titleStyle == 'Lightning Card';
    }

    get displayFooter() {
        return this.showFooter && (this.mappedField != null && this.mappedField.trim() != "");
    }

    initCSSVariables() {
        if(this.showTitle && this.isStandardUsage) {
            applyColorVars(this, '.cardIcon', {
                backgroundColor: this.bundle.CardIconBackground,
                foregroundColor: this.bundle.CardIconForeground
            });
        }
    }

    get isManageEnabled() {
        return hasManagePermission;
    }

    // Call the Apex Class to return the CMDT Bundle, Items, and Extensions wrapper.
    @wire(getIndicatorConfig, {bundleDevName : '$bundleName'})
    bundleWire (result) {
        this.wiredCmdt = result;
        const { data, error } = result;
        if(data) {
            // Note: Cmdt.getBundle() (called from IndicatorController.getIndicatorBundle) never
            // returns null - an unknown bundleDevName comes back as a wrapper with IsActive: null
            // instead, so "not found" is handled by the !IsActive branch below.
            this.bundle = data;
            this.bundleActive = true;
            this.errorOccurred = false;
            this.errorMessage = undefined;

            // Rebuilt from scratch below - this wire re-fires on refreshApex() (e.g. the Refresh
            // button), and these would otherwise keep accumulating stale/duplicate entries instead
            // of reflecting only the current bundle's items.
            this.apiFieldnameDefinitions = [];
            this.itemsById = {};

            if(!this.bundle.IsActive){
                this.errorOccurred = true;
                this.bundleActive = false;
                this.showIllustration = true;
                this.illustration = {
                    heading : 'Uh oh!',
                    messageBody: 'Bundle (' + this.bundleName + ') not found. Check if it\'s active.',
                    imageName: 'error:no_access'
                }
            } else {
                // Assign the values to the card
                this.card = {
                    title : this.bundle.CardTitle,
                    icon: this.bundle.CardIcon,
                    body: this.bundle.CardText
                }

                if(this.bundle.CardIconBackground || this.bundle.CardIconForeground ){
                    this.card.iconClass = 'cardIcon slds-media__figure slds-var-m-right_x-small ';
                } else {
                    this.card.iconClass = 'slds-media__figure slds-var-m-right_x-small ';
                }

                if(this.isStandardUsage != true){
                    this.sectionBodyClass = 'slds-grid grid-wrap slds-card__body slds-card__body_inner';
                } else {
                    this.card.iconClass = 'slds-media__figure slds-var-m-right_x-small';
                    this.sectionBodyClass = 'slds-grid grid-wrap slds-card__body';
                }

                // console.log('Card Data');
                // console.dir(JSON.stringify(this.card));

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
                    let item = this.bundle.Items[i];

                    let apiFieldSyntax = '' + this.bundle.ObjectName + '.' + item.FieldApiName;
                    // console.log('fieldSyntax',apiFieldSyntax); // Retain for debug purposes
                    let targetMergeFields = this.targetMergeFields(item);
                    this.apiFieldnameDefinitions = [...this.apiFieldnameDefinitions, apiFieldSyntax, ...targetMergeFields];

                    // Deep-cloned (not just spread) because mergeValuesIntoTarget() below mutates
                    // ActionTarget on this copy in place, and must not corrupt the wired Apex data.
                    this.itemsById[item.IndicatorId] = JSON.parse(JSON.stringify(item));
                    if (targetMergeFields) {  // Add to items to be used when merging the fields with actual values
                        this.itemsById[item.IndicatorId].TargetMergeFields = targetMergeFields;
                    }
                }
            }
        } else if (error) {
            console.log('Error querying Bundle');
            this.bundle = undefined;
            this.bundleActive = false;
            this.errorOccurred = true;
            this.errorMessage = JSON.stringify(error);
        }
    }

    targetMergeFieldRegex = /{.*?}/g;
    
    targetMergeFields(item) {
        const allMatches = new Set();
        (item.ActionTarget?.match(this.targetMergeFieldRegex) ?? []).forEach(m => allMatches.add(m));
        (item.HoverValue?.match(this.targetMergeFieldRegex) ?? []).forEach(m => allMatches.add(m));
        return [...allMatches].map(match => this.bundle.ObjectName + '.' + match.substring(1, match.length - 1));
    }

    refreshCmdt(){
        // console.log('Refresh');
        refreshApex(this.wiredCmdt);
        refreshApex(this.wiredData);
    }

    // Get the field values for the target record based on the configured fields in CMDT
    // Using 'optionalFields' so getRecord doesn't error when a user lacks FLS access to a field.
    // Fields the user can't read return undefined from getFieldValue; those items are skipped below.
    // TODO: Add fields parameter to retrieve the record name for use when the targetIdValue is for another record.
    @wire(getRecord, { recordId: '$targetIdValue', optionalFields: '$apiFieldnameDefinitions' })
    wiredRecord(result) {

        const {error,data} = result;
        this.wiredData = result;
        if (data) {
            // console.dir(data);   // Retain for debug purposes
            let matchingFields = [];
            let suppressedItemIds = [];

            // Loop through the configured CMDT indicator items
            this.bundle.Items.forEach(
                item =>
                {
                    let anyMatch = false;
                    if(item.IsActive){

                        // console.dir(item);   // Retain for debug purposes

                        let dataField = this.bundle.ObjectName + "." + item.FieldApiName;
                        // console.log('DataField',dataField);   // Retain for debug purposes

                        // Get the record's field value from the @wire using the current indicator item's field path
                        let dataValue = getFieldValue(data, dataField);

                        // undefined means the user lacks FLS access to this field — skip it entirely
                        if (dataValue === undefined) {
                            suppressedItemIds.push(item.IndicatorId);
                            return;
                        }

                        if (item.ZeroBehavior === 'Treat Zeroes as Blanks' && dataValue === 0){
                            dataValue = null;
                        }
                        // console.log('DataValue',dataValue);   // Retain for debug purposes

                        let showDefault = false;
                        if( item.HoverValue || item.TextValue || item.IconName || item.ImageUrl ){
                            showDefault = true;
                        }

                        let matchedExtension;

                        // If the record has a value and the CMDT indicator setting has extensions
                        if((dataValue || dataValue === 0) && item.Extensions){

                            // Extensions arrive lowest-priority-first (Priority__c ASC from Apex).
                            // For single-match mode, break on the first hit so priority 1 wins over 5.
                            for (let extIdx = 0; extIdx < item.Extensions.length; extIdx++) {
                                const extension = item.Extensions[extIdx];
                                if(extension.IsActive){

                                    let match = false;

                                    // Date comparison — ContainsText holds a relative date literal
                                    // parsed by Apex into StartDate/EndDate; field value must look like a date.
                                    if (extension.StartDate && isDateValue(dataValue)) {
                                        const fieldKey = toDateKey(dataValue);
                                        const inRange = fieldKey >= extension.StartDate && fieldKey < extension.EndDate;
                                        if (extension.TextOperator === 'Equals') {
                                            match = inRange;
                                        } else if (extension.TextOperator === 'Does Not Equal') {
                                            match = !inRange;
                                        } else if (extension.TextOperator === 'Before Start') {
                                            match = fieldKey < extension.StartDate;
                                        } else if (extension.TextOperator === 'After End') {
                                            match = fieldKey >= extension.EndDate;
                                        } else if (extension.TextOperator === 'Before End') {
                                            match = fieldKey < extension.EndDate;
                                        } else if (extension.TextOperator === 'After Start') {
                                            match = fieldKey >= extension.StartDate;
                                        }
                                    }
                                    // String comparison — ContainsText holds a plain text value to match.
                                    else if(extension.ContainsText) {

                                        let fieldValue = dataValue.toLowerCase();
                                        let compareValue = extension.ContainsText.toLowerCase();

                                        // console.log('Value',dataValue + ' ' + extension.TextOperator + ' ' + compareValue);   // Retain for debug purposes
                                        if(extension.TextOperator === 'Contains'){
                                            match = fieldValue.includes(compareValue);
                                        } else if (extension.TextOperator === 'Does Not Equal') {
                                            match = fieldValue != compareValue;
                                        } else if (extension.TextOperator === 'Equals') {
                                            match = fieldValue === compareValue;
                                        } else if (extension.TextOperator === 'Starts With'){
                                            match = fieldValue.startsWith(compareValue);
                                        } else {
                                            match = fieldValue.includes(compareValue);
                                        }
                                    }
                                    // Numeric range — uses Minimum/Maximum boundaries.
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
                                        // If there is a match for an Extension, assign the extension's override values and these will be used later
                                        matchedExtension = {
                                            "IconName" : extension.ExtensionIconValue,
                                            "TextValue" : extension.ExtensionTextValue,
                                            "ImageUrl" : extension.ExtensionImageUrl,
                                            "HoverValue" : extension.ExtensionHoverText,
                                            "Priority" : extension.PriorityOrder,
                                            "IconBackground" : extension.BackgroundColor,
                                            "IconForeground" : extension.ForegroundColor,
                                            "BadgeTextColor" : extension.BadgeTextColor,
                                            "BadgeIconPosition" : extension.BadgeIconPosition
                                        };

                                        if(item.DisplayMultiple){
                                            // Multiple matching: collect every hit.
                                            anyMatch = true;
                                            matchingFields.push(
                                                {
                                                    fName: item.FieldApiName,
                                                    fTextValue: dataValue,
                                                    fImageURL: matchedExtension.ImageUrl,
                                                    fHoverValue: (matchedExtension && matchedExtension.HoverValue) ? matchedExtension.HoverValue : dataValue,
                                                    fShowAvatar: true,
                                                    fIconName : matchedExtension.IconName,
                                                    fIconBackground : matchedExtension.IconBackground,
                                                    fIconForeground : matchedExtension.IconForeground,
                                                    fTextShown: matchedExtension.TextValue,
                                                    fItemClass: (this.itemsById[item.IndicatorId] && this.itemsById[item.IndicatorId].ActionTarget) ? 'clickable' : '',
                                                    fTextColor: matchedExtension.BadgeTextColor,
                                                    fIconPosition: matchedExtension.BadgeIconPosition
                                                }
                                            );
                                        } else {
                                            break;  // Single-match: priority 1 wins; stop here.
                                        }

                                        // console.dir(matchedExtension);
                                    }
                                }   // End-If extension.IsActive
                            }

                        }

                        // Resolve merge tokens in ActionTarget and HoverValue before building fld
                        // so fPopoverBody can read the already-resolved HoverValue from itemsById.
                        this.mergeValuesIntoTarget(item, data);

                        // If multiple matching is enabled and did not find a single match
                        // or if multiple matching is not enabled
                        // proceed to assign the indicator properties based on Indicator Item values
                        if (anyMatch != true || item.DisplayMultiple != true) {
                            const iid = item.IndicatorId;
                            const ibi = this.itemsById[iid];
                            matchingFields.push(
                            {
                                fName: item.FieldApiName,   // Retain for debug purposes
                                fId: iid,                   // Used to generate resultsById which is used in click handling
                                fTextValue: dataValue,      // Retain for debug purposes
                                ...resolveImage(item, dataValue, matchedExtension),
                                ...resolveHoverValue(item, dataValue, matchedExtension),
                                ...resolveShowAvatar(item, dataValue, matchedExtension, showDefault),
                                ...resolveIconName(item, dataValue, matchedExtension),
                                ...resolveIconColors(item, dataValue, matchedExtension),
                                ...resolveBadgeStyle(item, dataValue, matchedExtension),
                                ...resolveTextShown(item, dataValue, matchedExtension, this.indsStyle),
                                fItemClass: (ibi && ibi.ActionTarget) ? 'clickable' : '',
                                fFieldLabel: item.FieldLabel ?? '',
                                fPopoverBody: matchedExtension ? (matchedExtension.HoverValue || '') : (ibi?.HoverValue || ''),
                                fActionType: item.ActionType ?? '',
                                fActionButtonLabel: item.ActionButtonLabel ?? '',
                                fActionHelpText: item.ActionHelpText ?? '',
                                fActionConfirmRequired: item.ActionConfirmRequired ?? false,
                                fResolvedActionButtonLabel: item.ActionButtonLabel
                                    ? item.ActionButtonLabel
                                    : (item.ActionType === 'Flow Modal' ? 'Launch' : 'Open'),
                                fShowPopover: false,
                            });
                        }
                    }   // End-If item.IsActive
                });
            this.results = matchingFields;
            this.suppressedItemIds = suppressedItemIds;
            // console.log('FieldValue => ', JSON.stringify(this.results));   // Retain for debug purposes
        } else if (error) {
            console.log('Error!');
            this.errorMessage = JSON.stringify(error);
            this.errorOccurred = true;
        }

    }

    mergeValuesIntoTarget(item, data) {
        let itemWithMergeFields = this.itemsById[item.IndicatorId];
        if (itemWithMergeFields.TargetMergeFields) {
            itemWithMergeFields.TargetMergeFields.forEach(mergeField => {
                let dataFieldWithoutObjectName = mergeField.substring(mergeField.indexOf('.') + 1);
                let dataValue = getFieldValue(data, mergeField) ?? '';

                if (itemWithMergeFields.ActionTarget) {
                    itemWithMergeFields.ActionTarget = itemWithMergeFields.ActionTarget.replaceAll('{' + dataFieldWithoutObjectName + '}', dataValue);
                }
                if (itemWithMergeFields.HoverValue) {
                    itemWithMergeFields.HoverValue = itemWithMergeFields.HoverValue.replaceAll('{' + dataFieldWithoutObjectName + '}', dataValue);
                }
            });
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
            showRefresh: this.showRefresh,
            suppressedItemIds: this.suppressedItemIds,
        });
        // if modal closed with X button, promise returns result = 'undefined'
        // if modal closed with OK button, promise returns result = 'okay'
        // console.log(result);
    }

    handleIndicatorClick(event) {
        if (event.target.dataset?.id) {
            let item = this.itemsById[event.target.dataset.id];
            // console.log('Indicator Clicked: ', JSON.stringify(item, null, 4));
            if (item?.ActionConfirmRequired) return;
            if(item.ActionType === 'URL'){
                this.urlAction(item.ActionTarget);
            } else if (item.ActionType === 'Flow Modal'){
                this.openFlowModal(item.ActionTarget);
            }
        }
    }

    handlePopoverEnter(event) {
        const id = event.currentTarget.dataset.id;
        if (!id) return;
        this.results = this.results.map(f =>
            f.fId === id ? { ...f, fShowPopover: !!(f.fPopoverBody || f.fActionType) } : f
        );
    }

    handlePopoverLeave(event) {
        const id = event.currentTarget.dataset.id;
        if (!id) return;
        this.results = this.results.map(f =>
            f.fId === id ? { ...f, fShowPopover: false } : f
        );
    }

    handlePopoverAction(event) {
        const id = event.currentTarget.dataset.id;
        if (!id) return;
        const item = this.itemsById[id];
        if (!item) return;
        if (item.ActionType === 'URL') {
            this.urlAction(item.ActionTarget);
        } else if (item.ActionType === 'Flow Modal') {
            this.openFlowModal(item.ActionTarget);
        }
    }

    lastInterviewId = null; // This is the Flow Interview Id, if it's exited early.

    async openFlowModal(target) {
        // console.log('FLOW API NAME: ', target);
        // console.log('Id: ', this.targetIdValue);
        try {
            const result = await FlowModal.open({
                size: 'large',
                description: 'Indicator Flow Launcher',
                flowApiName: target,
                interviewId: this.lastInterviewId,
                recordId: this.targetIdValue,
                // inputVariables: this.inputVariables, // Hardcoded in FlowModal right now
                modalTitle: 'Indicator Flow Launcher'
            });
            // result may be { status: 'FINISHED'|'PAUSED'|'CLOSED'|..., interviewId }
            if (result) {
                const { status, interviewId } = result;
                if (status === 'PAUSED' && interviewId) {
                    this.lastInterviewId = interviewId;
                } else if (status === 'FINISHED') {
                    this.lastInterviewId = null;
                    await notifyRecordUpdateAvailable([{recordId: this.targetIdValue}]);
                }
            }
        } catch (e) {
            // no-op; LightningModal.open rejects on unexpected errors
        }
    }

    urlAction(target) {
        if (target) {
            // let typeMap = {"Record Page": "standard__recordPage", "Web Page": "standard__webPage"};
            let type   = 'standard__webPage';

            let settings;
            switch(type) {
                case 'standard__webPage':
                    settings = {type: type, attributes: {url: target}};
                    this[NavigationMixin.Navigate](settings);
                    break;
            }
        }

    }

    get showAvatarStyle(){
        return this.indsStyle === 'avatar';
    }

    get showPillStyle(){
        return this.indsStyle === 'pill';
    }

    get showBadgeStyle(){
        return this.indsStyle === 'badge';
    }
    
}
