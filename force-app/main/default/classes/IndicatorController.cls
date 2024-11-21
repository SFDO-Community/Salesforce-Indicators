public with sharing class IndicatorController {

    public class EntityDefList {
        @AuraEnabled
        public List<EntityDef> Entities {get; set;}
    }

    public class EntityDef {
        @AuraEnabled
        public String Name {get; set;}
        @AuraEnabled
        public String Label {get; set;}
        @AuraEnabled
        public String NewUrl {get; set;}
    }

    public class IndicatorBundle {
        @AuraEnabled
        public String ObjectName {get; set;}
        @AuraEnabled
        public Boolean IsActive {get; set;}
        @AuraEnabled
        public String CardIcon {get; set;}
        @AuraEnabled
        public String CardIconBackground {get; set;}
        @AuraEnabled
        public String CardIconForeground {get; set;}
        @AuraEnabled
        public String CardText {get; set;}
        @AuraEnabled
        public String CardTitle {get; set;}
        @AuraEnabled
        public String BundleDescription {get; set;}
        @AuraEnabled
        public String BundleId {get; set;}
        @AuraEnabled
        public List<IndicatorItem> Items {get; set;}
    }

    public class IndicatorItem {
        @AuraEnabled
        public Boolean IsActive {get; set;}
        @AuraEnabled
        public Boolean DisplayMultiple {get; set;}
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
        @AuraEnabled
        public String BackgroundColor {get; set;}
        @AuraEnabled
        public String ForegroundColor {get; set;}
        @AuraEnabled
        public String InverseBackgroundColor {get; set;}
        @AuraEnabled
        public String InverseForegroundColor {get; set;}
        @AuraEnabled
        public String BadgeTextColor {get; set;}
        @AuraEnabled
        public String BadgeIconPosition {get; set;}
        @AuraEnabled
        public String FalseBadgeTextColor {get; set;}
        @AuraEnabled
        public String FalseBadgeIconPosition {get; set;}
    }

    public class IndicatorExtension {
        @AuraEnabled
        public Boolean IsActive {get; set;}
        @AuraEnabled
        public String ContainsText {get; set;}
        @AuraEnabled
        public String TextOperator {get; set;}
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
        @AuraEnabled
        public String BackgroundColor {get; set;}
        @AuraEnabled
        public String ForegroundColor {get; set;}
        @AuraEnabled
        public String BadgeTextColor {get; set;}
        @AuraEnabled
        public String BadgeIconPosition {get; set;}
    }
    
    @AuraEnabled
    public static EntityDefList getNewCmdtUrls(){

        EntityDefList wrapper = new EntityDefList();
        wrapper.Entities = new List<EntityDef>();

        for(EntityDefinition ed : [
            SELECT DeveloperName, Label, MasterLabel, KeyPrefix, DetailUrl, EditUrl, NewUrl 
            FROM EntityDefinition 
            WHERE QualifiedApiName IN (
                'Indicator_Bundle__mdt', 
                'Indicator_Bundle_Item__mdt', 
                'Indicator_Item__mdt', 
                'Indicator_Item_Extension__mdt'
            )
            ORDER BY MasterLabel ASC
        ]){
            EntityDef entity = new EntityDef();
            entity.Name = ed.DeveloperName;
            entity.Label = ed.MasterLabel;
            entity.NewUrl = ed.NewUrl;
            wrapper.Entities.add(entity);
        }
       
        return wrapper;
    }

    @AuraEnabled(cacheable=true)
    public static IndicatorBundle getIndicatorBundle(String bundleDevName){

        IndicatorBundle wrapper = new IndicatorBundle();

        Set<String> durableIds = new Set<String>();
        Map<String,String> fieldByDurableId = new Map<String,String>();
        Map<String,String> labelByDurableId = new Map<String,String>();

        Indicator_Bundle__mdt bundle = Cmdt.getBundle(bundleDevName);

        if (bundleDevName == '-1'){
            wrapper.IsActive = null;
            wrapper.CardIcon = 'action:question_post_action';
            wrapper.CardIconBackground = null;
            wrapper.CardIconForeground = null;
            wrapper.CardText = 'These items are not associated with any bundle.';
            wrapper.CardTitle = 'Unbundled Items';
            wrapper.BundleDescription = null;
            wrapper.BundleId = null;
            wrapper.Items = new List<IndicatorItem>();

            for(Indicator_Item__mdt indicatorItem : Cmdt.getAllOrphanItems()){
                durableIds.add(indicatorItem.Field__c);
            }

            for(EntityParticle particle : [SELECT DurableId, QualifiedApiName, MasterLabel FROM EntityParticle WHERE DurableId = :durableIds]){
                fieldByDurableId.put(particle.DurableId, particle.QualifiedApiName);
                labelByDurableId.put(particle.DurableId, particle.MasterLabel);
            }

            for(Indicator_Item__mdt indicatorItem : Cmdt.getAllOrphanItems()){

                IndicatorItem item = new IndicatorItem();

                if(String.isNotBlank(indicatorItem.Advanced_Field__c)){
                    item.FieldApiName = indicatorItem.Advanced_Field__c;
                    item.FieldLabel = indicatorItem.Advanced_Field_Label__c;
                } else {
                    item.FieldApiName = fieldByDurableId.get(indicatorItem.Field__c);
                    item.FieldLabel = labelByDurableId.get(indicatorItem.Field__c);
                }
    
                item.IsActive = indicatorItem.Active__c;
                item.DisplayMultiple = indicatorItem.Display_Multiple__c;
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
                item.BackgroundColor = indicatorItem.Icon_Background__c;
                item.ForegroundColor = indicatorItem.Icon_Foreground__c;
                item.InverseBackgroundColor = indicatorItem.Inverse_Icon_Background__c;
                item.InverseForegroundColor = indicatorItem.Inverse_Icon_Foreground__c;
                item.BadgeTextColor = indicatorItem.Badge_Text_Color__c;
                item.BadgeIconPosition = indicatorItem.Badge_Icon_Position__c;
                item.FalseBadgeTextColor = indicatorItem.Inverse_Badge_Text_Color__c;
                item.FalseBadgeIconPosition = indicatorItem.Inverse_Badge_Icon_Position__c;
                
                List<Indicator_Item_Extension__mdt> itemExtensions = Cmdt.getExtensionsForItem(indicatorItem.DeveloperName);

                if(!itemExtensions.isEmpty()){
                    item.Extensions = new List<IndicatorExtension>();    

                    for(Indicator_Item_Extension__mdt itemExtension : itemExtensions){
                        IndicatorExtension extension = new IndicatorExtension();
        
                        extension.IsActive = itemExtension.Active__c;
                        extension.ContainsText = itemExtension.Contains_Text__c;
                        extension.TextOperator = String.isNotBlank(itemExtension.Text_Operator__c) ? itemExtension.Text_Operator__c : 'Contains';
                        extension.Maximum = itemExtension.Maximum__c;
                        extension.Minimum = itemExtension.Minimum__c;
                        extension.ExtensionHoverText = itemExtension.Hover_Text__c;
                        extension.ExtensionIconValue = itemExtension.Icon_Value__c;
                        extension.ExtensionImageUrl = itemExtension.Image__c;
                        extension.ExtensionTextValue = itemExtension.Static_Text__c;
                        extension.PriorityOrder = itemExtension.Priority__c;
                        extension.ExtensionDescription = itemExtension.Description__c;
                        extension.ExtensionId = itemExtension.Id;
                        extension.BackgroundColor = itemExtension.Icon_Background__c;
                        extension.ForegroundColor = itemExtension.Icon_Foreground__c;
                        extension.BadgeTextColor = itemExtension.Badge_Text_Color__c;
                        extension.BadgeIconPosition = itemExtension.Badge_Icon_Position__c;
                        item.Extensions.add(extension);
                    }

                }

                wrapper.Items.add(item);
            }

        } else if(bundle != null){
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
            wrapper.CardIconBackground = bundle.Card_Icon_Background__c;
            wrapper.CardIconForeground = bundle.Card_Icon_Foreground__c;
            wrapper.CardText = bundle.Card_Text__c;
            wrapper.CardTitle = bundle.Card_Title__c;
            wrapper.BundleDescription = bundle.Description__c;
            wrapper.BundleId = bundle.Id;
            wrapper.ObjectName = bundle.sObject__r.Label;
            if(bundle.sObject__r.Label != bundle.sObject__r.QualifiedApiName){
                wrapper.ObjectName += ' (' + bundle.sObject__r.QualifiedApiName + ')';
            }
            wrapper.Items = new List<IndicatorItem>();

            if(!bundleItems.isEmpty()){     // TODO: Commenting out this check is a great way to test throwing an error in the LWC
                for(Indicator_Bundle_Item__mdt bundleItem : Cmdt.getBundleItems(bundleDevName)){
                    
                    IndicatorItem item = new IndicatorItem();

                    item.SortOrder = bundleItem.Order__c;
    
                    Indicator_Item__mdt indicatorItem = Cmdt.getItem(bundleItem.Indicator_Item__r.DeveloperName);
                    if(indicatorItem != null){

                        if(String.isNotBlank(indicatorItem.Advanced_Field__c)){
                            item.FieldApiName = indicatorItem.Advanced_Field__c;
                            item.FieldLabel = indicatorItem.Advanced_Field_Label__c;
                        } else {
                            item.FieldApiName = fieldByDurableId.get(indicatorItem.Field__c);
                            item.FieldLabel = labelByDurableId.get(indicatorItem.Field__c);
                        }
            
                        item.IsActive = indicatorItem.Active__c;
                        item.DisplayMultiple = indicatorItem.Display_Multiple__c;
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
                        item.BackgroundColor = indicatorItem.Icon_Background__c;
                        item.ForegroundColor = indicatorItem.Icon_Foreground__c;
                        item.InverseBackgroundColor = indicatorItem.Inverse_Icon_Background__c;
                        item.InverseForegroundColor = indicatorItem.Inverse_Icon_Foreground__c;
                        item.BadgeTextColor = indicatorItem.Badge_Text_Color__c;
                        item.BadgeIconPosition = indicatorItem.Badge_Icon_Position__c;
                        item.FalseBadgeTextColor = indicatorItem.Inverse_Badge_Text_Color__c;
                        item.FalseBadgeIconPosition = indicatorItem.Inverse_Badge_Icon_Position__c;
                        
                        List<Indicator_Item_Extension__mdt> itemExtensions = Cmdt.getExtensionsForItem(indicatorItem.DeveloperName);

                        if(!itemExtensions.isEmpty()){
                            item.Extensions = new List<IndicatorExtension>();    

                            for(Indicator_Item_Extension__mdt itemExtension : itemExtensions){
                                IndicatorExtension extension = new IndicatorExtension();
                
                                extension.IsActive = itemExtension.Active__c;
                                extension.ContainsText = itemExtension.Contains_Text__c;
                                extension.TextOperator = String.isNotBlank(itemExtension.Text_Operator__c) ? itemExtension.Text_Operator__c : 'Contains';
                                extension.Maximum = itemExtension.Maximum__c;
                                extension.Minimum = itemExtension.Minimum__c;
                                extension.ExtensionHoverText = itemExtension.Hover_Text__c;
                                extension.ExtensionIconValue = itemExtension.Icon_Value__c;
                                extension.ExtensionImageUrl = itemExtension.Image__c;
                                extension.ExtensionTextValue = itemExtension.Static_Text__c;
                                extension.PriorityOrder = itemExtension.Priority__c;
                                extension.ExtensionDescription = itemExtension.Description__c;
                                extension.ExtensionId = itemExtension.Id;
                                extension.BackgroundColor = itemExtension.Icon_Background__c;
                                extension.ForegroundColor = itemExtension.Icon_Foreground__c;
                                extension.BadgeTextColor = itemExtension.Badge_Text_Color__c;
                                extension.BadgeIconPosition = itemExtension.Badge_Icon_Position__c;
                
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