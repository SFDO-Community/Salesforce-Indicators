/**
 * Created by robertwright on 10/30/23.
 */

public with sharing class MetadataDeploy implements Metadata.DeployCallback {

        public String resultMessage;

        public void handleResult(Metadata.DeployResult result,Metadata.DeployCallbackContext context) {
            if(result.status === Metadata.DeployStatus.Succeeded) {
                resultMessage = 'MetaData Deploy Succeeded';
            } else resultMessage = 'MetaData Deploy Failed';
            if(Test.isRunningTest()) System.debug(resultMessage);
        }

        public static Id upsertMetaData(Metadata.DeployContainer deployContainer) {
            MetadataDeploy callback = new MetadataDeploy();
            Id upsertId;
            if(!Test.isRunningTest()) upsertId = Metadata.Operations.enqueueDeployment(deployContainer,callback);
            return upsertId;
        }



        private static Set<String> entityRelationshipFields = new Set<String>{
                'Indicator_Bundle.sObject__c'
        };

        public static Metadata.CustomMetadata buildCustomMetadata(String fullName, String recordLabel, Map<String,Object> fieldValueMap) {
            Metadata.CustomMetadata customMetadata = new Metadata.CustomMetadata();
            customMetadata.fullName = (fullName.length() > 40) ? fullName.substring(0,40) : fullName;
            customMetadata.label = (recordLabel.length() > 40) ? recordLabel.substring(0,40) : recordLabel;

            for(String fieldName : fieldValueMap.keySet()) {
                if(!fieldName.contains('__c')) continue; // We only pass in custom fields when deploying metadata
                else if(entityRelationshipFields.contains(fieldName)) fieldName.replace('__r','__c');
                Metadata.CustomMetadataValue metadataField = new Metadata.CustomMetadataValue();
                metadataField.field = fieldName;
                metadataField.value = fieldValueMap.get(fieldName);
                customMetadata.values.add(metadataField);
            }

            return customMetadata;
        }


}