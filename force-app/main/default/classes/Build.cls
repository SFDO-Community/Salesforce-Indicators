@isTest
public class Build {
  // * Random Values
  public static String aRandomString() {
    return aRandomString(10);
  }

  public static String aRandomString(Integer len) {
    final String chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz';
    String randStr = '';
    while (randStr.length() < len) {
       Integer idx = Math.mod(Math.abs(Crypto.getRandomInteger()), chars.length());
       randStr += chars.substring(idx, idx+1);
    }
    return randStr; 
  }

  public static Decimal aRandomNumber() {
    return ((Decimal) Math.random()).setScale(4);
  }
  public static Integer aRandomInteger() {
    return ((Integer) Math.random().intValue());
  }

  // * Indicator Bundle
  public class BundleBuilder {
    // Add withMethods here
    public BundleBuilder asInactive() {
      this.isActive = false;
      return this;
    }
    private Boolean isActive = true;

    public BundleBuilder withDevName(String devName) {
      this.devName = devName;
      return this;
    }
    private String devName = aRandomString();

    public BundleBuilder withCardIcon(String cardIcon) {
      this.cardIcon = cardIcon;
      return this;
    }
    private String cardIcon;

    public BundleBuilder withCardText(String cardText) {
      this.cardText = cardText;
      return this;
    }
    private String cardText;

    public BundleBuilder withCardTitle(String cardTitle) {
      this.cardTitle = cardTitle;
      return this;
    }
    private String cardTitle;

    public BundleBuilder withSObject(String sObjectName) {
      this.sObjectName = [
        SELECT DurableId
        FROM EntityDefinition
        WHERE QualifiedApiName = :sObjectName
      ]
      ?.DurableId;
      return this;
    }
    private String sObjectName;

    public Indicator_Bundle__mdt build() {
      return new Indicator_Bundle__mdt(
        MasterLabel = devName,
        DeveloperName = devName,
        Active__c = isActive,
        Card_Icon__c = cardIcon,
        Card_Text__c = cardText,
        Card_Title__c = cardTitle,
        sObject__c = sObjectName
      );
    }
  } // End Bundle Builder
  public static BundleBuilder aBundle() {
    return new BundleBuilder();
  }

  // * Indicator Item
  public class ItemBuilder {
    // Add withMethods here
    public ItemBuilder withDevName(String devName) {
      this.devName = devName;
      return this;
    }
    private String devName;

    public ItemBuilder asInactive() {
      this.isActive = false;
      return this;
    }
    private Boolean isActive = true;

    public ItemBuilder showIconOnly() {
      this.emptyStaticBehavior = 'Use Icon Only';
      return this;
    }
    public ItemBuilder showFieldValue() {
      this.emptyStaticBehavior = 'Use Field Value';
      return this;
    }
    private String emptyStaticBehavior;

    public ItemBuilder withSObjectAndAdvancedField(String sObjectName, String advancedField){
      this.advancedField = advancedField;
      this.sObjectName = [SELECT DurableId FROM EntityDefinition WHERE QualifiedApiName = :sObjectName]?.DurableId;
      return this;
    }
    public ItemBuilder withSObjectAndField(String sObjectName, String fieldName) {
      EntityParticle particle = [
        SELECT DurableId, EntityDefinition.DurableId
        FROM EntityParticle
        WHERE
          EntityDefinition.qualifiedApiName = :sObjectName
          AND qualifiedApiName = :fieldName
      ];
      this.field = particle.DurableId;
      this.sObjectName = particle.EntityDefinition.DurableId;
      return this;
    }
    private String field;
    private String advancedField;
    private String sObjectName;

    public ItemBuilder withHoverText(String hoverText) {
      this.hoverText = hoverText;
      return this;
    }
    private String hoverText;

    public ItemBuilder withIconValue(String iconValue) {
      this.iconValue = iconValue;
      return this;
    }
    private String iconValue;

    public ItemBuilder withImageURL(String imageUrl) {
      this.imageUrl = imageUrl;
      return this;
    }
    private String imageUrl;

    public ItemBuilder showFalseOrBlank() {
      this.showInverse = true;
      return this;
    }
    private Boolean showInverse = false;

    public ItemBuilder withInverseHoverText(String inverseHoverText) {
      this.inverseHoverText = inverseHoverText;
      return this;
    }
    private String inverseHoverText;

    public ItemBuilder withInverseIconValue(String inverseIconValue) {
      this.inverseIconValue = inverseIconValue;
      return this;
    }
    private String inverseIconValue;

    public ItemBuilder withInverseImageUrl(String inverseImageUrl) {
      this.inverseImageUrl = inverseImageUrl;
      return this;
    }
    private String inverseImageUrl;

    public ItemBuilder withInverseStaticText(String inverseStaticText) {
      this.inverseStaticText = inverseStaticText;
      return this;
    }
    private String inverseStaticText;

    public ItemBuilder withStaticText(String staticText) {
      this.staticText = staticText;
      return this;
    }
    private String staticText;

    public ItemBuilder treatZeroesAsNumbers() {
      this.zeroValueBehavior = 'Treat Zeroes as Numbers';
      return this;
    }
    public ItemBuilder treatZeroesAsBlanks() {
      this.zeroValueBehavior = 'Treat Zeroes as Blanks';
      return this;
    }
    private String zeroValueBehavior;

    public Indicator_Item__mdt build() {
      return new Indicator_Item__mdt(
        //objectApi = withVariable
        DeveloperName = devName,
        MasterLabel = devName,
        Active__c = isActive,
        Advanced_Field__c = advancedField,
        Empty_Static_Text_Behavior__c = emptyStaticBehavior,
        Field__c = field,
        Hover_Text__c = hoverText,
        Icon_Value__c = iconValue,
        Image__c = imageUrl,
        Inverse_Hover_Text__c = inverseHoverText,
        Inverse_Icon_Value__c = inverseIconValue,
        Inverse_Image__c = inverseImageUrl,
        Inverse_Static_Text__c = inverseStaticText,
        Show_False_or_Blank__c = showInverse,
        sObject__c = sObjectName,
        Static_Text__c = staticText,
        Zero_Behavior__c = zeroValueBehavior
      );
    }
  } // End Item Builder
  public static ItemBuilder anItem() {
    return new ItemBuilder();
  }

  // * Indicator Bundle Item
  public class BundleItemBuilder {
    // Add withMethods here
    public BundleItemBuilder withDevName(String devName) {
      this.devName = devName;
      return this;
    }
    private String devName = aRandomString();

    public BundleItemBuilder withBundle(Indicator_Bundle__mdt bundle) {
      this.bundle = bundle;
      return this;
    }
    private Indicator_Bundle__mdt bundle;

    public BundleItemBuilder withItem(Indicator_Item__mdt item) {
      this.item = item;
      return this;
    }
    private Indicator_Item__mdt item;

    public BundleItemBuilder withOrder(Decimal order) {
      this.order = order;
      return this;
    }
    private Decimal order;

    public Indicator_Bundle_Item__mdt build() {
      return new Indicator_Bundle_Item__mdt(
        //objectApi = withVariable
        DeveloperName = devName,
        MasterLabel = devname,
        Indicator_Bundle__r = bundle,
        Indicator_Item__r = item,
        Order__c = order
      );
    }
  } // End BundleItem Builder
  public static BundleItemBuilder aBundleItem() {
    return new BundleItemBuilder();
  }

  // * Indicator Extension
  public class ExtensionBuilder {
    // Add withMethods here
    public ExtensionBuilder withDevName(String devName) {
      this.devName = devName;
      return this;
    }
    private String devName = aRandomString();

    public ExtensionBuilder asInactive() {
      this.isActive = false;
      return this;
    }
    private Boolean isActive = true;

    public ExtensionBuilder withContainsText(String containsText) {
      this.containsText = containsText;
      return this;
    }
    private String containsText;

    public ExtensionBuilder withHoverText(String hoverText) {
      this.hoverText = hoverText;
      return this;
    }
    private String hoverText;

    public ExtensionBuilder withIconValue(String iconValue) {
      this.iconValue = iconValue;
      return this;
    }
    private String iconValue;

    public ExtensionBuilder withImageUrl(String imageUrl) {
      this.imageUrl = imageUrl;
      return this;
    }
    private String imageUrl;

    public ExtensionBuilder withItem(Indicator_Item__mdt item) {
      this.item = item;
      return this;
    }
    private Indicator_Item__mdt item;

    public ExtensionBuilder withMaximum(Decimal maximum) {
      this.maximum = maximum;
      return this;
    }
    private Decimal maximum;

    public ExtensionBuilder withMinimum(Decimal minimum) {
      this.minimum = minimum;
      return this;
    }
    private Decimal minimum;

    public ExtensionBuilder withPriority(Decimal priority) {
      this.priority = priority;
      return this;
    }
    private Decimal priority;

    public ExtensionBuilder withStaticText(String staticText) {
      this.staticText = staticText;
      return this;
    }
    private String staticText;
    public Indicator_Item_Extension__mdt build() {
      return new Indicator_Item_Extension__mdt(
        //objectApi = withVariable
        DeveloperName = devName,
        MasterLabel = devName,
        Active__c = isActive,
        Contains_Text__c = containsText,
        Hover_Text__c = hoverText,
        Icon_Value__c = iconValue,
        Image__c = imageUrl,
        Indicator_Item__r = item,
        Maximum__c = maximum,
        Minimum__c = minimum,
        Priority__c = priority,
        Static_Text__c = staticText
      );
    }
  } // End Extension Builder
  public static ExtensionBuilder anExtension() {
    return new ExtensionBuilder();
  }
}
