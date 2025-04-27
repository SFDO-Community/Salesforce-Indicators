public with sharing class Cmdt {
    
    // Initialize the static variables with CMDT values that exist in the org
    public static void initializeConfiguration() {
        
        // Gather all active Bundles and put them into a Map (key: DeveloperName; Bundle)
        for( Indicator_Bundle__mdt bundle : [
            SELECT Id, DeveloperName, MasterLabel, Label,
                Active__c, 
                Card_Icon__c, 
                Card_Icon_Background__c, 
                Card_Icon_Foreground__c, 
                Card_Text__c, 
                Card_Title__c, 
                Description__c,
                sObject__c, 
                sObject__r.QualifiedApiName, 
                sObject__r.Label
            FROM Indicator_Bundle__mdt
            ORDER BY Label
        ] ) {
            setBundle(bundle);
        }

        // Gather all active Items and put them into a Map (key: Developername; Item)
        // Using SOQL because of parent-related values AND Advanced_Field__c is long text.
        for( Indicator_Item__mdt item : [
            SELECT Id, DeveloperName, MasterLabel,
                Active__c,
                Advanced_Field__c,
                Advanced_Field_Label__c,
                Display_Multiple__c,
                Empty_Static_Text_Behavior__c,
                Field__c, Field__r.QualifiedApiName,
                Hover_Text__c,
                Icon_Value__c,
                Image__c,
                Inverse_Hover_Text__c,
                Inverse_Icon_Value__c,
                Inverse_Image__c,
                Inverse_Static_Text__c,
                Show_False_or_Blank__c,
                sObject__c, sObject__r.QualifiedApiName,
                Static_Text__c,
                Zero_Behavior__c,
                Icon_Background__c,
                Icon_Foreground__c,
                Inverse_Icon_Background__c,
                Inverse_Icon_Foreground__c,
                Classification__c,
                Display_Text__c,
                Inverse_Classification__c,
                Inverse_Display_Text__c,
                Description__c
            FROM Indicator_Item__mdt
            // WHERE Active__c = TRUE
        ]){
            setItem(item);
        }

        // Gather all active Bundle Items (Bundle and Item are active) and put them into a Map (key: Bundle DeveloperName; List of BundleItems)
        // Using SOQL because of the Order By clause rather than creating a custom sort method.
        for( Indicator_Bundle_Item__mdt bundleItem : [
            SELECT Indicator_Bundle__c, Indicator_Bundle__r.DeveloperName,
                Indicator_Item__c, Indicator_Item__r.DeveloperName,
                Order__c
            FROM Indicator_Bundle_Item__mdt
            // WHERE Indicator_Bundle__r.Active__c = TRUE
            // AND Indicator_Item__r.Active__c = TRUE
            ORDER BY Order__c
        ]){
            setBundleItem(bundleItem);
        }

        // Gather all active Item Extensions and put them into a Map (key: Indicator Item; List of Extensions)
        // Using SOQL because of the Order By clause rather than creating a custom sort method.
        for(Indicator_Item_Extension__mdt itemExtension : [
            SELECT Id, Active__c,
                Contains_Text__c,
                Text_Operator__c,
                Hover_Text__c,
                Icon_Value__c,
                Image__c,
                Indicator_Item__c,
                Indicator_Item__r.DeveloperName,
                Maximum__c,
                Minimum__c,
                Priority__c,
                Static_Text__c,
                Icon_Background__c,
                Icon_Foreground__c,
                Classification__c,
                Display_Text__c,
                Description__c
            FROM Indicator_Item_Extension__mdt
            // WHERE Active__c = TRUE
            // AND Indicator_Item__r.Active__c = TRUE
            ORDER BY Indicator_Item__c, Priority__c DESC, MasterLabel
        ]){
            setItemExtension(itemExtension);
        }
    }

    public static void setBundle(Indicator_Bundle__mdt bundle) {
        bundlesByName.put(bundle.DeveloperName, bundle);
        if(bundle.Active__c){
            activeBundlesByName.put(bundle.DeveloperName, bundle);
        }
    }

    public static void setItem(Indicator_Item__mdt item) {
        itemsByName.put(item.DeveloperName, item);
        if(item.Active__c){
            activeItemsByName.put(item.DeveloperName, item);
        }
    }

    public static void setBundleItem(Indicator_Bundle_Item__mdt bundleItem) {
        if(!bundleItemsByBundle.containsKey(bundleItem.Indicator_Bundle__r.DeveloperName)){
            bundleItemsByBundle.put(bundleItem.Indicator_Bundle__r.DeveloperName,new List<Indicator_Bundle_Item__mdt>());
        }
        if(!bundleItemsByItem.containsKey(bundleItem.Indicator_Item__r.DeveloperName)){
            bundleItemsByItem.put(bundleItem.Indicator_Item__r.DeveloperName,new List<Indicator_Bundle_Item__mdt>());
        }
        bundleItemsByBundle.get(bundleItem.Indicator_Bundle__r.DeveloperName).add(bundleItem);
        bundleItemsByItem.get(bundleItem.Indicator_Item__r.DeveloperName).add(bundleItem);
    }

    public static void setItemExtension(Indicator_Item_Extension__mdt itemExtension) {
        if(!extensionsByItem.containsKey(itemExtension.Indicator_Item__r.DeveloperName)){
            extensionsByItem.put(itemExtension.Indicator_Item__r.DeveloperName,new List<Indicator_Item_Extension__mdt>());
        }

        if(itemExtension.Active__c && !activeExtensionsByItem.containsKey(itemExtension.Indicator_Item__r.DeveloperName)){
            activeExtensionsByItem.put(itemExtension.Indicator_Item__r.DeveloperName,new List<Indicator_Item_Extension__mdt>());
        }

        extensionsByItem.get(itemExtension.Indicator_Item__r.DeveloperName).add(itemExtension);
        if(itemExtension.Active__c){
            activeExtensionsByItem.get(itemExtension.Indicator_Item__r.DeveloperName).add(itemExtension);
        }
    }

    public static List<Indicator_Bundle__mdt> getAllActiveBundles(){
        return activeBundlesByName.values();
    }

    public static List<Indicator_Bundle__mdt> getAllBundles(){
        return bundlesByName.values();
    }

    public static List<Indicator_Item__mdt> getAllOrphanItems(){
        
        List<Indicator_Item__mdt> orphanItems = new List<Indicator_Item__mdt>();

        for(String itemName : itemsByName.keyset()){
            if(bundleItemsByItem.get(itemName) == null || bundleItemsByItem.get(itemName).isEmpty()){
                orphanItems.add(getItem(itemName));
            }
        }

        return orphanItems;
    }

    public static Indicator_Bundle__mdt getBundle(String bundleDevName){
        if(bundlesByName.containsKey(bundleDevName))
            return bundlesByName.get(bundleDevName);
        else
            return new Indicator_Bundle__mdt();
    }

    public static Indicator_Item__mdt getItem(String itemDevName){
        if(itemsByName.containsKey(itemDevName))
            return itemsByName.get(itemDevName);
        else
            return new Indicator_Item__mdt();
    }

    public static List<Indicator_Bundle_Item__mdt> getBundleItems(String bundleDevName){
        if(bundleItemsByBundle.containsKey(bundleDevname))
            return bundleItemsByBundle.get(bundleDevName);
        else 
            return new List<Indicator_Bundle_Item__mdt>();
    }

    public static List<Indicator_Item_Extension__mdt> getExtensionsForItem(String itemDevName){
        if(extensionsByItem.containsKey(itemDevName))
            return extensionsByItem.get(itemDevName);
        else
            return new List<Indicator_Item_Extension__mdt>();
    }

    // Static variables used across methods.
    public static Map<String,Indicator_Bundle__mdt> bundlesByName;
    public static Map<String,Indicator_Bundle__mdt> activeBundlesByName;
    public static Map<String,Indicator_Item__mdt> itemsByName;
    public static Map<String,Indicator_Item__mdt> activeItemsByName;
    public static Map<String,List<Indicator_Bundle_Item__mdt>> bundleItemsByBundle;
    public static Map<String,List<Indicator_Bundle_Item__mdt>> bundleItemsByItem;
    public static Map<String,List<Indicator_Item_Extension__mdt>> extensionsByItem;
    public static Map<String,List<Indicator_Item_Extension__mdt>> activeExtensionsByItem;

    // Static method run when class is called.
    static {
        // Initialize the static variables as empty.
        bundlesByName = new Map<String, Indicator_Bundle__mdt>();
        activeBundlesByName = new Map<String, Indicator_Bundle__mdt>();
        itemsByName = new Map<String, Indicator_Item__mdt>();
        activeItemsByName = new Map<String, Indicator_Item__mdt>();
        bundleItemsByBundle = new Map<String,List<Indicator_Bundle_Item__mdt>>();
        bundleItemsByItem = new Map<String,List<Indicator_Bundle_Item__mdt>>();
        extensionsByItem = new Map<String,List<Indicator_Item_Extension__mdt>>();
        activeExtensionsByItem = new Map<String,List<Indicator_Item_Extension__mdt>>();

        // When NOT running a test - initialize the static variables with data that exists in the org.
        initializeConfiguration();
        if(Test.isRunningTest()) {
            bundlesByName.clear();
            activeBundlesByName.clear();
            itemsByName.clear();
            activeItemsByName.clear();
            bundleItemsByBundle.clear();
            extensionsByItem.clear();
            activeExtensionsByItem.clear();
        }
    }
}