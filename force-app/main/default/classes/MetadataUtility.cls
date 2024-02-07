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
    public static Id deployIndicatorBundles(deploymentWrapper items) {
        return deployWrapperMetadata(items);
    }

    /**Metadata Methods**/
    private static Id deployWrapperMetadata(deploymentWrapper wrapper) {
        deployContainer = new Metadata.DeployContainer(); // Build New Deployment Container
        if(wrapper.indicatorBundle != null) processMetadataRecords(new List<Indicator_Bundle__mdt>{wrapper.indicatorBundle},Indicator_Bundle__mdt.getSObjectType());
        if(wrapper.indicatorItem != null) processMetadataRecords(new List<Indicator_Item__mdt>{wrapper.indicatorItem},Indicator_Item__mdt.getSObjectType());
        if(wrapper.indicatorItemExtensions != null && !wrapper.indicatorItemExtensions.isEmpty()) processMetadataRecords(wrapper.indicatorItemExtensions,Indicator_Item_Extension__mdt.getSObjectType());
        if(wrapper.indicatorBundleItems != null && !wrapper.indicatorBundleItems.isEmpty()) processMetadataRecords(wrapper.indicatorBundleItems,Indicator_Bundle_Item__mdt.getSObjectType());
        Id deployId = MetadataDeploy.upsertMetaData(deployContainer); // Deploy Deploy Container
        return deployId;
    }

    private static void processMetadataRecords(List<SObject> records,SObjectType sObjectType) {
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

        if(isReference || isEntityRelationshipField) {
            SObject relatedRecord;
            Map<String,Object> relatedRecordPopulatedFieldMap;
            String relationshipName = (isEntityRelationshipField) ? fieldName.removeEnd('__c')+'__r' : fieldResult.getRelationshipName(); /**We replace __c with __r to resolve Entity Relationship non reference**/
            if(populatedFieldsMap.containsKey(relationshipName)) {
                try{
                    relatedRecord = (SObject) populatedFieldsMap.get(relationshipName);
                    relatedRecordPopulatedFieldMap = relatedRecord.getPopulatedFieldsAsMap();
                } catch(Exception ex) {
                    System.debug(ex.getMessage());
                }
            }
            if(relatedRecordPopulatedFieldMap != null && relatedRecordPopulatedFieldMap.containsKey(QualifiedApiName_Field)) value = (String) relatedRecordPopulatedFieldMap.get(QualifiedApiName_Field);

        } else if(populatedFieldsMap.containsKey(fieldName)) value = populatedFieldsMap.get(fieldName);

        if(value == null || value == '' && fieldResult.defaultValue != null) value = fieldResult.defaultValue;
        else if(value == null || value == '' && fieldResult.defaultValueFormula != null) value = fieldResult.defaultValueFormula.removeEnd('\'').removeEnd('"').removeStart('\'').removeStart('"');

        Metadata.CustomMetadataValue metadataField = new Metadata.CustomMetadataValue();
        metadataField.field = fieldName;
        metadataField.value = value;

        customMetadata.values.add(metadataField);
    }

}