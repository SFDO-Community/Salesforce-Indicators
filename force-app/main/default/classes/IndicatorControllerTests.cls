@isTest
private class IndicatorControllerTests {

    @isTest
    static void successfullyGetIndicatorBundle() {
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

    @isTest
    static void successfullyGetOrphanedIndicators() {
        // Test data setup

        // Actual test
        Test.startTest();
             IndicatorController.IndicatorBundle wrapper = IndicatorController.getIndicatorBundle('-1');
        Test.stopTest();

        // Asserts
        Assert.areEqual('Unbundled Items',wrapper.CardTitle);
        Assert.isNull(wrapper.BundleDescription);
        Assert.isNull(wrapper.BundleId);
        Assert.areEqual(2, wrapper.Items.size());
        Assert.areEqual(wrapper.Items[0].Extensions.size(), 1);
    }
    
    @isTest
    static void relativeDateExtensionPopulatesStartAndEndDate() {
        Test.startTest();
            IndicatorController.IndicatorBundle wrapper = IndicatorController.getIndicatorBundle(aBundle.DeveloperName);
        Test.stopTest();

        // anotherItem is Items[1] (order 2); aRelativeDateItemExtension is its only extension
        IndicatorController.IndicatorExtension ext = wrapper.Items[1].Extensions[0];
        Assert.isNotNull(ext.StartDate, 'StartDate should be set for a relative date extension');
        Assert.isNotNull(ext.EndDate, 'EndDate should be set for a relative date extension');
        Assert.areEqual(Date.today(), ext.StartDate, 'TODAY StartDate should be today');
        Assert.areEqual(Date.today().addDays(1), ext.EndDate, 'TODAY EndDate should be tomorrow');
    }

    @isTest
    static void nonRelativeDateExtensionLeavesStartAndEndDateNull() {
        Test.startTest();
            IndicatorController.IndicatorBundle wrapper = IndicatorController.getIndicatorBundle(aBundle.DeveloperName);
        Test.stopTest();

        // anItem is Items[0]; its extensions use plain text ('ABC', 'XYZ'), not relative dates
        IndicatorController.IndicatorExtension ext = wrapper.Items[0].Extensions[0];
        Assert.isNull(ext.StartDate, 'StartDate should be null for a plain-text extension');
        Assert.isNull(ext.EndDate, 'EndDate should be null for a plain-text extension');
    }

    @isTest
    static void successfullyGetEntityDefinitionValues() {
        // Test data setup
        Map<String, EntityDefinition> entityDefinitionsByDevName = new Map<String, EntityDefinition>(); 
        for(EntityDefinition ed : [
            SELECT DeveloperName, Label, MasterLabel, KeyPrefix, DetailUrl, EditUrl, NewUrl 
            FROM EntityDefinition 
            WHERE QualifiedApiName IN (
                'Indicator_Bundle__mdt', 
                'Indicator_Bundle_Item__mdt', 
                'Indicator_Item__mdt', 
                'Indicator_Item_Extension__mdt'
            )
            ORDER BY MasterLabel ASC
        ]){
            entityDefinitionsByDevName.put(ed.DeveloperName, ed);
        }
        
        // Actual test
        Test.startTest();
            IndicatorController.EntityDefList wrapper = IndicatorController.getNewCmdtUrls();
        Test.stopTest();

        // Asserts
        Assert.isNotNull(wrapper);
        Assert.isNotNull(wrapper.Entities);
        
        for(IndicatorController.EntityDef entdef : wrapper.Entities){
            Assert.areEqual(entityDefinitionsByDevName.get(entDef.Name).DeveloperName, entDef.Name);
            Assert.areEqual(entityDefinitionsByDevName.get(entDef.Name).NewUrl, entDef.NewUrl);
            Assert.areEqual(entityDefinitionsByDevName.get(entDef.Name).MasterLabel, entDef.Label);
        }
        
    }

    @isTest
    static void actionFieldsPopulateOnWrapper() {
        Test.startTest();
            IndicatorController.IndicatorBundle wrapper = IndicatorController.getIndicatorBundle(anActionBundle.DeveloperName);
        Test.stopTest();

        Assert.areEqual(1, wrapper.Items.size());
        IndicatorController.IndicatorItem item = wrapper.Items[0];
        Assert.areEqual('View Details', item.ActionButtonLabel);
        Assert.areEqual('Opens the record', item.ActionHelpText);
        Assert.isTrue(item.ActionConfirmRequired);
    }

    private static Indicator_Bundle__mdt aBundle;
    private static Indicator_Bundle__mdt anActionBundle;
    private static Indicator_Item__mdt anItem;
    private static Indicator_Item__mdt anotherItem;
    private static Indicator_Item__mdt anOrphanItem;
    private static Indicator_Item__mdt anotherOrphanItem;
    private static Indicator_Item__mdt anActionItem;
    private static Indicator_Bundle_Item__mdt aBundleItem;
    private static Indicator_Bundle_Item__mdt anotherBundleItem;
    private static Indicator_Bundle_Item__mdt anActionBundleItem;
    private static Indicator_Item_Extension__mdt anItemExtension;
    private static Indicator_Item_Extension__mdt anotherItemExtension;
    private static Indicator_Item_Extension__mdt anOrphanItemExtension;
    private static Indicator_Item_Extension__mdt aRelativeDateItemExtension;
    // private static Indicator_Item_Extension__mdt anotherOrphanItemExtension;

    static {
        aBundle = Build.aBundle().withDevName('the_bundle').withCardTitle('Testing').withSOBject('Account').build();
        anItem = Build.anItem().withDevName('item_1').withHoverText('Item 1').withSObjectAndField('Account','Name').build();
        anotherItem = Build.anItem().withDevName('item_2').withHoverText('Item 2').withSObjectAndAdvancedField('Account','Parent.Name').build();
        anOrphanItem = Build.anItem().withDevName('orphan_item_1').withHoverText('Orphan Item 1').withSObjectAndField('Account','AccountNumber').build();
        anotherOrphanItem = Build.anItem().withDevName('orphan_item_2').withHoverText('Orphan Item 2').withSObjectAndAdvancedField('Account','Owner.Name').build();
        aBundleItem = Build.aBundleItem().withBundle(abundle).withItem(anItem).withOrder(1).build();
        anotherBundleItem = Build.aBundleItem().withBundle(abundle).withItem(anotherItem).withOrder(2).build();
        anItemExtension = Build.anExtension().withItem(anItem).withContainsText('ABC').build();
        anotherItemExtension = Build.anExtension().withItem(anItem).withContainsText('XYZ').build();
        anOrphanItemExtension = Build.anExtension().withItem(anOrphanItem).withContainsText('XYZ').build();
        aRelativeDateItemExtension = Build.anExtension().withItem(anotherItem).withContainsText('TODAY').withTextOperator('Equals').build();
        // anotherOrphanItemExtension = Build.anExtension().withItem(anotherOrphanItem).withContainsText('XYZ').build();

        anActionBundle = Build.aBundle().withDevName('action_bundle').withCardTitle('Action Testing').withSObject('Account').build();
        anActionItem = Build.anItem().withDevName('action_item_1').withSObjectAndField('Account', 'Name').build();
        anActionBundleItem = Build.aBundleItem()
            .withBundle(anActionBundle)
            .withItem(anActionItem)
            .withOrder(1)
            .withActionButtonLabel('View Details')
            .withActionHelpText('Opens the record')
            .withActionConfirmRequired(true)
            .build();

        Cmdt.setBundle(aBundle);
        Cmdt.setBundle(anActionBundle);
        Cmdt.setItem(anItem);
        Cmdt.setItem(anotherItem);
        Cmdt.setItem(anOrphanItem);
        Cmdt.setItem(anotherOrphanItem);
        Cmdt.setItem(anActionItem);
        Cmdt.setBundleItem(aBundleItem);
        Cmdt.setBundleItem(anotherBundleItem);
        Cmdt.setBundleItem(anActionBundleItem);
        Cmdt.setItemExtension(anItemExtension);
        Cmdt.setItemExtension(anotherItemExtension);
        Cmdt.setItemExtension(anOrphanItemExtension);
        Cmdt.setItemExtension(aRelativeDateItemExtension);
        // Cmdt.setItemExtension(anotherOrphanItemExtension);
    }

}