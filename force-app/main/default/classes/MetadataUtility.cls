/**
 * Created by robertwright on 10/30/23.
 */

public with sharing class MetadataUtility {

    /**Static Params**/
    private static final String Label_Field = 'Label';
    private static final String QualifiedApiName_Field = 'QualifiedApiName';
    private static final Set<DescribeFieldResult> entityRelationshipFields = new Set<DescribeFieldResult>{
            Indicator_Bundle__mdt.sObject__c.getDescribe(),
            Indicator_Item__mdt.Field__c.getDescribe(),
            Indicator_Item__mdt.sObject__c.getDescribe()
    };

    private static Metadata.DeployContainer deployContainer;
    private static DescribeSObjectResult describeSObjectResult;
    private static Map<String,Object> populatedFieldsMap;

    /**Wrappers**/
    public class deploymentWrapper {
        @AuraEnabled public Indicator_Bundle__mdt indicatorBundle;
        @AuraEnabled public List<Indicator_Bundle_Item__mdt> indicatorBundleItems;
        @AuraEnabled public Indicator_Item__mdt indicatorItem;
        @AuraEnabled public List<Indicator_Item_Extension__mdt> indicatorItemExtensions;

        public deploymentWrapper() {}
    }

    /**Controller Methods**/
    @AuraEnabled
    public static Id deployIndicatorBundles(String wrapper) {
        System.debug(wrapper);

        deploymentWrapper parsedWrapper = (MetadataUtility.deploymentWrapper) JSON.deserialize(wrapper,MetadataUtility.deploymentWrapper.class);

        System.debug(parsedWrapper);

        return deployWrapperMetadata(parsedWrapper);
    }

    /**Metadata Methods**/
    private static Id deployWrapperMetadata(deploymentWrapper wrapper) {
        System.debug(wrapper);
        deployContainer = new Metadata.DeployContainer(); // Build New Deployment Container
        if(wrapper.indicatorBundle != null) processMetadataRecords(new List<Indicator_Bundle__mdt>{wrapper.indicatorBundle},Indicator_Bundle__mdt.getSObjectType());
        if(wrapper.indicatorItem != null) processMetadataRecords(new List<Indicator_Item__mdt>{wrapper.indicatorItem},Indicator_Item__mdt.getSObjectType());
        if(wrapper.indicatorItemExtensions != null && !wrapper.indicatorItemExtensions.isEmpty()) processMetadataRecords(wrapper.indicatorItemExtensions,Indicator_Item_Extension__mdt.getSObjectType());
        if(wrapper.indicatorBundleItems != null && !wrapper.indicatorBundleItems.isEmpty()) processMetadataRecords(wrapper.indicatorBundleItems,Indicator_Bundle_Item__mdt.getSObjectType());
        Id deployId = MetadataDeploy.upsertMetaData(deployContainer); // Deploy Deploy Container
        return deployId;
    }

    private static void processMetadataRecords(List<SObject> records,SObjectType sObjectType) {
        System.debug(records);
        describeSObjectResult = sObjectType.getDescribe();
        for(SObject record : records) buildMetaData(record.getPopulatedFieldsAsMap()); // Build Metadata Maps and Add to Deploy Container
    }

    private static void buildMetaData(Map<String,Object> metadataFieldValueMap) {
        populatedFieldsMap = metadataFieldValueMap;
        if(populatedFieldsMap == null) populatedFieldsMap = new Map<String, Object>();

        String sObjectName = describeSObjectResult.getName();
        String QualifiedApiName = (String) populatedFieldsMap.get(QualifiedApiName_Field);
        String fullName = mergeFullName(sObjectName,QualifiedApiName);
        String label = (String) populatedFieldsMap.get(Label_Field);

        if(String.isBlank(label)) label = 'Unnamed Metadata';

        System.debug(fullName+' '+label);

        Metadata.CustomMetadata customMetadata = buildCustomMetadata(fullName,label);
        deployContainer.addMetadata(customMetadata);
    }

    private static String mergeFullName(String metadataName, String QualifiedApiName) {
        String DeveloperName = (QualifiedApiName.length() > 40) ? QualifiedApiName.substring(0,40) : QualifiedApiName;
        return metadataName.replace('__mdt','')+'.'+DeveloperName;
    }

    private static Metadata.CustomMetadata buildCustomMetadata(String fullName, String recordLabel) {
        Metadata.CustomMetadata customMetadata = new Metadata.CustomMetadata();
        customMetadata.fullName = fullName;
        customMetadata.label = (recordLabel.length() > 40) ? recordLabel.substring(0,40) : recordLabel;

        Map<String,Schema.SObjectField> describeFieldMap = describeSObjectResult.fields.getMap();

        for(String fieldName : populatedFieldsMap.keySet()) processCustomMetadataFieldValues(customMetadata,describeFieldMap.get(fieldName));

        return customMetadata;
    }

    private static void processCustomMetadataFieldValues(Metadata.CustomMetadata customMetadata,Schema.SObjectField sObjectField) {

        if(sObjectField == null) return; /**Return if sObjectField not found**/
        DescribeFieldResult fieldResult = sObjectField.getDescribe();
        if(!fieldResult.isCustom()) return; /**Return If Standard Field**/

        String fieldName = fieldResult.getName();
        Boolean isReference = fieldResult.getType() === DisplayType.REFERENCE;
        Boolean isEntityRelationshipField = entityRelationshipFields.contains(fieldResult);

        Object value = null;

        /*if(isReference || isEntityRelationshipField) {
            SObject relatedRecord;
            Map<String,Object> relatedRecordPopulatedFieldMap;
            String relationshipName = (isEntityRelationshipField) ? fieldName.removeEnd('__c')+'__r' : fieldResult.getRelationshipName(); *//**We replace __c with __r to resolve Entity Relationship non reference**//*
            if(populatedFieldsMap.containsKey(relationshipName)) {
                try{
                    relatedRecord = (SObject) populatedFieldsMap.get(relationshipName);
                    relatedRecordPopulatedFieldMap = relatedRecord.getPopulatedFieldsAsMap();
                } catch(Exception ex) {
                    System.debug(ex.getMessage());
                }
            }
            if(relatedRecordPopulatedFieldMap != null && relatedRecordPopulatedFieldMap.containsKey(QualifiedApiName_Field)) value = (String) relatedRecordPopulatedFieldMap.get(QualifiedApiName_Field);

        } else if(populatedFieldsMap.containsKey(fieldName)) value = populatedFieldsMap.get(fieldName);*/

        value = populatedFieldsMap.get(fieldName);
        if(value == null || value == '' && fieldResult.defaultValue != null) value = fieldResult.defaultValue;
        else if(value == null || value == '' && fieldResult.defaultValueFormula != null) value = fieldResult.defaultValueFormula.removeEnd('\'').removeEnd('"').removeStart('\'').removeStart('"');

        Metadata.CustomMetadataValue metadataField = new Metadata.CustomMetadataValue();
        metadataField.field = fieldName;
        metadataField.value = value;


        System.debug(fieldName+' : '+value);

        customMetadata.values.add(metadataField);
    }


    private static Set<String> getCustomFields(SObjectType SObjectType) {
        Set<String> returnSet = new Set<String>();
        if(SObjectType == null) return returnSet; /**Error No Matching Object**/
        Schema.DescribeSObjectResult objResult = SObjectType.getDescribe();
        for(SObjectField objectField : objResult.fields.getMap().values()) {
            DescribeFieldResult fieldResult = objectField.getDescribe();
            if(fieldResult.isCustom()) returnSet.add(fieldResult.getName());
        }
        return returnSet;
    }

    private static final SObjectField indicatorBundleItem_Field_Order = Indicator_Bundle_Item__mdt.Order__c;
    private static final SObjectField indicatorBundleItem_Field_Item = Indicator_Bundle_Item__mdt.Indicator_Item__c;
    private static final SObjectField indicatorItemExtension_Field_Item = Indicator_Item_Extension__mdt.Indicator_Item__c;

    private static final SObjectField indicatorBundleItem_Field_Delete = Indicator_Bundle_Item__mdt.Delete__c;
    private static final SObjectField indicatorItemExtension_Field_Delete = Indicator_Item_Extension__mdt.Delete__c;
    private static final SObjectField indicatorItemExtension_Field_Priority = Indicator_Item_Extension__mdt.Priority__c;
    private static final SObjectField indicatorItemExtension_Field_Indicator_Item = Indicator_Item_Extension__mdt.Indicator_Item__c;

    private static final SObjectField indicatorItem_Field_Delete = Indicator_Item__mdt.Delete__c;
    private static final SObjectField indicatorItem_Field_sObject = Indicator_Item__mdt.sObject__c;
    private static final SObjectField indicatorItem_Field_Field = Indicator_Item__mdt.Field__c;

    private static final Schema.ChildRelationship bundleItemRelationShip = Indicator_Bundle__mdt.SObjectType.getDescribe().getChildRelationships()[0];
    private static Schema.ChildRelationship getItemExtensionRelationShip() {
        for(Schema.ChildRelationship relationship : Indicator_Item__mdt.SObjectType.getDescribe().getChildRelationships()) {
            if(relationship.getField() == indicatorItemExtension_Field_Indicator_Item) return relationship;
        }
        return null;
    }

    private static Indicator_Bundle__mdt getIndicatorBundle(String qualifiedApiName) {
        Set<String> indicatorBundleFields = new Set<String>(getCustomFields(Indicator_Bundle__mdt.SObjectType));
        indicatorBundleFields.addAll(new Set<String>{
                'Id',
                'QualifiedApiName',
                'Label'
        });

        Set<String> indicatorBundleItemFields = new Set<String>(getCustomFields(Indicator_Bundle_Item__mdt.SObjectType));
        indicatorBundleItemFields.addAll(new Set<String>{
                'Id',
                'QualifiedApiName',
                'Label',
                indicatorBundleItem_Field_Item.getDescribe().getRelationshipName()+'.QualifiedApiName'
        });

        String queryString = 'SELECT ';
        queryString += String.join(new List<String>(indicatorBundleFields),',');

        queryString += ',\n(SELECT ';
        queryString += String.join(new List<String>(indicatorBundleItemFields),',') +' \nFROM '+bundleItemRelationShip.getRelationshipName();
        queryString += ' \nWHERE '+indicatorBundleItem_Field_Delete.getDescribe().getName()+' != TRUE';
        queryString += ' \nORDER BY '+indicatorBundleItem_Field_Order.getDescribe().getName()+' ASC NULLS LAST)';

        queryString += ' \nFROM '+Indicator_Bundle__mdt.SObjectType.getDescribe().getName();
        queryString += ' \nWHERE QualifiedApiName = :qualifiedApiName';

        Map<String,Object> queryBindMap = new Map<String, Object>{
                'qualifiedApiName' => qualifiedApiName
        };

        AccessLevel level = (Test.isRunningTest()) ? AccessLevel.SYSTEM_MODE : AccessLevel.USER_MODE; /**For Testing only we allow all fields**/
        List<Indicator_Bundle__mdt> bundles = Database.queryWithBinds(queryString,queryBindMap,level);

        if(bundles.isEmpty()) return null;
        else return bundles[0];
    }
    private static List<Indicator_Item__mdt> getAllIndicatorItems(String sObjectName) {
        Set<String> indicatorItemsFields = new Set<String>(getCustomFields(Indicator_Item__mdt.SObjectType));
        indicatorItemsFields.addAll(new Set<String>{
                'Id',
                'QualifiedApiName',
                'Label',
                indicatorItem_Field_Field.getDescribe().getName().replace('__c','__r')+'.QualifiedApiName'
        });

        Set<String> indicatorItemExtensionFields = new Set<String>(getCustomFields(Indicator_Item_Extension__mdt.SObjectType));
        indicatorItemExtensionFields.addAll(new Set<String>{
                'Id',
                'QualifiedApiName',
                'Label',
                indicatorItemExtension_Field_Item.getDescribe().getRelationshipName()+'.QualifiedApiName'
        });

        String queryString = 'SELECT ';
        queryString += String.join(new List<String>(indicatorItemsFields),',');

        queryString += ',\n(SELECT ';
        queryString += String.join(new List<String>(indicatorItemExtensionFields),',') +' \nFROM '+getItemExtensionRelationShip().getRelationshipName();
        queryString += ' \nWHERE '+indicatorItemExtension_Field_Delete.getDescribe().getName()+' != TRUE';
        queryString += ' \nORDER BY '+indicatorItemExtension_Field_Priority.getDescribe().getName()+' ASC NULLS LAST)';

        queryString += ' \nFROM '+Indicator_Item__mdt.SObjectType.getDescribe().getName();
        queryString += ' \nWHERE '+indicatorItem_Field_Delete.getDescribe().getName()+' != TRUE';
        queryString += ' \nAND '+indicatorItem_Field_sObject.getDescribe().getName()+' = :sObjectName';

        queryString += ' \nORDER BY '+indicatorItem_Field_Field.getDescribe().getName()+' ASC';

        Map<String,Object> queryBindMap = new Map<String, Object>{
                'sObjectName' => sObjectName
        };
        AccessLevel level = (Test.isRunningTest()) ? AccessLevel.SYSTEM_MODE : AccessLevel.USER_MODE; /**For Testing only we allow all fields**/
        return Database.queryWithBinds(queryString,queryBindMap,level);
    }

    public class indicatorBundle {
        @AuraEnabled
        public Indicator_Bundle__mdt bundle;
        @AuraEnabled
        public List<Indicator_Item__mdt> allItems;

        public indicatorBundle(String qualifiedApiName) {
            this.bundle = getIndicatorBundle(qualifiedApiName);
            if(this.bundle != null) this.allItems = getAllIndicatorItems(this.bundle.sObject__c);
        }
    }

}