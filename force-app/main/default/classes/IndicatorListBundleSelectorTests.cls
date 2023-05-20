@isTest
private class IndicatorListBundleSelectorTests {

    @isTest
    static void successfullyReturnDefault() {
        // Test data setup
        IndicatorListBundleSelector selector = new IndicatorListBundleSelector();

        // Actual test
        Test.startTest();
        VisualEditor.DataRow defaultOption = selector.getDefaultValue();
        Test.stopTest();

        // Asserts
        Assert.areEqual(defaultOption.getLabel(), '--Please Select--');
        Assert.isNull(defaultOption.getValue());
    }

    @isTest
    static void succesfullyReturnOptions() {
        // Test data setup
        Indicator_Bundle__mdt bundle = Build.aBundle().build();
        Cmdt.setBundle(bundle);

        IndicatorListBundleSelector selector = new IndicatorListBundleSelector();

        // Actual test
        Test.startTest();
        VisualEditor.DynamicPickListRows options = selector.getValues();
        Test.stopTest();
    
        // Asserts
        Assert.areEqual(options.size(),2);
    }

    @isTest
    static void successfullyReturnBundleOptions() {
        Indicator_Bundle__mdt bundle = Build.aBundle().build();
        Cmdt.setBundle(bundle);

        // Actual test
        Test.startTest();
            List<IndicatorListBundleSelector.PicklistOption> options = IndicatorListBundleSelector.getBundleOptions();
        Test.stopTest();
    
        // Asserts
        Assert.areEqual(options.size(),2);

        Assert.areEqual(bundle.Label, options[0].label);
        Assert.areEqual(bundle.DeveloperName, options[0].value);

        Assert.areEqual('** Unbundled Items **', options[1].label);
        Assert.areEqual('-1', options[1].value);
    }

}