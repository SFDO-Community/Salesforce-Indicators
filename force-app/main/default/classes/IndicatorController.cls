public with sharing class IndicatorController {

    public class IndicatorBundle {
        @AuraEnabled
        public Boolean IsActive {get; set;}
        @AuraEnabled
        public String CardIcon {get; set;}
        @AuraEnabled
        public String CardText {get; set;}
        @AuraEnabled
        public String CardTitle {get; set;}
        @AuraEnabled
        public String BundleDescription {get; set;}
        @AuraEnabled
        public String BundleId {get; set;}
        // @AuraEnabled
        // public String BackgroundColor {get; set;}
        // @AuraEnabled
        // public String ForegroundColor {get; set;}
        @AuraEnabled
        public List<IndicatorItem> Items {get; set;}
    }

    public class IndicatorItem {
        @AuraEnabled 
        public String FieldLabel { get; set;}
        @AuraEnabled 
        public String FieldApiName { get; set;}
        @AuraEnabled
        public String IconName {get; set;}
        @AuraEnabled
        public String TextValue {get; set;}
        @AuraEnabled
        public String ImageUrl {get; set;}
        @AuraEnabled
        public String HoverValue {get; set;}
        @AuraEnabled
        public Boolean DisplayFalse {get; set;}
        @AuraEnabled
        public String FalseIcon {get; set;}
        @AuraEnabled
        public String FalseTextValue {get; set;}
        @AuraEnabled
        public String FalseHoverValue {get; set;}
        @AuraEnabled
        public String FalseImageUrl {get; set;}
        @AuraEnabled
        public List<IndicatorExtension> Extensions {get; set;}
        @AuraEnabled
        public Decimal SortOrder {get; set;}
        @AuraEnabled
        public String EmptyStaticBehavior {get; set;}
        @AuraEnabled
        public String ZeroBehavior {get; set;}
        @AuraEnabled
        public String IndicatorDescription {get; set;}
        @AuraEnabled
        public String IndicatorId {get; set;}
        // @AuraEnabled
        // public String BackgroundColor {get; set;}
        // @AuraEnabled
        // public String ForegroundColor {get; set;}
        // @AuraEnabled
        // public String InverseBackgroundColor {get; set;}
        // @AuraEnabled
        // public String InverseForegroundColor {get; set;}
    }

    public class IndicatorExtension {
        @AuraEnabled
        public String ContainsText {get; set;}
        @AuraEnabled
        public Decimal Maximum {get; set;}
        @AuraEnabled
        public Decimal Minimum {get; set;}
        @AuraEnabled
        public String ExtensionHoverText {get; set;}
        @AuraEnabled
        public String ExtensionIconValue {get; set;}
        @AuraEnabled
        public String ExtensionImageUrl {get; set;}
        @AuraEnabled
        public String ExtensionTextValue {get; set;}
        @AuraEnabled
        public Decimal PriorityOrder {get; set;}
        @AuraEnabled
        public String ExtensionDescription {get; set;}
        @AuraEnabled
        public String ExtensionId {get; set;}
        // @AuraEnabled
        // public String BackgroundColor {get; set;}
        // @AuraEnabled
        // public String ForegroundColor {get; set;}
    }
    
    @AuraEnabled(cacheable=true)
    public static IndicatorBundle getIndicatorBundle(String bundleDevName){

        IndicatorBundle wrapper = new IndicatorBundle();

        Set<String> durableIds = new Set<String>();
        Map<String,String> fieldByDurableId = new Map<String,String>();
        Map<String,String> labelByDurableId = new Map<String,String>();

        Indicator_Bundle__mdt bundle = Cmdt.getBundle(bundleDevName);
        if(bundle != null){

            List<Indicator_Bundle_Item__mdt> bundleItems = Cmdt.getBundleItems(bundleDevName);

            if(!bundleItems.isEmpty()){
                for(Indicator_Bundle_Item__mdt bundleItem : Cmdt.getBundleItems(bundleDevName)){
                    Indicator_Item__mdt indicatorItem = Cmdt.getItem(bundleItem.Indicator_Item__r.DeveloperName);
                    if(indicatorItem != null){
                        durableIds.add(indicatorItem.Field__c);
                    }
                }
            }

            for(EntityParticle particle : [SELECT DurableId, QualifiedApiName, MasterLabel FROM EntityParticle WHERE DurableId = :durableIds]){
                fieldByDurableId.put(particle.DurableId, particle.QualifiedApiName);
                labelByDurableId.put(particle.DurableId, particle.MasterLabel);
            }

            wrapper.IsActive = bundle.Active__c;
            wrapper.CardIcon = bundle.Card_Icon__c;
            wrapper.CardText = bundle.Card_Text__c;
            wrapper.CardTitle = bundle.Card_Title__c;
            wrapper.BundleDescription = bundle.Description__c;
            wrapper.BundleId = bundle.Id;
            // wrapper.BackgroundColor = bundle.Card_Icon_Background__c;
            // wrapper.ForegroundColor = bundle.Card_Icon_Foreground__c;
            wrapper.Items = new List<IndicatorItem>();

            if(!bundleItems.isEmpty()){     // TODO: Commenting out this check is a great way to test throwing an error in the LWC
                for(Indicator_Bundle_Item__mdt bundleItem : Cmdt.getBundleItems(bundleDevName)){
                    
                    IndicatorItem item = new IndicatorItem();

                    item.SortOrder = bundleItem.Order__c;
    
                    Indicator_Item__mdt indicatorItem = Cmdt.getItem(bundleItem.Indicator_Item__r.DeveloperName);
                    if(indicatorItem != null){

                        if(String.isNotBlank(indicatorItem.Advanced_Field__c)){
                            item.FieldApiName = indicatorItem.Advanced_Field__c;
                            item.FieldLabel = 'Related Field';
                        } else {
                            item.FieldApiName = fieldByDurableId.get(indicatorItem.Field__c);
                            item.FieldLabel = labelByDurableId.get(indicatorItem.Field__c);
                        }
            
                        item.IconName = indicatorItem.Icon_Value__c;
                        item.TextValue = indicatorItem.Static_Text__c;
                        item.EmptyStaticBehavior = indicatorItem.Empty_Static_Text_Behavior__c;
                        item.ZeroBehavior = indicatorItem.Zero_Behavior__c;
                        item.ImageUrl  = indicatorItem.Image__c;
                        item.HoverValue = indicatorItem.Hover_Text__c;
                        item.DisplayFalse  = indicatorItem.Show_False_or_Blank__c;
                        item.FalseIcon = indicatorItem.Inverse_Icon_Value__c;
                        item.FalseTextValue = indicatorItem.Inverse_Static_Text__c;
                        item.FalseHoverValue = indicatorItem.Inverse_Hover_Text__c;
                        item.FalseImageUrl = indicatorItem.Inverse_Image__c;
                        item.IndicatorDescription = indicatorItem.Description__c;
                        item.IndicatorId = indicatorItem.Id;
                        // item.BackgroundColor = indicatorItem.Background_Color__c;
                        // item.ForegroundColor = indicatorItem.Foreground_Color__c;
                        // item.InverseBackgroundColor = indicatorItem.Inverse_Background_Color__c;
                        // item.InverseForegroundColor = indicatorItem.Inverse_Foreground_Color__c;
                        
                        List<Indicator_Item_Extension__mdt> itemExtensions = Cmdt.getExtensionsForItem(indicatorItem.DeveloperName);

                        if(!itemExtensions.isEmpty()){
                            item.Extensions = new List<IndicatorExtension>();    

                            for(Indicator_Item_Extension__mdt itemExtension : itemExtensions){
                                IndicatorExtension extension = new IndicatorExtension();
                
                                extension.ContainsText = itemExtension.Contains_Text__c;
                                extension.Maximum = itemExtension.Maximum__c;
                                extension.Minimum = itemExtension.Minimum__c;
                                extension.ExtensionHoverText = itemExtension.Hover_Text__c;
                                extension.ExtensionIconValue = itemExtension.Icon_Value__c;
                                extension.ExtensionImageUrl = itemExtension.Image__c;
                                extension.ExtensionTextValue = itemExtension.Static_Text__c;
                                extension.PriorityOrder = itemExtension.Priority__c;
                                extension.ExtensionDescription = itemExtension.Description__c;
                                extension.ExtensionId = itemExtension.Id;
                                // extension.BackgroundColor = itemExtension.Background_Color__c;
                                // extension.ForegroundColor = itemExtension.Foreground_Color__c;
                
                                item.Extensions.add(extension);
                            }

                        }
                    }
                    wrapper.Items.add(item);
                }
            }
        }
        return wrapper;
    }

}