import { LightningElement, api } from 'lwc';
import hasManagePermission from '@salesforce/customPermission/Manage_Indicator_Key';

export default class Key extends LightningElement {

    _bundle;
    bundleDetails = {};
    indicatorItems = [];

    activeSections = [];
    allSections = [];

    isOpen = false;
    isBundle = false;
    @api isSetup = false;

    @api
    set bundle(value){
        this._bundle = value;
    }
    get bundle(){
        return this._bundle;
    }

    renderedCallback() { 
        if(this.bundle){
            this.initCSSVariables();
        }
    }

    initCSSVariables() {

        if(this.bundle.CardIconBackground || this.bundle.CardIconForeground) {
            var css = this.template.querySelector(".cardIcon").style;

            css.setProperty('--backgroundColor', this.bundle.CardIconBackground);
            css.setProperty('--foregroundColor', this.bundle.CardIconForeground);
        }

    }

    connectedCallback(){
        
        // this.indicatorItems = this.bundle.Items;

        this.bundleDetails = {
            Title: this.bundle.CardTitle,
            Body: this.bundle.CardText,
            Icon: this.bundle.CardIcon,
            Description: this.bundle.BundleDescription,
            BundleId: this.bundle.BundleId,
            IsActive: this.bundle.IsActive,
            ObjectName: this.bundle.ObjectName
        }

        if(this.bundle.BundleId){
            this.isBundle = true;
        }

        if(this.bundle.CardIconBackground || this.bundle.CardIconCoreground ){
            this.bundleDetails.IconClass = 'cardIcon slds-var-m-right_xx-small ';
        } else {
            // ! Was throwing error because it couldn't find this style 'cardIcon' to override... ?
            this.bundleDetails.IconClass = 'cardIcon slds-var-m-right_xx-small ';
        }

        // console.log(JSON.stringify(this.bundleDetails));

        this.bundle.Items.forEach(
            item => 
            {
                let indicators = [];
                let indicatorCount = 0;

                // console.dir(JSON.parse(JSON.stringify(item)));
                if(item.ImageUrl || item.IconName){
                    // Show Normal
                    let fillDesc = '';
                    if(item.TextValue || item.TextValue === 0){
                        fillDesc = 'Static Text';
                    } else if (item.EmptyStaticBehavior === 'Use Field Value'){
                        fillDesc = 'Field Value';
                    } else if (item.EmptyStaticBehavior === 'Use Icon Only'){
                        if(item.ImageUrl && item.IconName) {
                            fillDesc = 'Image/Fallback Icon';
                        } else if(item.ImageUrl){
                            fillDesc = 'Image';
                        } else if(item.IconName){
                            fillDesc = 'Icon';
                        } else {
                            fillDesc = '';
                        }
                    }

                    let normalIcon = {
                        IndicatorId: item.IndicatorId,
                        IconName: item.IconName ? item.IconName : '', 
                        TextValue: item.TextValue ? item.TextValue.toUpperCase().substring(0,3) : '', 
                        ImageUrl: item.ImageUrl ? item.ImageUrl : '', 
                        HoverValue: item.HoverValue ? '\"' + item.HoverValue + '\"' : 'Field Value',
                        Priority: '',
                        ExtensionLogic: item.FieldLabel + ' has a value',
                        FillType: fillDesc,
                        Description: '',
                        Background: item.BackgroundColor,
                        Foreground: item.ForegroundColor,
                        IsActive: item.IsActive
                    };
                    if(item.IsActive){
                        normalIcon.showItem = true;
                    } else {
                        normalIcon.showItem = hasManagePermission;
                    }
                    if(item.EmptyStaticBehavior == 'Use Field Value'){
                        normalIcon.TextValue = '\xa0ABC\r\n\xa0123';
                        normalIcon.Description = 'Displays the field\'s value inside the indicator';
                    }
                    if(item.Extensions){
                        normalIcon.ExtensionLogic += ' and does not meet any display criteria below'
                    }
                    indicators.push(normalIcon);
                    indicatorCount++;
                }

                if(item.FalseImageUrl || item.FalseIcon){
                    // Show Inverse
                    let fillDesc = '';
                    if(item.FalseTextValue || item.FalseTextValue === 0){
                        fillDesc = 'Static Text';
                    } else if(item.FalseImageUrl && item.FalseIcon) {
                        fillDesc = 'Image/Fallback Icon';
                    } else if(item.FalseImageUrl){
                        fillDesc = 'Image';
                    } else if(item.FalseIcon){
                        fillDesc = 'Icon';
                    } else {
                        fillDesc = '';
                    }

                    let inverseIcon = {
                        IndicatorId: item.IndicatorId,
                        IconName: item.FalseIcon ? item.FalseIcon : '', 
                        TextValue: item.FalseTextValue ? item.FalseTextValue.toUpperCase().substring(0,3) : '', 
                        ImageUrl: item.FalseImageUrl ? item.FalseImageUrl : '', 
                        HoverValue: item.FalseHoverValue ? '\"' + item.FalseHoverValue + '\"' : 'Field Value',
                        Priority: '',
                        ExtensionLogic: item.FieldLabel + ' is false or blank',
                        FillType: fillDesc,
                        Description: '',
                        Background: item.InverseBackgroundColor,
                        Foreground: item.InverseForegroundColor,
                        IsActive: item.IsActive
                    };

                    if(item.IsActive){
                        inverseIcon.showItem = true;
                    } else {
                        inverseIcon.showItem = hasManagePermission;
                    }

                    if(item.ZeroBehavior == 'Treat Zeroes as Blanks'){
                        inverseIcon.ExtensionLogic += ' or zero'
                    }
                    indicators.push(inverseIcon);
                    indicatorCount++;
                }

                if(item.Extensions) {

                    let orderedExtensions = [];

                    for(var i = item.Extensions.length - 1; i >= 0; i--){
                        orderedExtensions.push(item.Extensions[i]);
                    }

                    // Show / Iterate Extensions
                    orderedExtensions.forEach(
                        ext => 
                        {
                            let fillDesc = '';
                            if(ext.ExtensionTextValue || ext.ExtensionTextValue === 0){
                                fillDesc = 'Static Text';
                            } else if (item.EmptyStaticBehavior === 'Use Field Value'){
                                fillDesc = 'Field Value';
                            } else if (item.EmptyStaticBehavior === 'Use Icon Only'){
                                if(ext.ExtensionImageUrl && ext.ExtensionIconValue) {
                                    fillDesc = 'Image/Fallback Icon';
                                } else if(ext.ExtensionImageUrl){
                                    fillDesc = 'Image';
                                } else if(ext.ExtensionIconValue){
                                    fillDesc = 'Icon';
                                } else {
                                    fillDesc = '';
                                }
                            }

                            let extensionIcon = {
                                IndicatorId: ext.ExtensionId,
                                IconName: ext.ExtensionIconValue ? ext.ExtensionIconValue : '',
                                TextValue: ext.ExtensionTextValue ? ext.ExtensionTextValue.toUpperCase().substring(0,3) : '',
                                ImageUrl: ext.ExtensionImageUrl ? ext.ExtensionImageUrl : '',
                                HoverValue: ext.ExtensionHoverText ? '\"' + ext.ExtensionHoverText + '\"' : 'Field Value',
                                Priority: ext.PriorityOrder ? ext.PriorityOrder : '',
                                ExtensionLogic: '',
                                FillType: fillDesc,
                                Description: ext.ExtensionDescription,
                                Background: ext.BackgroundColor,
                                Foreground: ext.ForegroundColor,
                                IsActive: ext.IsActive,
                                Operator: ext.TextOperator
                            };

                            if(ext.IsActive){
                                extensionIcon.showItem = true;
                            } else {
                                extensionIcon.showItem = hasManagePermission;
                            }

                            if(ext.ContainsText) {
                                extensionIcon.ExtensionLogic = item.FieldLabel + ' ' + extensionIcon.Operator.toUpperCase() + ' \"' + ext.ContainsText + '\"';
                            } else if (ext.Minimum || ext.Minimum === 0) {
                                let range = item.FieldLabel + ' greater than or equal to ' + ext.Minimum;
                                if(ext.Maximum){
                                   range += ' and less than ' + ext.Maximum;
                                }
                                extensionIcon.ExtensionLogic = range;
                            }

                            indicators.push(extensionIcon);
                            indicatorCount++;
                        }
                    )
                }

                let bundleItem = {
                    FieldApiName: item.FieldApiName,
                    FieldLabel: item.FieldLabel,
                    DisplayFalse: item.DisplayFalse,
                    ZeroValueMode: item.ZeroBehavior ? item.ZeroBehavior : '',
                    DisplayZero: item.ZeroBehavior ? true : false,
                    DisplayMultiple: item.DisplayMultiple,
                    Description: item.IndicatorDescription,
                    IndicatorId: item.IndicatorId,
                    Indicators: indicators,
                    IsActive: item.IsActive
                };
                
                if(item.IsActive){
                    bundleItem.showIndicator = true;
                } else {
                    bundleItem.showIndicator = hasManagePermission;
                }

                if(indicatorCount > 4){
                    bundleItem.DisplayCollapse = true;
                } else {
                    bundleItem.DisplayCollapse = false;
                }

                this.indicatorItems.push(bundleItem);
                this.activeSections.push(item.IndicatorId);
                this.allSections = this.activeSections;
            }
        )

        // console.log(JSON.stringify(this.indicatorItems));
    }

    handleToggleSection(event){
        this.activeSections = event.detail.openSections;
    }

    handleCollapseSection(event) {
        let section = event.target.name;
        this.activeSections = this.activeSections.filter(i => i != section);
    }

    handleClick(event){
        window.open('/lightning/setup/CustomMetadata/page?address=%2F' + event.target.name,'_blank');
    }

    get isManageEnabled() {
        return hasManagePermission;
    }

    @api
    handleState(){
        this.isOpen = !this.isOpen;
        if(this.isOpen){
            this.handleCollapseAll();
        } else {
            this.handleExpandAll();
        }
    }

    handleExpandAll() {
        this.activeSections = this.allSections;
    }

    handleCollapseAll() {
        this.activeSections = [];
    }

}