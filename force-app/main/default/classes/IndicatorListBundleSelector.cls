global class IndicatorListBundleSelector extends VisualEditor.DynamicPickList {

    // https://dave-norris.medium.com/dynamic-properties-for-lightning-web-components-b334cd0ce1b0
    // https://github.com/deejay-hub/timeline-lwc
   
    global override VisualEditor.DataRow getDefaultValue(){
        VisualEditor.DataRow defaultValue = new VisualEditor.DataRow('--Please Select--', null);
        return defaultValue;
    }

    global override VisualEditor.DynamicPickListRows getValues() {

        VisualEditor.DynamicPickListRows  valuePairs = new VisualEditor.DynamicPickListRows();

        valuePairs.addRow(getDefaultValue());

        for(Indicator_Bundle__mdt bundle : Cmdt.getAllActiveBundles()) {
            VisualEditor.DataRow valuePair = new VisualEditor.DataRow(bundle.Label, bundle.DeveloperName);
            valuePairs.addRow(valuePair);
        }
        return valuePairs;
    }

    @AuraEnabled(cacheable=true)
    public static List<PicklistOption> getBundleOptions(){
        List<PicklistOption> options = new List<PicklistOption>();

        for(Indicator_Bundle__mdt bundle : Cmdt.getAllBundles()){
            PicklistOption o = new PicklistOption();
            o.label = bundle.Label; 
            o.value = bundle.DeveloperName;
            options.add( o );   
        }

        PicklistOption x = new PicklistOption();
        x.label = '** Unbundled Items **'; 
        x.value = '-1';
        options.add( x );

        // IndicatorListBundleSelector ilbs = new IndicatorListBundleSelector();
        // for(VisualEditor.DataRow row : ilbs.getValues().getDataRows()){
        //     if(row.getValue() != null){
        //         PicklistOption o = new PicklistOption();
        //         o.label = row.getLabel();
        //         o.value = (String) row.getValue();
        //         options.add( o );    
        //     }
        // }

        return options;
    }

    public class PicklistOption {
        @AuraEnabled
        public String label {get; set;}
        @AuraEnabled
        public String value {get; set;}
    }


}