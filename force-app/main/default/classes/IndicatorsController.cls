public with sharing class IndicatorsController {
    @AuraEnabled(cacheable=true)
    public static List<IndicatorsResponse> showIndicators(Id recordId) {
        List<IndicatorsResponse> response = new List<IndicatorsResponse>();
        Map<String, Indicator__mdt> mapFieldNameByIndicatorMDT = new Map<String, Indicator__mdt>();
        List<String> fields = new List<String>();
        try {
            // From the RecordId extract its Object Name
            String objectName = String.valueOf(recordId?.getSobjectType());
            // Query for all the Custom Metadata records related to the Object
            for (Indicator__mdt indMetadata : [
                SELECT
                    HoverText__c,
                    TextValue__c,
                    TextFalse__c,
                    Icon__c,
                    IconFalse__c,
                    Field__r.QualifiedAPIName,
                    Type__c,
                    ImageURL__c
                FROM Indicator__mdt
                WHERE Object__c = :objectName
            ]) {
                // Split to get field Name from Entity Particle
                /*List<String> particle = (indMetadata.Field__r.QualifiedAPIName).split('\\.');
                String fieldName;
                if (particle.size() == 3) {
                    fieldName = particle[2];
                } else {
                    fieldName = particle[1];
                }*/
                mapFieldNameByIndicatorMDT.put(indMetadata.Field__r.QualifiedAPIName, indMetadata);
            }
            // This prepares all the fields on which query will run
            fields.addAll(mapFieldNameByIndicatorMDT.keyset());
            String soql =
                'SELECT ' +
                String.join(fields, ',') +
                ' FROM ' +
                objectName +
                ' WHERE ID =:recordId WITH SECURITY_ENFORCED LIMIT 1';
            // Get the record with all the field values configured in CMDT
            System.debug(soql);
            sObject record = Database.query(soql);
            // Loop over the fields and do a Match between what is configured in CMDT vs whats in the record
            for (String field : mapFieldNameByIndicatorMDT.keyset()) {
                Indicator__mdt indicatorRecord = mapFieldNameByIndicatorMDT.get(
                    field
                );
                // Based on the Type check for the condition

                // Condition 1 - If the field is a Text field
                if (indicatorRecord.Type__c == 'Text') {
                    if (indicatorRecord.TextValue__c != '') {
                        if (String.isBlank((String) record.get(field))) {
                            response.add(
                                new IndicatorsResponse(
                                    field,
                                    indicatorRecord.IconFalse__c,
                                    indicatorRecord.TextFalse__c,
                                    indicatorRecord.ImageURL__c,
                                    indicatorRecord.HoverText__c
                                )
                            );
                        } else {
                            response.add(
                                new IndicatorsResponse(
                                    field,
                                    indicatorRecord.Icon__c,
                                    indicatorRecord.TextValue__c,
                                    indicatorRecord.ImageURL__c,
                                    indicatorRecord.HoverText__c
                                )
                            );
                        }
                    }
                }
                // Condition 2 - If the field is a Boolean field
                if (indicatorRecord.Type__c == 'Boolean') {
                    if (record.get(field) == true) {
                        response.add(
                            new IndicatorsResponse(
                                field,
                                indicatorRecord.Icon__c,
                                indicatorRecord.TextValue__c,
                                indicatorRecord.ImageURL__c,
                                indicatorRecord.HoverText__c
                                )
                            );
                        } else {
                            response.add(
                                new IndicatorsResponse(
                                    field,
                                    indicatorRecord.IconFalse__c,
                                    indicatorRecord.TextFalse__c,
                                    indicatorRecord.ImageURL__c,
                                    indicatorRecord.HoverText__c
                                )
                            );                    
                        }
                }
            }
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
        return response;
    }

    public class IndicatorsResponse {
        @AuraEnabled
        public String fieldName;
        @AuraEnabled
        public String iconName;
        @AuraEnabled
        public String textValue;
        @AuraEnabled
        public String imgURL;
        @AuraEnabled
        public String hoverText;

        public IndicatorsResponse(
            String fieldName,
            String iconName,
            String textValue,
            String imgURL,
            String hoverText
        ) {
            this.fieldName = fieldName;
            this.textValue = textValue;
            this.iconName = iconName;
            this.imgURL = imgURL;
            this.hoverText = hoverText;
        }
    }

}
