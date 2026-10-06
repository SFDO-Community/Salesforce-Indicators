#!/usr/bin/env python3
"""Build sf-cmdt-generate-ready CSVs for the dev-only FEATURE tests.

Reads   regression/planning/features/{bundles,items,extensions}.csv   (hand-editable, literal values)
Writes  regression/data/dev_only/{bundles,items,bundle_items,extensions}.csv

Unlike build_cmdt_csvs.py (token-driven, 135 systematically generated items), the feature rows carry the
exact values to deploy -- a merge token string, a button label, an icon position -- so this is a plain
column-rename pass with no content expansion. Everything here is env=dev-only: these records use fields
(Badge/Pill text, action fields) and syntax ({!Field} tokens) that do not exist in the released package,
so they must never be deployed to regression_prod.

Refuses to overwrite existing outputs without --force (same rule as the other build scripts).

Then generate the XML (see regression/README.md, "The dev_only records"):
    sf cmdt generate records --output-directory regression/dev_only/customMetadata --type-name <Type> \
        --csv regression/data/dev_only/<file>.csv --name-column MasterLabel
    python regression/scripts/namespace_cmdt_records.py regression/dev_only/customMetadata --cci
"""
import csv
import sys
from pathlib import Path

REG = Path(__file__).resolve().parent.parent
PLAN = REG / "planning" / "features"
OUT = REG / "data" / "dev_only"
FORCE = "--force" in sys.argv


def read(name):
    with open(PLAN / name, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write(name, rows):
    path = OUT / name
    if path.exists() and not FORCE:
        sys.exit(f"{path} exists; pass --force to overwrite")
    cols = sorted({c for r in rows for c in r})
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols, quoting=csv.QUOTE_ALL)
        w.writeheader()
        w.writerows({c: r.get(c, "") for c in cols} for r in rows)
    print(f"{name}: {len(rows)} rows")


def label(s):
    """The MasterLabel sf cmdt turns into a DeveloperName (kept underscore-only so relationships match)."""
    return s


def check(rows, what):
    bad = [r for r in rows if r.get("env") != "dev-only"]
    if bad:
        sys.exit(f"{what}: every feature row must be env=dev-only")


def main():
    bundles, items, exts = read("bundles.csv"), read("items.csv"), read("extensions.csv")
    for rows, what in ((bundles, "bundles"), (items, "items"), (exts, "extensions")):
        check(rows, what)
    OUT.mkdir(parents=True, exist_ok=True)

    write("bundles.csv", [{
        "Active__c": "true", "Card_Icon__c": "standard:trailhead", "Card_Text__c": b["description"],
        "Card_Title__c": b["title"], "Description__c": b["description"],
        "MasterLabel": b["bundle_id"], "sObject__c": b["sobject"],
    } for b in bundles])

    write("items.csv", [{
        "Active__c": "true", "Description__c": i["verifies"],
        "Display_Multiple__c": i["display_multiple"] or "false",
        "Empty_Static_Text_Behavior__c": i["empty_static"] or "Use Icon Only",
        "Field__c": i["field_api"], "Hover_Text__c": i["hover"],
        "Icon_Background__c": i["bg"], "Icon_Foreground__c": i["fg"],
        "Icon_Value__c": i["icon"], "Image__c": i["image"], "Static_Text__c": i["static_text"],
        "Badge_Pill_Text__c": i["badge_text"], "Badge_Pill_Text_Color__c": i["badge_color"],
        "Badge_Icon_Position__c": i["badge_pos"],
        "Inverse_Hover_Text__c": i["inv_hover"], "Inverse_Icon_Background__c": i["inv_bg"],
        "Inverse_Icon_Foreground__c": i["inv_fg"], "Inverse_Icon_Value__c": i["inv_icon"],
        "Inverse_Static_Text__c": i["inv_static"],
        "Inverse_Badge_Pill_Text__c": i["inv_badge_text"],
        "Inverse_Badge_Pill_Text_Color__c": i["inv_badge_color"],
        "Inverse_Badge_Icon_Position__c": i["inv_badge_pos"],
        "MasterLabel": i["item_id"], "Show_False_or_Blank__c": i["show_missing"] or "false",
        "sObject__c": i["sobject"], "Zero_Behavior__c": i["zero_behavior"],
    } for i in items])

    # An item can sit in more than one bundle: `extra_bundles` (semicolon-separated) adds plain bundle items
    # (no action config, order = next free slot) so the same item definition is exercised under a different
    # page-level setting (e.g. RF17 reuses F15_05/F15_06 with showFieldValueAsHoverFallback=true).
    bundle_items = [{
        "Indicator_Bundle__c": i["bundle"], "Indicator_Item__c": i["item_id"],
        "MasterLabel": f'{i["bundle"].split("_")[0]}_{i["item_id"]}', "Order__c": i["order"],
        "Action_Type__c": i["action_type"], "Action_Target__c": i["action_target"],
        "Action_Button_Label__c": i["action_label"], "Action_Help_Text__c": i["action_help"],
        "Action_Confirm_Required__c": i["action_confirm"] or "false",
        "Show_False_or_Blank_Action__c": i["action_false"] or "false",
    } for i in items]
    next_order = {}
    for i in items:
        for extra in filter(None, (i.get("extra_bundles") or "").split(";")):
            next_order[extra] = next_order.get(extra, 0) + 1
            bundle_items.append({
                "Indicator_Bundle__c": extra, "Indicator_Item__c": i["item_id"],
                "MasterLabel": f'{extra.split("_")[0]}_{i["item_id"]}', "Order__c": str(next_order[extra]),
                "Action_Confirm_Required__c": "false", "Show_False_or_Blank_Action__c": "false",
            })
    write("bundle_items.csv", bundle_items)

    write("extensions.csv", [{
        "Active__c": "true", "Contains_Text__c": e["text"], "Description__c": f'Feature test extension {e["ext_id"]}',
        "Hover_Text__c": e["hover"], "Icon_Background__c": e["bg"], "Icon_Foreground__c": e["fg"],
        "Icon_Value__c": e["icon"], "Image__c": e["image"], "Indicator_Item__c": e["item_id"],
        "MasterLabel": e["ext_id"], "Maximum__c": e["max"], "Minimum__c": e["min"],
        "Priority__c": e["priority"], "Static_Text__c": e["static_text"], "Text_Operator__c": e["operator"],
        "Badge_Pill_Text__c": e["badge_text"], "Badge_Pill_Text_Color__c": e["badge_color"],
        "Badge_Icon_Position__c": e["badge_pos"],
    } for e in exts])


if __name__ == "__main__":
    main()
