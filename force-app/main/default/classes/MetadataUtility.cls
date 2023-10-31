/**
 * Created by robertwright on 10/30/23.
 */

public with sharing class MetadataUtility {
    private static final String Label_Field = 'Label';
    private static final String QualifiedApiName_Field = 'QualifiedApiName';

    private static Metadata.DeployContainer deployContainer;

    /**Combine the Object name with the QualifiedApiName**/
    private static String mergeFullName(String metadataName, String QualifiedApiName) {
        return metadataName.replace('__mdt','')+'.'+QualifiedApiName;
    }

    private static void buildMetaData(String sObjectName,Map<String,Object> metadataFieldValueMap) {
        String QualifiedApiName = (String) metadataFieldValueMap.get(QualifiedApiName_Field);
        String fullName = mergeFullName(sObjectName,QualifiedApiName);
        String label = (String) metadataFieldValueMap.get(Label_Field);
        if(String.isBlank(label)) label = 'Unnamed Metadata';
        Metadata.CustomMetadata customMetadata = MetadataDeploy.buildCustomMetadata(fullName,label,metadataFieldValueMap);
        deployContainer.addMetadata(customMetadata);
    }


    private static Id deployMetadataRecords(List<SObject> records,SObjectType sObjectType) {
        deployContainer = new Metadata.DeployContainer(); // Build New Deployment Container
        DescribeSObjectResult describeSObjectResult = sObjectType.getDescribe();
        for(SObject record : records) buildMetaData(describeSObjectResult.getName(), record.getPopulatedFieldsAsMap()); // Build Metadata Maps and Add to Deploy Container
        Id deployId = MetadataDeploy.upsertMetaData(deployContainer); // Deploy Deploy Container
        return deployId;
    }

    @AuraEnabled
    public static Id deployIndicatorBundles(List<Indicator_Bundle__mdt> records) {
        return deployMetadataRecords(records,Indicator_Bundle__mdt.getSObjectType());
    }

}