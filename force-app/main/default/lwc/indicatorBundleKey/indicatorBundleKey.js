import { api, wire } from 'lwc';
import LightningModal from 'lightning/modal';

import hasManagePermission from '@salesforce/customPermission/Manage_Indicator_Key';

export default class IndicatorBundleKey extends LightningModal {

    @api bundleName;
    @api bundle;
    bundleDetails = {};
    indicatorItems = [];

    activeSections = [];
    allSections = [];

    isOpen = false;

    connectedCallback(){
        // this.indicatorItems = this.bundle.Items;

        this.bundleDetails = {
            Title: this.bundle.CardTitle,
            Body: this.bundle.CardText,
            Description: this.bundle.BundleDescription,
            BundleId: this.bundle.BundleId
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
                    let normalIcon = {
                        IndicatorId: item.IndicatorId,
                        IconName: item.IconName ? item.IconName : '', 
                        TextValue: item.TextValue ? item.TextValue : '', 
                        ImageUrl: item.ImageUrl ? item.ImageUrl : '', 
                        HoverValue: item.HoverValue ? '\"' + item.HoverValue + '\"' : 'Field Value',
                        Priority: 'Final',
                        ExtensionLogic: '',
                        FillType: item.TextValue ? 'Static Text' : item.EmptyStaticBehavior,
                        Description: 'Displays when the field has a value (and does not meet any display criteria)'
                    };
                    if(item.EmptyStaticBehavior == 'Use Field Value'){
                        normalIcon.TextValue = '...';
                    }
                    indicators.push(normalIcon);
                    indicatorCount++;
                }

                if(item.FalseImageUrl || item.FalseIcon){
                    // Show Inverse
                    let inverseIcon = {
                        IndicatorId: item.IndicatorId,
                        IconName: item.FalseIcon ? item.FalseIcon : '', 
                        TextValue: item.FalseTextValue ? item.FalseTextValue : '', 
                        ImageUrl: item.FalseImageUrl ? item.FalseImageUrl : '', 
                        HoverValue: item.FalseHoverValue ? '\"' + item.FalseHoverValue + '\"' : 'Field\'s Value',
                        Priority: 'First (Inverse)',
                        ExtensionLogic: '',
                        FillType: item.FalseTextValue ? 'Static Text' : 'Icon/Image',
                        Description: 'Displays when the field has no value or is false'
                    };
                    indicators.push(inverseIcon);
                    indicatorCount++;
                }

                if(item.Extensions) {
                    // Show / Iterate Extensions
                    item.Extensions.forEach(
                        ext => 
                        {
                            let extensionIcon = {
                                IndicatorId: ext.ExtensionId,
                                IconName: ext.ExtensionIconValue ? ext.ExtensionIconValue : '',
                                TextValue: ext.ExtensionTextValue ? ext.ExtensionTextValue : '',
                                ImageUrl: ext.ExtensionImageUrl ? ext.ExtensionImageUrl : '',
                                HoverValue: ext.ExtensionHoverText ? '\"' + ext.ExtensionHoverText + '\"' : 'Field Value',
                                Priority: ext.PriorityOrder ? ext.PriorityOrder : 'No Priority',
                                ExtensionLogic: '',
                                FillType: ext.ExtensionTextValue ? 'Static Text' : 'Icon/Image',
                                Description: ext.ExtensionDescription
                            };

                            if(ext.ContainsText) {
                                extensionIcon.ExtensionLogic = item.FieldLabel + ' contains: \"' + ext.ContainsText + '\"';
                            } else if (ext.Minimum) {
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
                    Description: item.IndicatorDescription,
                    IndicatorId: item.IndicatorId,
                    Indicators: indicators
                };

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

    handleOkay() {
        this.close('okay');
    }
}