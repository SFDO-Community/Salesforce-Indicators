/**
 * Shared "recipe" generation logic used by both the Export action on c-key and the
 * Previewer's "export as CSV" mode (see references/json-recipe-schema.md in the
 * design-salesforce-indicator skill for the JSON shape this produces/consumes).
 *
 * Two directions:
 *  - buildRecipe(bundle, options): live wire-shaped bundle (as already fed to c-key
 *    by configurationManager/indicatorBundle) -> portable JSON recipe.
 *  - recipeToKeyBundle(recipe, options): portable JSON recipe -> the same wire shape,
 *    so a loaded recipe can be handed straight to c-key for preview.
 *
 * recipeToCsvRows(recipe, options) flattens a recipe to the four CSV row-sets
 * (bundles/items/bundleItems/extensions) matching cmdt-schema.md's inds__-prefixed
 * columns, ready for Inspector Reloaded or `sf cmdt generate records`.
 */

export const RECIPE_SCHEMA_VERSION = '1.0';

/**
 * Column order for each CSV, matching the design-salesforce-indicator skill's
 * assets/csv-templates/*.csv exactly, with one addition: a leading DeveloperName
 * column. That makes this output "Path A" shaped (Salesforce Inspector Reloaded,
 * see generation-workflow.md) — DeveloperNames here are carried straight through
 * from already-deployed records, not synthesized, so there's no sanitization step
 * to run first, unlike the skill's own CSV generation.
 *
 * NOT compatible with "Path B" (`sf cmdt generate records`) as-is: that command
 * rejects any column that isn't its designated name-column or a real field on the
 * target object, so this explicit DeveloperName column would break the run. V1 of
 * the Export/Preview workflow targets Inspector Reloaded only (see the parent plan).
 */
export const CSV_HEADERS = {
    bundles: [
        'DeveloperName', 'MasterLabel', 'inds__Active__c', 'inds__sObject__c',
        'inds__Card_Title__c', 'inds__Card_Text__c', 'inds__Card_Icon__c',
        'inds__Card_Icon_Background__c', 'inds__Card_Icon_Foreground__c', 'inds__Description__c'
    ],
    items: [
        'DeveloperName', 'MasterLabel', 'inds__Active__c', 'inds__sObject__c',
        'inds__Field__c', 'inds__Advanced_Field__c', 'inds__Advanced_Field_Label__c',
        'inds__Static_Text__c', 'inds__Icon_Value__c', 'inds__Image__c',
        'inds__Icon_Background__c', 'inds__Icon_Foreground__c', 'inds__Hover_Text__c',
        'inds__Show_False_or_Blank__c', 'inds__Inverse_Static_Text__c', 'inds__Inverse_Icon_Value__c',
        'inds__Inverse_Image__c', 'inds__Inverse_Icon_Background__c', 'inds__Inverse_Icon_Foreground__c',
        'inds__Inverse_Hover_Text__c', 'inds__Zero_Behavior__c', 'inds__Empty_Static_Text_Behavior__c',
        'inds__Display_Multiple__c', 'inds__Badge_Icon_Position__c', 'inds__Badge_Pill_Text_Color__c',
        'inds__Inverse_Badge_Icon_Position__c', 'inds__Inverse_Badge_Pill_Text_Color__c', 'inds__Description__c'
    ],
    bundleItems: [
        'DeveloperName', 'MasterLabel', 'inds__Indicator_Bundle__c', 'inds__Indicator_Item__c',
        'inds__Order__c', 'inds__Action_Type__c', 'inds__Action_Target__c',
        'inds__Action_Button_Label__c', 'inds__Action_Help_Text__c',
        'inds__Action_Confirm_Required__c', 'inds__Show_False_or_Blank_Action__c'
    ],
    extensions: [
        'DeveloperName', 'MasterLabel', 'inds__Indicator_Item__c', 'inds__Active__c',
        'inds__Contains_Text__c', 'inds__Text_Operator__c', 'inds__Minimum__c', 'inds__Maximum__c',
        'inds__Priority__c', 'inds__Static_Text__c', 'inds__Icon_Value__c', 'inds__Image__c',
        'inds__Icon_Background__c', 'inds__Icon_Foreground__c', 'inds__Hover_Text__c',
        'inds__Badge_Icon_Position__c', 'inds__Badge_Pill_Text_Color__c', 'inds__Description__c'
    ]
};

const UNBUNDLED_PSEUDO_BUNDLE = {
    IsActive: null,
    CardIcon: 'action:question_post_action',
    CardIconBackground: null,
    CardIconForeground: null,
    CardText: 'These items are not associated with any bundle.',
    CardTitle: 'Unbundled Items',
    BundleDescription: null,
    BundleId: null,
    DeveloperName: null,
    MasterLabel: null,
    ObjectApiName: null,
    ObjectName: null
};

/**
 * Turns a MasterLabel-ish string into a valid CMDT DeveloperName: collapses runs of
 * non-alphanumeric characters to a single underscore, strips a leftover trailing
 * underscore, prefixes a leading digit with "X", and truncates to Salesforce's
 * 40-character limit (trimming any underscore a truncation leaves dangling).
 * See references/generation-workflow.md for why this exact algorithm matters.
 */
export function synthesizeDeveloperName(label) {
    let name = (label ?? '').trim().replace(/[^a-zA-Z0-9]+/g, '_');
    name = name.replace(/_+$/, '');
    if (/^[0-9]/.test(name)) {
        name = 'X' + name;
    }
    if (name.length > 40) {
        name = name.substring(0, 40).replace(/_+$/, '');
    }
    return name;
}

/**
 * The one case a Bundle Item DeveloperName has to be generated rather than carried
 * through: attaching an imported item to a bundle that already exists in the
 * receiving org. Compounds both names the same way the package's own naming
 * convention does, then re-applies the 40-character rule to the combined result.
 */
export function synthesizeBundleItemDeveloperName(bundleDeveloperName, itemDeveloperName) {
    return synthesizeDeveloperName(`${bundleDeveloperName}_${itemDeveloperName}`);
}

function filterItems(items, includedDeveloperNames) {
    if (!includedDeveloperNames) return items ?? [];
    const included = new Set(includedDeveloperNames);
    return (items ?? []).filter((item) => included.has(item.DeveloperName));
}

function extensionToRecipe(ext) {
    return {
        DeveloperName: ext.DeveloperName,
        MasterLabel: ext.MasterLabel,
        IsActive: ext.IsActive,
        ContainsText: ext.ContainsText,
        TextOperator: ext.TextOperator,
        Minimum: ext.Minimum,
        Maximum: ext.Maximum,
        PriorityOrder: ext.PriorityOrder,
        ExtensionTextValue: ext.ExtensionTextValue,
        ExtensionIconValue: ext.ExtensionIconValue,
        ExtensionImageUrl: ext.ExtensionImageUrl,
        BackgroundColor: ext.BackgroundColor,
        ForegroundColor: ext.ForegroundColor,
        ExtensionHoverText: ext.ExtensionHoverText,
        BadgeIconPosition: ext.BadgeIconPosition,
        BadgeTextColor: ext.BadgePillTextColor,
        ExtensionDescription: ext.ExtensionDescription
    };
}

function itemToRecipe(item, { includeBundleItem }) {
    return {
        DeveloperName: item.DeveloperName,
        MasterLabel: item.MasterLabel,
        IsActive: item.IsActive,
        ObjectApiName: item.ObjectApiName,
        // Mutually exclusive per json-recipe-schema.md: AdvancedField present instead
        // of FieldApiName, not alongside it — item.FieldApiName holds the resolved
        // value for either branch (see itemWithSettingsInfo), so route it based on
        // which branch actually produced it.
        FieldApiName: item.AdvancedField ? null : item.FieldApiName,
        AdvancedField: item.AdvancedField || null,
        FieldLabel: item.FieldLabel,
        TextValue: item.TextValue,
        IconName: item.IconName,
        ImageUrl: item.ImageUrl,
        BackgroundColor: item.BackgroundColor,
        ForegroundColor: item.ForegroundColor,
        HoverValue: item.HoverValue,
        DisplayFalse: item.DisplayFalse,
        FalseTextValue: item.FalseTextValue,
        FalseIcon: item.FalseIcon,
        FalseImageUrl: item.FalseImageUrl,
        InverseBackgroundColor: item.InverseBackgroundColor,
        InverseForegroundColor: item.InverseForegroundColor,
        FalseHoverValue: item.FalseHoverValue,
        ZeroBehavior: item.ZeroBehavior,
        EmptyStaticBehavior: item.EmptyStaticBehavior,
        DisplayMultiple: item.DisplayMultiple,
        BadgeIconPosition: item.BadgeIconPosition,
        BadgeTextColor: item.BadgePillTextColor,
        FalseBadgeIconPosition: item.FalseBadgeIconPosition,
        FalseBadgeTextColor: item.FalseBadgePillTextColor,
        IndicatorDescription: item.IndicatorDescription,
        bundleItem: includeBundleItem
            ? {
                  SortOrder: item.SortOrder,
                  ActionType: item.ActionType,
                  ActionTarget: item.ActionTarget,
                  ActionButtonLabel: item.ActionButtonLabel,
                  ActionHelpText: item.ActionHelpText,
                  ActionConfirmRequired: item.ActionConfirmRequired,
                  DisplayFalseAction: item.DisplayFalseAction
              }
            : null,
        extensions: (item.Extensions ?? []).map(extensionToRecipe)
    };
}

/**
 * @param {Object} bundle - wire-shaped bundle as passed to c-key (real bundle, or the
 *   '-1' Unbundled Items pseudo-bundle — both have the same Items[] shape).
 * @param {Object} [options]
 * @param {string[]} [options.includedItemDeveloperNames] - limit export to these items;
 *   omit/null to include every item currently on the bundle.
 * @param {boolean} [options.excludeBundle] - export the selected items without the
 *   bundle itself (and without their bundle-item action context) even if `bundle` is
 *   a real bundle. Always effectively true when `bundle` is the pseudo-bundle.
 * @returns {Object} a recipe matching references/json-recipe-schema.md
 */
export function buildRecipe(bundle, options = {}) {
    const { includedItemDeveloperNames = null, excludeBundle = false } = options;
    const isRealBundle = !!bundle?.DeveloperName && !excludeBundle;
    const items = filterItems(bundle?.Items, includedItemDeveloperNames);

    return {
        recipeSchemaVersion: RECIPE_SCHEMA_VERSION,
        recipeType: isRealBundle ? 'bundle' : 'items',
        bundle: isRealBundle
            ? {
                  DeveloperName: bundle.DeveloperName,
                  MasterLabel: bundle.MasterLabel,
                  ObjectApiName: bundle.ObjectApiName,
                  IsActive: bundle.IsActive,
                  CardTitle: bundle.CardTitle,
                  CardText: bundle.CardText,
                  CardIcon: bundle.CardIcon,
                  CardIconBackground: bundle.CardIconBackground,
                  CardIconForeground: bundle.CardIconForeground,
                  BundleDescription: bundle.BundleDescription
              }
            : null,
        items: items.map((item) => itemToRecipe(item, { includeBundleItem: isRealBundle }))
    };
}

function extensionFromRecipe(ext) {
    return {
        ExtensionId: ext.DeveloperName,
        DeveloperName: ext.DeveloperName,
        MasterLabel: ext.MasterLabel,
        IsActive: ext.IsActive,
        ContainsText: ext.ContainsText,
        TextOperator: ext.TextOperator,
        Minimum: ext.Minimum,
        Maximum: ext.Maximum,
        PriorityOrder: ext.PriorityOrder,
        ExtensionTextValue: ext.ExtensionTextValue,
        ExtensionIconValue: ext.ExtensionIconValue,
        ExtensionImageUrl: ext.ExtensionImageUrl,
        BackgroundColor: ext.BackgroundColor,
        ForegroundColor: ext.ForegroundColor,
        ExtensionHoverText: ext.ExtensionHoverText,
        BadgeIconPosition: ext.BadgeIconPosition,
        BadgeTextColor: ext.BadgePillTextColor,
        ExtensionDescription: ext.ExtensionDescription
    };
}

function itemFromRecipe(item) {
    const bundleItem = item.bundleItem ?? {};
    return {
        IndicatorId: item.DeveloperName,
        DeveloperName: item.DeveloperName,
        MasterLabel: item.MasterLabel,
        IsActive: item.IsActive,
        ObjectApiName: item.ObjectApiName,
        // c-key/indicatorKeyRow only render one API-name value (see key.html's "Api
        // Name" display) — merge the recipe's mutually-exclusive pair back into the
        // single field the wire shape normally carries for either branch.
        FieldApiName: item.AdvancedField || item.FieldApiName,
        AdvancedField: item.AdvancedField,
        FieldLabel: item.FieldLabel,
        TextValue: item.TextValue,
        IconName: item.IconName,
        ImageUrl: item.ImageUrl,
        BackgroundColor: item.BackgroundColor,
        ForegroundColor: item.ForegroundColor,
        HoverValue: item.HoverValue,
        DisplayFalse: item.DisplayFalse,
        FalseTextValue: item.FalseTextValue,
        FalseIcon: item.FalseIcon,
        FalseImageUrl: item.FalseImageUrl,
        InverseBackgroundColor: item.InverseBackgroundColor,
        InverseForegroundColor: item.InverseForegroundColor,
        FalseHoverValue: item.FalseHoverValue,
        ZeroBehavior: item.ZeroBehavior,
        EmptyStaticBehavior: item.EmptyStaticBehavior,
        DisplayMultiple: item.DisplayMultiple,
        BadgeIconPosition: item.BadgeIconPosition,
        BadgeTextColor: item.BadgeTextColor,
        FalseBadgeIconPosition: item.FalseBadgeIconPosition,
        FalseBadgeTextColor: item.FalseBadgeTextColor,
        IndicatorDescription: item.IndicatorDescription,
        SortOrder: bundleItem.SortOrder,
        ActionType: bundleItem.ActionType,
        ActionTarget: bundleItem.ActionTarget,
        ActionButtonLabel: bundleItem.ActionButtonLabel,
        ActionHelpText: bundleItem.ActionHelpText,
        ActionConfirmRequired: bundleItem.ActionConfirmRequired,
        DisplayFalseAction: bundleItem.DisplayFalseAction,
        Extensions: (item.extensions ?? []).map(extensionFromRecipe)
    };
}

/**
 * Rebuilds the wire shape c-key expects (bundle.Items[].Extensions[]) from a parsed
 * recipe, so a loaded JSON recipe can be assigned straight to c-key's `bundle` prop
 * for preview. Record-Id slots (BundleId/IndicatorId/ExtensionId) are filled with the
 * recipe's DeveloperNames instead of real Ids — c-key only ever uses those as opaque
 * local keys (accordion state, list iteration, a suppression filter), never to build a
 * link back to a real record, so this is safe purely for rendering.
 *
 * @param {Object} recipe - a parsed recipe (see json-recipe-schema.md)
 * @returns {Object} a bundle-shaped object suitable for c-key's `bundle` prop
 */
export function recipeToKeyBundle(recipe) {
    const items = (recipe.items ?? []).map(itemFromRecipe);

    if (recipe.recipeType === 'bundle' && recipe.bundle) {
        const bundle = recipe.bundle;
        return {
            BundleId: bundle.DeveloperName,
            DeveloperName: bundle.DeveloperName,
            MasterLabel: bundle.MasterLabel,
            ObjectApiName: bundle.ObjectApiName,
            ObjectName: bundle.ObjectApiName,
            IsActive: bundle.IsActive,
            CardTitle: bundle.CardTitle,
            CardText: bundle.CardText,
            CardIcon: bundle.CardIcon,
            CardIconBackground: bundle.CardIconBackground,
            CardIconForeground: bundle.CardIconForeground,
            BundleDescription: bundle.BundleDescription,
            Items: items
        };
    }

    return { ...UNBUNDLED_PSEUDO_BUNDLE, Items: items };
}

function csvCell(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
}

/**
 * @param {string[]} headers
 * @param {Object[]} rows - plain objects keyed by header name
 * @returns {string} CSV text, header row first, with a leading UTF-8 BOM
 */
export function rowsToCsv(headers, rows) {
    const lines = [headers.join(',')];
    rows.forEach((row) => {
        lines.push(headers.map((h) => csvCell(row[h])).join(','));
    });
    // Leading BOM so Excel (and some other CSV readers) detect UTF-8 instead of
    // falling back to the system's local ANSI codepage — without it, multi-byte
    // characters like emoji in Static_Text__c/Hover_Text__c get misread as several
    // separate "odd" characters even though the file's bytes are valid UTF-8.
    return '﻿' + lines.join('\n');
}

/**
 * Flattens a recipe into the four CSV row-sets (see cmdt-schema.md for the column
 * list this mirrors). DeveloperNames from the recipe are carried straight through —
 * they're already valid, already-deployed names from the exporting org — except for
 * Bundle Item rows created by attaching an item-only recipe to an existing bundle in
 * the receiving org, which is the one case a name has to be generated fresh.
 *
 * @param {Object} recipe
 * @param {Object} [options]
 * @param {string} [options.attachToBundleDeveloperName] - for an item-only recipe
 *   (`recipeType: "items"`), the DeveloperName of an existing bundle in the receiving
 *   org to join these items to. Ignored for a `"bundle"` recipe, which already carries
 *   its own bundle + bundle-item rows.
 * @returns {{bundles: Object[], items: Object[], bundleItems: Object[], extensions: Object[]}}
 */
export function recipeToCsvRows(recipe, options = {}) {
    const { attachToBundleDeveloperName = null } = options;
    const bundles = [];
    const items = [];
    const bundleItems = [];
    const extensions = [];

    if (recipe.recipeType === 'bundle' && recipe.bundle) {
        const b = recipe.bundle;
        bundles.push({
            DeveloperName: b.DeveloperName,
            MasterLabel: b.MasterLabel,
            inds__Active__c: b.IsActive,
            inds__sObject__c: b.ObjectApiName,
            inds__Card_Title__c: b.CardTitle,
            inds__Card_Text__c: b.CardText,
            inds__Card_Icon__c: b.CardIcon,
            inds__Card_Icon_Background__c: b.CardIconBackground,
            inds__Card_Icon_Foreground__c: b.CardIconForeground,
            inds__Description__c: b.BundleDescription
        });
    }

    const targetBundleDeveloperName =
        recipe.recipeType === 'bundle' ? recipe.bundle?.DeveloperName : attachToBundleDeveloperName;

    (recipe.items ?? []).forEach((item) => {
        items.push({
            DeveloperName: item.DeveloperName,
            MasterLabel: item.MasterLabel,
            inds__Active__c: item.IsActive,
            inds__sObject__c: item.ObjectApiName,
            // FieldApiName holds the resolved value for either branch (see
            // itemWithSettingsInfo in IndicatorController.cls) — AdvancedField is the
            // discriminator, non-null only when the item used Advanced_Field__c. Route
            // to exactly one CSV column so an advanced path never lands in Field__c.
            inds__Field__c: item.AdvancedField ? null : item.FieldApiName,
            inds__Advanced_Field__c: item.AdvancedField || null,
            inds__Advanced_Field_Label__c: item.AdvancedField ? item.FieldLabel : null,
            inds__Static_Text__c: item.TextValue,
            inds__Icon_Value__c: item.IconName,
            inds__Image__c: item.ImageUrl,
            inds__Icon_Background__c: item.BackgroundColor,
            inds__Icon_Foreground__c: item.ForegroundColor,
            inds__Hover_Text__c: item.HoverValue,
            inds__Show_False_or_Blank__c: item.DisplayFalse,
            inds__Inverse_Static_Text__c: item.FalseTextValue,
            inds__Inverse_Icon_Value__c: item.FalseIcon,
            inds__Inverse_Image__c: item.FalseImageUrl,
            inds__Inverse_Icon_Background__c: item.InverseBackgroundColor,
            inds__Inverse_Icon_Foreground__c: item.InverseForegroundColor,
            inds__Inverse_Hover_Text__c: item.FalseHoverValue,
            inds__Zero_Behavior__c: item.ZeroBehavior,
            inds__Empty_Static_Text_Behavior__c: item.EmptyStaticBehavior,
            inds__Display_Multiple__c: item.DisplayMultiple,
            inds__Badge_Icon_Position__c: item.BadgeIconPosition,
            inds__Badge_Pill_Text_Color__c: item.BadgeTextColor,
            inds__Inverse_Badge_Icon_Position__c: item.FalseBadgeIconPosition,
            inds__Inverse_Badge_Pill_Text_Color__c: item.FalseBadgeTextColor,
            inds__Description__c: item.IndicatorDescription
        });

        if (targetBundleDeveloperName) {
            // Both branches synthesize the same way: even a "bundle" recipe's Bundle
            // Item DeveloperName isn't carried through (see json-recipe-schema.md —
            // it's a synthesized compound, not independently meaningful), and an
            // item-only recipe attached here is always a net-new join in the
            // receiving org either way.
            const bundleItemDeveloperName = synthesizeBundleItemDeveloperName(
                targetBundleDeveloperName,
                item.DeveloperName
            );
            const bi = item.bundleItem ?? {};
            bundleItems.push({
                DeveloperName: bundleItemDeveloperName,
                MasterLabel: `${targetBundleDeveloperName} ${item.DeveloperName}`,
                inds__Indicator_Bundle__c: targetBundleDeveloperName,
                inds__Indicator_Item__c: item.DeveloperName,
                inds__Order__c: bi.SortOrder,
                inds__Action_Type__c: bi.ActionType,
                inds__Action_Target__c: bi.ActionTarget,
                inds__Action_Button_Label__c: bi.ActionButtonLabel,
                inds__Action_Help_Text__c: bi.ActionHelpText,
                inds__Action_Confirm_Required__c: bi.ActionConfirmRequired,
                inds__Show_False_or_Blank_Action__c: bi.DisplayFalseAction
            });
        }

        (item.extensions ?? []).forEach((ext) => {
            extensions.push({
                DeveloperName: ext.DeveloperName,
                MasterLabel: ext.MasterLabel,
                inds__Indicator_Item__c: item.DeveloperName,
                inds__Active__c: ext.IsActive,
                inds__Contains_Text__c: ext.ContainsText,
                inds__Text_Operator__c: ext.TextOperator,
                inds__Minimum__c: ext.Minimum,
                inds__Maximum__c: ext.Maximum,
                inds__Priority__c: ext.PriorityOrder,
                inds__Static_Text__c: ext.ExtensionTextValue,
                inds__Icon_Value__c: ext.ExtensionIconValue,
                inds__Image__c: ext.ExtensionImageUrl,
                inds__Icon_Background__c: ext.BackgroundColor,
                inds__Icon_Foreground__c: ext.ForegroundColor,
                inds__Hover_Text__c: ext.ExtensionHoverText,
                inds__Badge_Icon_Position__c: ext.BadgeIconPosition,
                inds__Badge_Pill_Text_Color__c: ext.BadgeTextColor,
                inds__Description__c: ext.ExtensionDescription
            });
        });
    });

    return { bundles, items, bundleItems, extensions };
}
