"""Build the regression CMDT CSVs from the planning tables.

    regression/planning/indicators.csv + extensions.csv  ->  regression/data/{bundles,items,bundle_items,extensions}.csv
                                                             regression/data/prod_only/{items,bundle_items,extensions}.csv

The planning CSVs are the maintained source of truth (edit them in Excel); regression/data/*.csv is build
output that `sf cmdt generate records --name-column MasterLabel` turns into regression/customMetadata.
Records that cannot deploy to an org with the newer validation rules (planning `env` = prod-only: an item or an
extension that fails on its own, plus the bundle items that point at such an item) are written to data/prod_only/
instead, so a dev deploy can skip them. Bundles always stay in the base set.
Re-running OVERWRITES regression/data/*.csv, so it refuses to run when they exist unless --force is given.
Use --out DIR to write somewhere else (e.g. to compare against the current files).
"""
import csv, re, os, sys, collections
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PLAN = ROOT / "regression" / "planning"
OUT = Path(sys.argv[sys.argv.index("--out") + 1]) if "--out" in sys.argv else ROOT / "regression" / "data"
OUT.mkdir(parents=True, exist_ok=True)
if any((OUT / n).exists() for n in ("bundles.csv", "items.csv", "bundle_items.csv", "extensions.csv")) and "--force" not in sys.argv:
    sys.exit("regression/data/*.csv already exist and may hold hand edits. Re-run with --force to overwrite.")

items = list(csv.DictReader(open(PLAN / "indicators.csv", encoding="utf-8-sig")))
exts = list(csv.DictReader(open(PLAN / "extensions.csv", encoding="utf-8-sig")))

# --- bundle codes/labels (MasterLabel -> DeveloperName must stay <= 40 chars) ---
BUNDLES = {
 "B01 Any Value content (Account)": ("RB01","RB01_AnyValue_Acct"),
 "B02 Missing content (Account)": ("RB02a","RB02a_Missing_Acct"),
 "B02 Missing content (Contact)": ("RB02c","RB02c_Missing_Cont"),
 "B03 Value-Rule content (Account)": ("RB03","RB03_ValueRule_Acct"),
 "B04 Zero handling (Account)": ("RB04","RB04_Zero_Acct"),
 "B05 Empty Static Text (Account)": ("RB05a","RB05a_EmptyStatic_Acct"),
 "B05 Empty Static Text (Contact)": ("RB05c","RB05c_EmptyStatic_Cont"),
 "B06 Numeric rules (Account)": ("RB06","RB06_NumericRules_Acct"),
 "B07 Text rules (Account)": ("RB07","RB07_TextRules_Acct"),
 "B08 Multiple and Priority (Account)": ("RB08","RB08_MultiPriority_Acct"),
 "B09 Level combos: Text (Account)": ("RB09","RB09_ComboText_Acct"),
 "B10 Level combos: Number (Account)": ("RB10","RB10_ComboNumber_Acct"),
 "B11 Level combos: Checkbox (Contact)": ("RB11","RB11_ComboCheckbox_Cont"),
 "B12 Bundle and Item level (Account)": ("RB12a","RB12a_ItemLevel_Acct"),
 "B12 Bundle and Item level (Contact)": ("RB12c","RB12c_ItemLevel_Cont"),
 "B13a Known Issues: text rule on number (Account)": ("RB13a","RB13a_Known_TextOnNum_Acct"),
 "B13b Known Issues: text rule on checkbox (Contact)": ("RB13b","RB13b_Known_TextOnChk_Cont"),
 "B13c Known Issues: other (Account)": ("RB13c","RB13c_Known_Other_Acct"),
}
def dev(label):
    s = re.sub(r"[^A-Za-z0-9]+", "_", label).strip("_")
    return ("X" + s) if s[0].isdigit() else s

# --- content tokens -> concrete values ---
IMG_OK  = "https://login.salesforce.com/logos/Custom/Building_Grey/logo.png"
IMG_BAD = "https://login.salesforce.com/logos/Custom/DoesNotExist_Regression/logo.png"
CUSTOM = ("#B34A00", "#FFFFFF")
SIG_BG = {"D": "#0176D3", "M": "#BA0517", "V": "#2E844A"}
ICON = {"D": "standard:approval", "M": "standard:incident"}
VICON = ["standard:task", "standard:lead", "standard:opportunity"]
TEXT = {"D": "DEF", "M": "MIS"}
VTEXT = ["R1", "R2", "R3"]
HOVER = {"D": "Hover D", "M": "Hover M"}
VHOVER = ["Hover R1", "Hover R2", "Hover R3"]

def content(tokens, colors, level, k=0):
    """Return {hover,text,icon,image,bg,fg} for a content string at a level (D, M, or V with rule index k)."""
    t = set(re.split(r"[+|]", tokens)) if tokens else set()
    icon = (VICON[k] if level == "V" else ICON[level])
    txt = (VTEXT[k] if level == "V" else TEXT[level])
    hov = (VHOVER[k] if level == "V" else HOVER[level])
    r = dict(hover="", text="", icon="", image="", bg="", fg="")
    if "hover" in t: r["hover"] = hov
    if "text" in t: r["text"] = txt
    if "icon" in t: r["icon"] = icon
    if "img-valid" in t: r["image"] = IMG_OK
    if "img-bad" in t: r["image"] = IMG_BAD
    if "sig-D" in t or "sig-M" in t or "sig-V" in t:
        lv = "V" if "sig-V" in t else ("M" if "sig-M" in t else "D")
        r["icon"] = ICON.get(lv, VICON[0]); r["bg"], r["fg"] = SIG_BG[lv], "#FFFFFF"
    if colors == "custom" or "custom colors" in t: r["bg"], r["fg"] = CUSTOM
    return r

by_item = collections.defaultdict(list)
for e in exts: by_item[e["item_id"]].append(e)

item_rows, ext_rows, bundle_items = [], [], []
seen = set()
for it in items:
    lab = it["item_id"]
    assert dev(lab) not in seen, lab; seen.add(dev(lab))
    d = content(it["default_content"], it["default_colors"], "D")
    m = content(it["missing_content"], it["missing_colors"], "M")
    adv = it["field_slot"] == "ADV-1"
    item_rows.append({
        "Active__c": "false" if lab == "G-inactive" else "true",
        "Advanced_Field__c": it["field_api"] if adv else "",
        "Advanced_Field_Label__c": "Parent Account Number" if adv else "",
        "Description__c": it["verifies"],
        "Display_Multiple__c": "true" if it["display_multiple"] == "Y" else "false",
        "Empty_Static_Text_Behavior__c": it["empty_static_behavior"],
        "Field__c": "" if adv else it["field_api"],
        "Hover_Text__c": d["hover"], "Icon_Background__c": d["bg"], "Icon_Foreground__c": d["fg"],
        "Icon_Value__c": d["icon"], "Image__c": d["image"], "Static_Text__c": d["text"],
        "Inverse_Hover_Text__c": m["hover"], "Inverse_Icon_Background__c": m["bg"], "Inverse_Icon_Foreground__c": m["fg"],
        "Inverse_Icon_Value__c": m["icon"], "Inverse_Image__c": m["image"], "Inverse_Static_Text__c": m["text"],
        "MasterLabel": lab,
        "Show_False_or_Blank__c": "true" if it["show_missing"] == "Y" else "false",
        "sObject__c": it["sobject"],
        "Zero_Behavior__c": it["zero_behavior"],
    })
    for k, e in enumerate(by_item.get(lab, [])):
        c = content(e["content"], "", "V", k)
        lbl = e["ext_id"]
        assert len(dev(lbl)) <= 40, lbl
        ext_rows.append({
            "Active__c": "true" if e["active"] == "Y" else "false",
            "Contains_Text__c": e["text"], "Description__c": f'{it["verifies"]} (rule {k+1})',
            "Hover_Text__c": c["hover"], "Icon_Background__c": c["bg"], "Icon_Foreground__c": c["fg"],
            "Icon_Value__c": c["icon"], "Image__c": c["image"], "Indicator_Item__c": dev(lab),
            "MasterLabel": lbl, "Maximum__c": e["max"], "Minimum__c": e["min"],
            "Priority__c": e["priority"], "Static_Text__c": c["text"], "Text_Operator__c": e["operator"],
        })

bundle_rows = []
orders = collections.Counter()
for b, (code, label) in BUNDLES.items():
    assert len(dev(label)) <= 40, label
    members = [i for i in items if i["bundle"] == b]
    assert members, b
    bundle_rows.append({"Active__c": "true", "Card_Icon__c": "", "Card_Text__c": "", "Card_Title__c": b,
        "Description__c": f"Regression bundle {b}", "MasterLabel": label, "sObject__c": members[0]["sobject"]})
    for n, i in enumerate(members, 1):
        bl = f'{code}_{i["item_id"]}'
        assert len(dev(bl)) <= 40, bl
        bundle_items.append({"Indicator_Bundle__c": dev(label), "Indicator_Item__c": dev(i["item_id"]),
                             "MasterLabel": bl, "Order__c": str(n)})
# inactive-bundle case: reuses an existing Account item
bundle_rows.append({"Active__c": "false", "Card_Icon__c": "", "Card_Text__c": "", "Card_Title__c": "B12 Inactive bundle (Account)",
    "Description__c": "Inactive bundle must not render", "MasterLabel": "RB12x_Inactive_Acct", "sObject__c": "Account"})
bundle_items.append({"Indicator_Bundle__c": "RB12x_Inactive_Acct", "Indicator_Item__c": "G_samefield_1",
                     "MasterLabel": "RB12x_G_samefield_1", "Order__c": "1"})

def write(name, rows):
    with open(OUT / name, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()), quoting=csv.QUOTE_ALL, lineterminator="\n")
        w.writeheader(); w.writerows(rows)
prod_items = {dev(i["item_id"]) for i in items if i["env"] == "prod-only"}
prod_exts = {dev(e["ext_id"]) for e in exts if e["env"] == "prod-only"}
is_prod = {"items": lambda r: dev(r["MasterLabel"]) in prod_items,
           "bundle_items": lambda r: r["Indicator_Item__c"] in prod_items,
           "extensions": lambda r: dev(r["MasterLabel"]) in prod_exts}
def split(rows, kind):
    return [r for r in rows if not is_prod[kind](r)], [r for r in rows if is_prod[kind](r)]
write("bundles.csv", bundle_rows)
(OUT / "prod_only").mkdir(exist_ok=True)
for kind, rows in (("items", item_rows), ("bundle_items", bundle_items), ("extensions", ext_rows)):
    base, prod = split(rows, kind)
    write(f"{kind}.csv", base)
    with open(OUT / "prod_only" / f"{kind}.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()), quoting=csv.QUOTE_ALL, lineterminator="\n")
        w.writeheader(); w.writerows(prod)
    print(f"{kind}: {len(base)} base + {len(prod)} prod_only")
print(len(bundle_rows), "bundles")
