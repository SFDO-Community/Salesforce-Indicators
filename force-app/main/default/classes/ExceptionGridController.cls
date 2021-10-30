public with sharing class ExceptionGridController {
    @AuraEnabled
    public static List<ExceptionGridResponse> showExceptionGrid(Id recordId) {
        List<ExceptionGridResponse> response = new List<ExceptionGridResponse>();
        Map<String, ExceptionGridConfig__mdt> mapFieldNameByExceptionGridMDT = new Map<String, ExceptionGridConfig__mdt>();
        List<String> fields = new List<String>();
        try {
            // From the RecordId extract its Object Name
            String objectName = String.valueOf(recordId?.getSobjectType());
            // Query for all the Custom Metadata records related to the Object
            for (ExceptionGridConfig__mdt gridMetadata : [
                SELECT
                    ExpectedValue__c,
                    ExceptionMessage__c,
                    Field__r.QualifiedAPIName,
                    Field__r.Label,
                    RequiredText__c,
                    Icon__c,
                    Type__c
                FROM ExceptionGridConfig__mdt
                WHERE Object__c = :objectName
            ]) {
                mapFieldNameByExceptionGridMDT.put(gridMetadata.Field__r.QualifiedAPIName, gridMetadata);
            }
            // This prepares all the fields on which query will run
            fields.addAll(mapFieldNameByExceptionGridMDT.keyset());
            String soql =
                'SELECT ' +
                String.join(fields, ',') +
                ' FROM ' +
                objectName +
                ' WHERE ID =:recordId WITH SECURITY_ENFORCED LIMIT 1';
            // Get the record with all the field values configured in CMDT
            sObject record = Database.query(soql);
            // Loop over the fields and do a Match between what is configured in CMDT vs whats in the record
            System.debug('SHOW All Fields: '+ fields);
            for (String field : mapFieldNameByExceptionGridMDT.keyset()) {
                ExceptionGridConfig__mdt expectionGridRecord = mapFieldNameByExceptionGridMDT.get(
                    field
                );
                // Based on the Type check for the condition

                // Condition 1 - If the field is a Text field
                if (expectionGridRecord.Type__c == 'Text') {
                    if (expectionGridRecord.RequiredText__c && String.isBlank((String) expectionGridRecord.ExpectedValue__c)) {
                        System.debug('SHOW One Field Value: ' + field + ' - ' + record.get(field) + ' - ' + String.isBlank((String) record.get(field)));
                        if (String.isBlank((String) record.get(field))) {
                            response.add(
                                new ExceptionGridResponse(
                                    expectionGridRecord.Field__r.Label,
                                    true,
                                    expectionGridRecord.Icon__c,
                                    expectionGridRecord.ExceptionMessage__c
                                )
                            );
                        } else {
                            if (expectionGridRecord.RequiredText__c &&
                                (String) record.get(field) !=
                                expectionGridRecord.ExpectedValue__c && 
                                String.isNotBlank((String) expectionGridRecord.ExpectedValue__c))
                            {
                            
                                System.debug('SHOW Text Not Equal: ' + field + ' - ' + record.get(field) + ' - ' + String.isBlank((String) record.get(field)));
                                
                                response.add(
                                    new ExceptionGridResponse(
                                        expectionGridRecord.Field__r.Label,
                                        true,
                                        expectionGridRecord.Icon__c,
                                        expectionGridRecord.ExceptionMessage__c
                                    )
                                );
                            }
                        }
                    }
                }
                // Condition 2 - If the field is a Picklist field
                if (expectionGridRecord.Type__c == 'Picklist') {
                    if (
                        (String) record.get(field) !=
                        expectionGridRecord.ExpectedValue__c
                    )
                        response.add(
                            new ExceptionGridResponse(
                                expectionGridRecord.Field__r.Label,
                                true,
                                expectionGridRecord.Icon__c,
                                expectionGridRecord.ExceptionMessage__c
                            )
                        );
                }
                // Condition 3 - If the field is a Boolean Field
                if (expectionGridRecord.Type__c == 'Boolean') {
                    if (
                        (String) String.valueOf(record.get(field)) !=
                        expectionGridRecord.ExpectedValue__c
                    )
                        response.add(
                            new ExceptionGridResponse(
                                expectionGridRecord.Field__r.Label,
                                Boolean.valueOf(expectionGridRecord.ExpectedValue__c),
                                expectionGridRecord.Icon__c,
                                expectionGridRecord.ExceptionMessage__c
                            )
                        );
                }
            }
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
        return response;
    }

    public class ExceptionGridResponse {
        @AuraEnabled
        public String fieldName;
        @AuraEnabled
        public Boolean isError;
        @AuraEnabled
        public String icon;
        @AuraEnabled
        public String exceptionMessage;

        public ExceptionGridResponse(
            String fieldName,
            Boolean isError,
            String icon,
            String exceptionMessage
        ) {
            this.fieldName = fieldName;
            this.isError = isError;
            this.icon = icon;
            this.exceptionMessage = exceptionMessage;
        }
    }
}