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

            List<String> rows = content.split(NEWLINE);
            for( Integer i = 1; i < rows.size(); i++ ){
                Option option = new Option();
                List<String> columns = rows[i].split(COMMA);
                option.label = columns[0].trim();
                option.value = columns[0].trim();
                option.icon = columns[0].trim();
                columns.remove(0);

                options.add(option);
            }
        } catch (Exception e) {
            AuraHandledException ahe = new AuraHandledException(e.getMessage());
            ahe.setMessage('Aura Handled Exception thrown.');
            throw ahe;
        }

        return options;
    }
}