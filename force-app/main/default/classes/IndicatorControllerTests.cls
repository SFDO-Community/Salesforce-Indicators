@isTest
private class IndicatorControllerTests {

    @isTest
    private static void successfullyGetIndicatorBundle() {
        // Test data setup

        // Actual test
        Test.startTest();
    
        IndicatorController.IndicatorBundle wrapper = IndicatorController.getIndicatorBundle(aBundle.DeveloperName);

        Test.stopTest();

        // Asserts
        Assert.areEqual(wrapper.CardTitle, 'Testing');
        Assert.areEqual(wrapper.Items.size(), 2);
        Assert.areEqual(wrapper.Items[0].Extensions.size(), 2);
    }

    private static Indicator_Bundle__mdt aBundle;
    private static Indicator_Item__mdt anItem;
    private static Indicator_Item__mdt anotherItem;
    private static Indicator_Bundle_Item__mdt aBundleItem;
    private static Indicator_Bundle_Item__mdt anotherBundleItem;
    private static Indicator_Item_Extension__mdt anItemExtension;
    private static Indicator_Item_Extension__mdt anotherItemExtension;


    static {
        aBundle = Build.aBundle().withDevName('the_bundle').withCardTitle('Testing').withSOBject('Account').build();
        anItem = Build.anItem().withDevName('item_1').withHoverText('Item 1').withSObjectAndField('Account','Name').build();
        anotherItem = Build.anItem().withDevName('item_2').withHoverText('Item 2').withSObjectAndAdvancedField('Account','Parent.Name').build();
        aBundleItem = Build.aBundleItem().withBundle(abundle).withItem(anItem).withOrder(1).build();
        anotherBundleItem = Build.aBundleItem().withBundle(abundle).withItem(anotherItem).withOrder(2).build();
        anItemExtension = Build.anExtension().withItem(anItem).withContainsText('ABC').build();
        anotherItemExtension = Build.anExtension().withItem(anItem).withContainsText('XYZ').build();

        Cmdt.setBundle(aBundle);
        Cmdt.setItem(anItem);
        Cmdt.setItem(anotherItem);
        Cmdt.setBundleItem(aBundleItem);
        Cmdt.setBundleItem(anotherBundleItem);
        Cmdt.setItemExtension(anItemExtension);
        Cmdt.setItemExtension(anotherItemExtension);
    }

}