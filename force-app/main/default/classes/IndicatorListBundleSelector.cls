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
    
    
    
    }