public with sharing class IndicatorController {

    public class IndicatorSetting {
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
        public Boolean Active {get; set;}
        @AuraEnabled
        public String EmptyStaticBehavior {get; set;}
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
        public Boolean Active {get; set;}
        
    }
    
    @AuraEnabled(cacheable=true)
    public static List<IndicatorSetting> getIndicatorSettingsForBundle2(Id bundleId){
        
        List<IndicatorSetting> indicators = new List<IndicatorSetting>();
        Map<String,IndicatorSetting> indicatorsBySortOrder = new Map<String,IndicatorSetting>();
        List<String> sortOrderIndicatorKey = new List<String>();
        Map<String,IndicatorExtension> extensionByPriority = new Map<String,IndicatorExtension>();

        for(Indicator_Item__mdt indicatorItem : [
            SELECT Id,
                Field__r.QualifiedApiName, 
                Hover_Text__c,
                Icon_Value__c, 
                Image__c, 
                Inverse_Hover_Text__c, 
                Inverse_Icon_Value__c, 
                Inverse_Image__c, 
                Inverse_Static_Text__c, 
                Show_False_or_Blank__c, 
                sObject__c, 
                Static_Text__c,
                Advanced_Field__c, 
                Empty_Static_Text_Behavior__c, 
                sObject__r.QualifiedApiName,
                (
                    SELECT Id,
                        Contains_Text__c, 
                        Maximum__c, 
                        Minimum__c, 
                        Priority__c,
                        Hover_Text__c,
                        Icon_Value__c,
                        Image__c,
                        Static_Text__c
                    FROM Indicator_Item_Extensions__r 
                    WHERE Active__c = TRUE
                ), 
                (
                    SELECT Order__c 
                    FROM Indicator_Bundle_Items__r
                )
            FROM Indicator_Item__mdt
            WHERE Active__c = TRUE 
            AND Id IN (
                SELECT Indicator_Item__c 
                FROM Indicator_Bundle_Item__mdt 
                WHERE Indicator_Bundle__c = :bundleId
            )
        ]) {
            IndicatorSetting indicatorSetting = new IndicatorSetting();

            if(String.isNotBlank(indicatorItem.Advanced_Field__c)){
                indicatorSetting.FieldApiName = indicatorItem.Advanced_Field__c;
            } 
            else {
                indicatorSetting.FieldApiName = indicatorItem.Field__r.QualifiedApiName;
            }
            
            indicatorSetting.IconName = indicatorItem.Icon_Value__c;
            indicatorSetting.TextValue = indicatorItem.Static_Text__c;
            indicatorSetting.EmptyStaticBehavior = indicatorItem.Empty_Static_Text_Behavior__c;
            indicatorSetting.ImageUrl  = indicatorItem.Image__c;
            indicatorSetting.HoverValue = indicatorItem.Hover_Text__c;
            indicatorSetting.DisplayFalse  = indicatorItem.Show_False_or_Blank__c;
            indicatorSetting.FalseIcon = indicatorItem.Inverse_Icon_Value__c;
            indicatorSetting.FalseTextValue = indicatorItem.Inverse_Static_Text__c;
            indicatorSetting.FalseHoverValue = indicatorItem.Inverse_Hover_Text__c;
            indicatorSetting.FalseImageUrl = indicatorItem.Inverse_Image__c;
            indicatorSetting.SortOrder = indicatorItem.Indicator_Bundle_Items__r[0].Order__c;

            List<IndicatorExtension> extensions = new List<IndicatorExtension>();
            List<String> extensionPrioritySort = new List<String>();

            for(Indicator_Item_Extension__mdt ext : indicatorItem.Indicator_Item_Extensions__r ) {
                IndicatorExtension extension = new IndicatorExtension();
                
                extension.ContainsText = ext.Contains_Text__c;
                extension.Maximum = ext.Maximum__c;
                extension.Minimum = ext.Minimum__c;
                extension.ExtensionHoverText = ext.Hover_Text__c;
                extension.ExtensionIconValue = ext.Icon_Value__c;
                extension.ExtensionImageUrl = ext.Image__c;
                extension.ExtensionTextValue = ext.Static_Text__c;
                extension.PriorityOrder= ext.Priority__c;

                String extensionKey = String.valueOf(extension.PriorityOrder) + '-' + ext.Minimum__c + '-' + ext.Contains_Text__c + '-' + ext.Id;
                extensionPrioritySort.add(extensionKey);
                extensionByPriority.put(extensionKey, extension);

            }

            extensionPrioritySort.sort();

            for(String key : extensionPrioritySort){
                extensions.add(extensionByPriority.get(key));
            }
            indicatorSetting.Extensions = extensions;

            String indicatorKey = indicatorSetting.SortOrder + '-' + indicatorSetting.FieldApiName;
            sortOrderIndicatorKey.add(indicatorKey);

            indicatorsBySortOrder.put(indicatorKey, indicatorSetting);
        }

        sortOrderIndicatorKey.sort();

        for(String key : sortOrderIndicatorKey ){
            indicators.add(indicatorsBySortOrder.get(key));
        }

        return indicators;

    }

    @AuraEnabled
    public static List<Indicator_Item__mdt> getIndicatorSettingsForBundle(Id bundleId){

        return [
            SELECT Field__r.QualifiedApiName, 
                Hover_Text__c,
                Icon_Value__c, 
                Image__c, 
                Inverse_Hover_Text__c, 
                Inverse_Icon_Value__c, 
                Inverse_Image__c, 
                Inverse_Static_Text__c, 
                Show_False_or_Blank__c, 
                sObject__c, 
                Static_Text__c, 
                sObject__r.QualifiedApiName,
                (
                    SELECT Contains_Text__c, 
                        Maximum__c, 
                        Minimum__c, 
                        Priority__c,
                        Hover_Text__c,
                        Icon_Value__c,
                        Image__c,
                        Static_Text__c
                    FROM Indicator_Item_Extensions__r 
                    // ! Why doesn't this work?  For now, it means extensions may be random if more than one is met.
                    // ! Even adding some of these query ORDER BY broke the result entirely.
                    // ? Should this sorting be done on its own and then return the result of an sObject List rather than a SOQL result?
                    // ORDER BY Priority__c, Minimum__c, Maximum__c, Contains_Text__c
                ), 
                (
                    SELECT Order__c 
                    FROM Indicator_Bundle_Items__r
                )
            FROM Indicator_Item__mdt
            WHERE Id IN (
                SELECT Indicator_Item__c 
                FROM Indicator_Bundle_Item__mdt 
                WHERE Indicator_Bundle__c = :bundleId
            )
        ];

    }

}