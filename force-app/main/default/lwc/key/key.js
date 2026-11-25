import { LightningElement, api } from 'lwc';
import hasManagePermission from '@salesforce/customPermission/Manage_Indicator_Key';
import { applyColorVars } from 'c/indicatorCssVars';
import RecipeExportModal from 'c/recipeExportModal';

export default class Key extends LightningElement {

    _bundle;
    bundleDetails = {};
    indicatorItems = [];

    activeSections = [];
    allSections = [];

    isOpen = false;
    isBundle = false;
    @api isSetup = false;
    @api showRefresh = false;
    @api isLoading = false;
    @api suppressedItemIds = [];
    // The Edit Bundle/Edit Indicator buttons build a Setup deep-link from
    // BundleId/IndicatorId. When bundle data comes from a previewed JSON recipe
    // instead of a live wire, those slots hold DeveloperNames, not real record Ids —
    // set this so the Previewer can hide those links rather than send a manage-
    // permission user to a broken/misleading Setup URL.
    @api suppressEditLinks = false;
    // Set by the Previewer: re-exporting a recipe you just loaded as JSON again is a
    // pointless extra decision, so skip the format choice and go straight to CSV.
    @api forceCsvExport = false;

    @api
    set bundle(value){
        this._bundle = value;
        if (value) this._processBundle(value);
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
        applyColorVars(this, '.cardIcon', {
            backgroundColor: this.bundle.CardIconBackground,
            foregroundColor: this.bundle.CardIconForeground
        });
    }

    handleRefresh() {
        this.dispatchEvent(new CustomEvent('refreshkey'));
    }

    async handleExport() {
        await RecipeExportModal.open({
            size: 'medium',
            description: 'Select which items to export, and in what format.',
            bundle: this.bundle,
            forceCsvOnly: this.forceCsvExport
        });
    }

    _processBundle(bundle){

        this.indicatorItems = [];
        this.activeSections = [];
        this.allSections = [];

        this.bundleDetails = {
            Title: bundle.CardTitle,
            Body: bundle.CardText,
            Icon: bundle.CardIcon,
            Description: bundle.BundleDescription,
            BundleId: bundle.BundleId,
            IsActive: bundle.IsActive,
            ObjectName: bundle.ObjectName
        }

        this.isBundle = !!bundle.BundleId;

        if(bundle.CardIconBackground || bundle.CardIconCoreground ){
            this.bundleDetails.IconClass = 'cardIcon slds-var-m-right_xx-small ';
        } else {
            // ! Was throwing error because it couldn't find this style 'cardIcon' to override... ?
            this.bundleDetails.IconClass = 'cardIcon slds-var-m-right_xx-small ';
        }

        // console.log(JSON.stringify(this.bundleDetails));

        bundle.Items.forEach(
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

                    item.Extensions.forEach(
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
        // window.open() is distorted by Lightning Web Security for Setup pages;
        // a real anchor click uses native browser navigation instead. See docs/sdd/0002-window-open.md.
        const link = this.refs.cmdtLink;
        link.href = '/lightning/setup/CustomMetadata/page?address=%2F' + event.target.name;
        link.click();
    }

    get filteredIndicatorItems() {
        if (!this.suppressedItemIds?.length) return this.indicatorItems;
        const suppressed = new Set(this.suppressedItemIds);
        return this.indicatorItems.filter(i => !suppressed.has(i.IndicatorId));
    }

    get isManageEnabled() {
        return hasManagePermission;
    }

    get showEditLinks() {
        return hasManagePermission && !this.suppressEditLinks;
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