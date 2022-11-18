@isTest
private class IndicatorListBundleSelectorTests {

    @isTest
    private static void successfullyReturnDefault() {
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
    private static void succesfullyReturnOptions() {
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

}
