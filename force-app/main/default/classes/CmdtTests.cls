@isTest
private class CmdtTests {

    @isTest
    private static void successfullySetAndGetBundle() {
        // Test data setup
        Indicator_Bundle__mdt bundle = 
            Build.aBundle()
            .withCardIcon('standard:account')
            .withCardText('Hello World!')
            .withCardTitle('Account Bundle')
            .withSObject('Account')
            .build();

        // Actual test
        Test.startTest();
            Cmdt.setBundle(bundle);
            Indicator_Bundle__mdt testBundle = Cmdt.getBundle(bundle.DeveloperName);
        Test.stopTest();

        // Asserts
        Assert.areEqual(bundle.Card_Icon__c, testBundle.Card_Icon__c);
        Assert.areEqual(bundle.Card_Title__c, testBundle.Card_Title__c);
        Assert.areEqual(bundle.Card_Text__c, testBundle.Card_Text__c);
    }

    @isTest
    private static void successfullySetAndGetItem() {
        // Test data setup
        Indicator_Item__mdt item = 
            Build.anItem()
            .withSObjectAndField('Account','Rating')
            .withHoverText('This is Hover Text')
            .withIconValue('standard:account')
            .showIconOnly()
            .build();

        // Actual test
        Test.startTest();
            Cmdt.setItem(item);
            Indicator_Item__mdt testItem = Cmdt.getItem(item.DeveloperName);
        Test.stopTest();
    
        // Asserts
        Assert.areEqual(item.Hover_Text__c, testItem.Hover_Text__c);
        Assert.areEqual(item.Icon_Value__c, testItem.Icon_Value__c);
        Assert.areEqual(item.Empty_Static_Text_Behavior__c, testItem.Empty_Static_Text_Behavior__c);
    }

    @isTest
    private static void successfullySetAndGetBundleItem() {
        // Test data setup
        Indicator_Bundle__mdt bundle = Build.aBundle().build();
        Cmdt.setBundle(bundle);

        Indicator_Item__mdt item = Build.anItem().build();
        Cmdt.setItem(item);

        Indicator_Bundle_Item__mdt bundleItem = 
            Build.aBundleItem()
            .withBundle(bundle)
            .withItem(item)
            .withOrder(1)
            .build();

        // Actual test
        Test.startTest();
            Cmdt.setBundleItem(bundleItem);
            List<Indicator_Bundle_Item__mdt> itemNames = Cmdt.getBundleItems(bundle.DeveloperName);
        Test.stopTest();
    
        // Asserts
        Assert.isNotNull(itemNames);
        Assert.areEqual(itemNames[0].Indicator_Item__r.DeveloperName,item.DeveloperName);
        
    }

    @isTest
    private static void successfullySetAndGetExtension() {
        // Test data setup
        Indicator_Item__mdt item = Build.anItem().build();
        Cmdt.setItem(item);

        Indicator_Item_Extension__mdt extension = 
            Build.anExtension()
            .withItem(item)
            .build();

        // Actual test
        Test.startTest();
            Cmdt.setItemExtension(extension);
            List<Indicator_Item_Extension__mdt> extensions = Cmdt.getExtensionsForItem(item.DeveloperName);
        Test.stopTest();
    
        // Asserts
        Assert.isNotNull(extensions);
    }

    @isTest
    private static void successfullyReturnEmptyResults() {
        // Test data setup
    
        // Actual test
        Test.startTest();

        List<Indicator_Bundle__mdt> allActiveBundles = Cmdt.getAllActiveBundles();
        Indicator_Bundle__mdt bundle = Cmdt.getBundle('Nonexistent_Bundle');
        List<Indicator_Bundle_Item__mdt> bundleItems = Cmdt.getBundleItems('Nonexistent_Bundle');

        Indicator_Item__mdt item = Cmdt.getItem('Nonexistent_Item');
        List<Indicator_Item_Extension__mdt> itemExtensions = Cmdt.getExtensionsForItem('Nonexistent_Item');
    
        Test.stopTest();
    
        // Asserts
        Assert.areEqual(allActiveBundles, new List<Indicator_Bundle__mdt>());
        Assert.areEqual(bundle, new Indicator_Bundle__mdt());
        Assert.areEqual(bundleItems, new List<Indicator_Bundle_Item__mdt>());
        Assert.areEqual(item, new Indicator_Item__mdt());
        Assert.areEqual(itemExtensions, new List<Indicator_Item_Extension__mdt>());
    }

}