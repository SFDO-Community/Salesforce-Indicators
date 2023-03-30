import { api, wire } from 'lwc';
import LightningModal from 'lightning/modal';

export default class IndicatorBundleKey extends LightningModal {

    @api bundleName;
    @api bundle;
    bundleDetails = {};
    indicatorItems = [];

    connectedCallback(){
        // this.indicatorItems = this.bundle.Items;

        this.bundleDetails = {
            Title: this.bundle.CardTitle,
            Body: this.bundle.CardText,
            Description: 'Bundle Description Placeholder' // this.bundle.Description
        }

        console.log(JSON.stringify(this.bundleDetails));

        this.bundle.Items.forEach(
            item => 
            {
                let indicators = [];

                // console.dir(JSON.parse(JSON.stringify(item)));
                if(item.ImageUrl || item.IconName){
                    // Show Normal
                    let normalIcon = {
                        IconName: item.IconName ? item.IconName : '', 
                        TextValue: item.TextValue ? item.TextValue : '', 
                        ImageUrl: item.ImageUrl ? item.ImageUrl : '', 
                        HoverValue: item.HoverValue ? '\"' + item.HoverValue + '\"' : 'Field Value',
                        Priority: 'Final',
                        ExtensionLogic: '',
                        FillType: item.TextValue ? 'Static Text' : item.EmptyStaticBehavior,
                        Description: 'Displays when the field has a value (and does not meet match extensions)'
                    };
                    if(item.EmptyStaticBehavior == 'Use Field Value'){
                        normalIcon.TextValue = '...';
                    }
                    indicators.push(normalIcon);
                }

                if(item.FalseImageUrl || item.FalseIcon){
                    // Show Inverse
                    let inverseIcon = {
                        IconName: item.FalseIcon ? item.FalseIcon : '', 
                        TextValue: item.FalseTextValue ? item.FalseTextValue : '', 
                        ImageUrl: item.FalseImageUrl ? item.FalseImageUrl : '', 
                        HoverValue: item.FalseHoverValue ? '\"' + item.FalseHoverValue + '\"' : 'Field Value',
                        Priority: 'First (Inverse)',
                        ExtensionLogic: '',
                        FillType: item.FalseTextValue ? 'Static Text' : 'Icon/Image',
                        Description: 'Displays when the field has no value or is false'
                    };
                    indicators.push(inverseIcon);
                }

                if(item.Extensions) {
                    // Show / Iterate Extensions
                    item.Extensions.forEach(
                        ext => 
                        {
                            let extensionIcon = {
                                IconName: ext.ExtensionIconValue ? ext.ExtensionIconValue : '',
                                TextValue: ext.ExtensionTextValue ? ext.ExtensionTextValue : '',
                                ImageUrl: ext.ExtensionImageUrl ? ext.ExtensionImageUrl : '',
                                HoverValue: ext.ExtensionHoverText ? '\"' + ext.ExtensionHoverText + '\"' : 'Field Value',
                                Priority: ext.PriorityOrder ? ext.PriorityOrder : 'No Priority',
                                ExtensionLogic: '',
                                FillType: ext.ExtensionTextValue ? 'Static Text' : 'Icon/Image',
                                Description: 'Extension Description Placeholder' // ext.ExtensionDescription
                            };

                            if(ext.ContainsText) {
                                extensionIcon.ExtensionLogic = 'Field value contains text: \"' + ext.ContainsText + '\"';
                            } else if (ext.Minimum) {
                                let range;
                                if(ext.Maximum){
                                   range = ext.Minimum+ ' <= Field value < ' + ext.Maximum;
                                } else {
                                   range = 'Field value >= ' + ext.Minimum
                                }
                                extensionIcon.ExtensionLogic = range;
                            }

                            indicators.push(extensionIcon);
                        }
                    )
                }

                let bundleItem = {
                    FieldApiName: item.FieldApiName,
                    DisplayFalse: item.DisplayFalse,
                    ZeroValueMode: item.ZeroBehavior ? item.ZeroBehavior : 'N/A',
                    Description: 'Bundle Description Placeholder', //item.Description,
                    Indicators: indicators
                };

                this.indicatorItems.push(bundleItem);
            }
        )

        console.log(JSON.stringify(this.indicatorItems));
    }
    

    handleOkay() {
        this.close('okay');
    }
}
