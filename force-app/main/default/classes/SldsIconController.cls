public with sharing class SldsIconController {

    static final String COMMA = ',';
    static final String NEWLINE = '\r\n';
    static final String SPACE = ' ';
    
    public class Option {
        @AuraEnabled
        public String label {get; set;}
        @AuraEnabled
        public String value {get; set;}
        @AuraEnabled
        public String icon {get; set;}
    }

    @AuraEnabled (cacheable=true)
    public static List<Option> getIconOptions() {
    
        List<Option> options = new List<Option>();

        Option emptyOption = new Option();
        emptyOption.label = '--None--';
        emptyOption.value = null;

        options.add(emptyOption);

        try {
            StaticResource sr = [
                SELECT Body
                FROM StaticResource 
                WHERE Name = 'SldsIcons'
                AND NamespacePrefix = ''
            ];

            String content = sr.Body.toString();

            // Handle both Unix (\n) and Windows (\r\n) line endings
            List<String> rows = content.split('\\r?\\n');
            for( Integer i = 1; i < rows.size(); i++ ){
                String row = rows[i].trim();
                if (String.isBlank(row)) {
                    continue; // Skip empty rows
                }
                
                Option option = new Option();
                List<String> columns = row.split(COMMA);
                
                if (columns.size() >= 1) {
                    option.label = columns[0].trim();
                    option.value = columns[0].trim();
                    option.icon = columns[0].trim();
                    
                    // Use the second column as description/search text if available
                    if (columns.size() >= 2 && String.isNotBlank(columns[1].trim())) {
                        option.label = columns[0].trim() + ' (' + columns[1].trim() + ')';
                    }
                    
                    options.add(option);
                }
            }
        } catch (Exception e) {
            AuraHandledException ahe = new AuraHandledException(e.getMessage());
            ahe.setMessage('Error loading SLDS Icons: ' + e.getMessage());
            throw ahe;
        }

        return options;
    }
}