"""Seed the regression planning tables (the "what do we test" matrix).

Writes regression/planning/{indicators,extensions,records_account,records_contact}.csv from the group
definitions below (A-G, K). This is the *origin* of the planning CSVs: it records why each item exists
and how the groups derive from the CMDT configuration axes. To cover a new configuration field, add
rows or a group here (or edit the CSVs directly), then run build_cmdt_csvs.py to turn them into CMDT CSVs.

Once maintainers hand-edit the planning CSVs, this script is no longer authoritative, so it refuses to
run when its outputs exist unless --force is given.
"""
import csv, collections, os, sys
from pathlib import Path

OUT = str(Path(__file__).resolve().parents[2] / "regression" / "planning") + "/"
os.makedirs(OUT, exist_ok=True)
_outputs = ["indicators.csv", "extensions.csv", "records_account.csv", "records_contact.csv"]
if any(os.path.exists(OUT + n) for n in _outputs) and "--force" not in sys.argv:
    sys.exit("regression/planning/*.csv already exist and may hold hand edits. Re-run with --force to overwrite.")
IC = ["item_id","bundle","group","levels","field_slot","sobject","field_api","field_type","default_content","default_colors",
      "zero_behavior","empty_static_behavior","show_missing","missing_content","missing_colors",
      "display_multiple","extension_count","env","verifies","states_needed"]
EC = ["ext_id","item_id","rule","min","max","operator","text","priority","active","content","env","notes"]
items, exts = [], []
BOTH, PROD = "both", "prod-only"

def item(id, bundle, group, levels, slot, ftype, dc="", dcol="", zero="", ess="", show="", mc="", mcol="",
         dm="", env=BOTH, verifies="", states=""):
    # dev validation: blank static text requires an Empty Static Text Behavior
    if not ess and "text" not in dc.split("+"):
        ess = "Use Icon Only"
    items.append(dict(item_id=id, bundle=bundle, group=group, levels=levels, field_slot=slot, field_type=ftype,
        default_content=dc, default_colors=dcol, zero_behavior=zero, empty_static_behavior=ess, show_missing=show,
        missing_content=mc, missing_colors=mcol, display_multiple=dm, extension_count=0, env=env,
        verifies=verifies, states_needed=states))
    return id

def ext(item_id, rule, mn="", mx="", op="", text="", pri="", active="Y", content="icon", env=BOTH, notes=""):
    n = sum(1 for e in exts if e["item_id"] == item_id) + 1
    exts.append(dict(ext_id=f"{item_id}-X{n}", item_id=item_id, rule=rule, min=mn, max=mx, operator=op, text=text,
                     priority=pri, active=active, content=content, env=env, notes=notes))
    for i in items:
        if i["item_id"] == item_id:
            i["extension_count"] += 1

PROFILES = [
 ("icon","icon","",BOTH,"Icon renders"),
 ("text","text","",BOTH,"Initials render"),
 ("icon-text","icon+text","",BOTH,"Initials win over icon"),
 ("img-icon","img-valid+icon","",BOTH,"Image wins"),
 ("img-icon-text","img-valid+icon+text","",BOTH,"Image wins over text and icon"),
 ("badimg-icon-text","img-bad+icon+text","",BOTH,"Broken image falls back to initials on icon background"),
 ("badimg-icon","img-bad+icon","",BOTH,"Broken image falls back to icon"),
 ("hover-only","hover","",BOTH,"How hover-only renders (avatar or nothing)"),
 ("icon-colors","icon","custom",BOTH,"Custom background/foreground"),
 ("text-colors","text","custom",BOTH,"Custom colors on initials"),
 ("icon-hover","icon+hover","",BOTH,"Icon with hover; hover popover shot"),
 ("img-hover","img-valid+icon+hover","",BOTH,"Image with hover; hover popover shot"),
 ("img-only","img-valid","",PROD,"Image with no fallback icon (dev validation blocks)"),
 ("badimg-only","img-bad","",PROD,"Broken image with no fallback icon (dev validation blocks)"),
]

# A: Any Value only
item("A00","B01 Any Value content","A","D","TXT-1","Text",verifies="Nothing configured: no fallback, nothing renders",states="value; null")
for s,c,col,env,v in PROFILES:
    item(f"A-{s}","B01 Any Value content","A","D","TXT-1","Text",dc=c,dcol=col,env=env,verifies=v,states="value; null")

# B: Missing only
item("B00","B02 Missing content","B","M","CHK-1","Checkbox",show="Y",verifies="Show=Y but nothing configured: nothing renders",states="true; false")
item("B-off","B02 Missing content","B","M","CHK-1","Checkbox",show="",mc="icon+text",verifies="Content populated but Show unchecked: nothing renders",states="true; false")
for s,c,col,env,v in PROFILES:
    item(f"B-{s}","B02 Missing content","B","M","CHK-1","Checkbox",show="Y",mc=c,mcol=col,env=env,verifies=v+" (Missing)",states="true; false")
item("B-text-field","B02 Missing content","B","M","TXT-1","Text",show="Y",mc="icon",verifies="Missing fires for null text",states="null; value")

# C: Value-Rule only
i = item("C00","B03 Value-Rule content","C","V","TXT-1","Text",verifies="Rule matched but extension content blank",states="rule-match; null")
ext(i,"text",op="Contains",text="alp",content="")
for s,c,col,env,v in PROFILES:
    i = item(f"C-{s}","B03 Value-Rule content","C","V","TXT-1","Text",env=env,verifies=v+" (Extension)",states="rule-match; no-match; null")
    ext(i,"text",op="Contains",text="alp",content=c+("|custom colors" if col else ""),env=env)

# D: Zero behavior
for z in ["","Treat Zeroes as Numbers","Treat Zeroes as Blanks"]:
    zc = z.split()[-1] if z else "Unset"
    for lv,dc,mc,show in [("D","icon","",""),("M","","icon","Y"),("DM","icon","icon","Y")]:
        item(f"D-zero-{zc}-{lv}","B04 Zero handling","D",lv,"NUM-1","Number",dc=dc,zero=z,show=show,mc=mc,
             verifies=f"Zero setting {zc} with level {lv}",states="null; 0; positive")

# D: Empty static text behavior
for slot,ft in [("TXT-1","Text"),("NUM-1","Number"),("CHK-1","Checkbox")]:
    for st in ["blank","pop"]:
        for beh in ["","Use Icon Only","Use Field Value"]:
            b = beh or "Unset"
            env = BOTH   # a blank behavior deploys as the picklist default, so dev validation passes
            item(f"D-est-{ft}-{st}-{b.replace(' ','')}","B05 Empty Static Text","D","D",slot,ft,
                 dc="icon"+("+text" if st=="pop" else ""),ess=beh or "",env=env,
                 verifies=f"{ft}, static text {st}, behavior {b}"+(" (blank deploys as the default Use Icon Only)" if not beh else ""),
                 states="value; null")
# item() forces Use Icon Only when ess blank and no text; undo for the deliberate Unset rows
for r in items:
    if r["item_id"].startswith("D-est-") and r["item_id"].endswith("-Unset"):
        r["empty_static_behavior"] = ""

# E: numeric rules
def num(id,verifies,rules,env=BOTH):
    i = item(id,"B06 Numeric rules","E","V","NUM-1","Number",env=env,verifies=verifies,
             states="-5; 0; 5; 10; 15; 20; 25; null")
    for r in rules:
        ext(i,"numeric",mn=r[0],mx=r[1],content=r[2] if len(r)>2 else "icon",env=env)
num("E-num-min","Minimum only (>=)",[("10","")])
num("E-num-max","Maximum only never matches (dev requires Minimum)",[("","10")],env=PROD)
num("E-num-range","Min inclusive, max exclusive",[("10","20")])
num("E-num-min0","Minimum of 0 is honored",[("0","10")])
num("E-num-neg","Negative range",[("-10","0")])
num("E-num-adjacent","Adjacent ranges: boundary value lands in second",[("0","10","icon"),("10","20","text")])
num("E-num-open","Bounded plus open-ended",[("0","10","icon"),("10","","text")])
i = item("E-cur-decimal","B06 Numeric rules","E","V","CUR-1","Currency",verifies="Decimal boundaries",states="99.99; 100.00; 100.01; 200.50; null")
ext(i,"numeric",mn="100.00",mx="200.50")

# E: text rules
def txt(id,verifies,rules,slot="TXT-2",ft="Text",env=BOTH,states="Alpha; ALPHA; alphabet; Beta; xyz; null"):
    i = item(id,"B07 Text rules","E","V",slot,ft,env=env,verifies=verifies,states=states)
    for r in rules:
        ext(i,"text",op=r[0],text=r[1],env=env)
txt("E-txt-equals","Equals",[("Equals","alpha")])
txt("E-txt-dne","Does Not Equal (null excluded: rules need a value)",[("Does Not Equal","alpha")])
txt("E-txt-contains","Contains",[("Contains","lph")])
txt("E-txt-starts","Starts With",[("Starts With","alp")])
txt("E-txt-case","Case-insensitive: rule configured upper-case",[("Equals","ALPHA")])
txt("E-txt-blankop","Blank operator behaves as Contains (dev validation blocks)",[("","lph")],env=PROD)
txt("E-pck-equals","Picklist Equals",[("Equals","Hot")],slot="PCK-1",ft="Picklist",states="Hot; Warm; Cold; null")
txt("E-pck-contains","Picklist Contains",[("Contains","ol")],slot="PCK-1",ft="Picklist",states="Hot; Warm; Cold; null")
i = item("E-txt-both","B07 Text rules","E","V","TXT-2","Text",verifies="Text rule wins when numeric also set (documented behavior)",states="Alpha; Beta; null")
ext(i,"text+numeric",mn="0",mx="10",op="Equals",text="alpha")
i = item("E-num-on-text","B07 Text rules","E","V","TXT-2","Text",env=PROD,verifies="Numeric rule on text field (dev validation blocks)",states="Alpha; null")
ext(i,"numeric",mn="0",mx="10",env=PROD)
i = item("E-norule","B07 Text rules","E","V","TXT-2","Text",env=PROD,verifies="Extension with no criteria matches nothing (dev validation blocks)",states="Alpha; null")
ext(i,"none",env=PROD)

# E: multiple / priority / inactive
def mult(id,verifies,dm,rules,dc="",mc="",show=""):
    lv = "V"+("D" if dc else "")+("M" if mc else "")
    i = item(id,"B08 Multiple and Priority","E",lv,"NUM-1","Number",dc=dc,dm=dm,mc=mc,show=show,verifies=verifies,states="5; 15; 25; null")
    for r in rules:
        ext(i,"numeric",mn=r[0],mx=r[1],content=r[2],pri=r[3] if len(r)>3 else "",active=r[4] if len(r)>4 else "Y")
mult("E-m-off-one","Multiple off, one match","",[("10","20","icon")])
mult("E-m-off-two","Multiple off, two overlapping matches, no priority (prod: last wins)","",[("0","30","icon"),("10","20","text")])
mult("E-m-off-pri","Multiple off, overlapping with Priority (dev: lowest priority wins; prod differs)","",[("0","30","icon","5"),("10","20","text","1")])
mult("E-m-on-two","Multiple on, two matches","Y",[("0","30","icon"),("10","20","text")])
mult("E-m-on-three","Multiple on, three matches","Y",[("0","30","icon"),("10","20","text"),("10","20","icon+text")])
mult("E-m-on-none","Multiple on, no match, no Default: nothing","Y",[("100","200","icon")])
mult("E-m-on-none-def","Multiple on, no match, Default falls back","Y",[("100","200","icon")],dc="icon+text")
mult("E-m-off-none-def","Multiple off, no match, Default falls back","",[("100","200","icon")],dc="icon+text")
mult("E-m-on-null","Multiple on, null value shows Missing","Y",[("0","30","icon")],mc="icon",show="Y")
mult("E-inactive","Inactive extension is ignored","",[("0","30","icon","","N")])

# F: level combos with distinct signatures
COMBOS = ["D","M","V","DM","DV","MV","DMV"]
def combo(slot,ft,combos,bundle,states,zero=""):
    for c in combos:
        i = item(f"F-{ft[:3].lower()}-{c}{'-zero' if zero else ''}",bundle,"F",c,slot,ft,
             dc="sig-D" if "D" in c else "",show="Y" if "M" in c else "",mc="sig-M" if "M" in c else "",zero=zero,
             verifies=f"Levels {c}: distinct signature per level shows which fired"+(", zero as blank" if zero else ""),states=states)
        if "V" in c:
            kw = dict(op="Equals",text="gold") if ft=="Text" else dict(mn="10",mx="20")
            ext(i,"text" if ft=="Text" else "numeric",content="sig-V",**kw)
combo("TXT-1","Text",COMBOS,"B09 Level combos: Text","null; Gold; Silver; other")
combo("NUM-1","Number",COMBOS,"B10 Level combos: Number","null; 0; 15; other")
combo("NUM-1","Number",[c for c in COMBOS if "M" in c],"B10 Level combos: Number","null; 0; 15; other",zero="Treat Zeroes as Blanks")
combo("CHK-1","Checkbox",[c for c in COMBOS if "V" not in c],"B11 Level combos: Checkbox","true; false")

# G: bundle and item level
item("G-inactive","B12 Bundle and Item level","G","D","TXT-1","Text",dc="icon",verifies="Inactive item is not rendered",states="value")
item("G-samefield-1","B12 Bundle and Item level","G","D","TXT-1","Text",dc="icon",verifies="Two items on one field, both render",states="value")
item("G-samefield-2","B12 Bundle and Item level","G","D","TXT-1","Text",dc="text",verifies="Two items on one field, both render",states="value")
item("G-adv-valid","B12 Bundle and Item level","G","D","ADV-1","Advanced Field",dc="icon",verifies="Parent path resolves",states="parent populated; parent blank")
item("G-adv-blank","B12 Bundle and Item level","G","M","ADV-1","Advanced Field",show="Y",mc="icon",verifies="Parent blank triggers Missing",states="parent populated; parent blank")
i = item("G-adv-rule","B12 Bundle and Item level","G","V","ADV-1","Advanced Field",verifies="Value-Rule over parent path",states="parent match; no match; blank")
ext(i,"text",op="Equals",text="gold")

# K: known issues, isolated so a crash cannot blank other baselines
i = item("K-txtrule-num","B13 Known Issues","K","V","NUM-1","Number",verifies="KNOWN: text rule on number field throws and blanks the bundle",states="5; null")
ext(i,"text+numeric",mn="0",mx="10",op="Equals",text="5")
i = item("K-txtrule-chk","B13 Known Issues","K","V","CHK-1","Checkbox",verifies="KNOWN: text rule on checkbox field throws and blanks the bundle",states="true; false")
ext(i,"text",op="Contains",text="t")
item("K-zero-static","B13 Known Issues","K","D","NUM-1","Number",dc="text",zero="Treat Zeroes as Numbers",verifies="KNOWN: static text with value 0 shows 0",states="0; 5")
i = item("K-ext-est-icon","B13 Known Issues","K","V","TXT-1","Text",ess="Use Icon Only",verifies="KNOWN GAP: Empty Static Text Behavior not applied to extensions",states="rule-match")
ext(i,"text",op="Contains",text="alp",content="icon")
i = item("K-ext-est-value","B13 Known Issues","K","V","TXT-1","Text",ess="Use Field Value",verifies="KNOWN GAP: Use Field Value ignored by extensions (shows no text)",states="rule-match")
ext(i,"text",op="Contains",text="alp",content="icon")


SLOTS = {"TXT-1":("Account","AccountNumber"),"TXT-2":("Account","TickerSymbol"),"PCK-1":("Account","Rating"),
         "NUM-1":("Account","NumberOfEmployees"),"CUR-1":("Account","AnnualRevenue"),
         "CHK-1":("Contact","DoNotCall"),"ADV-1":("Contact","Account.AccountNumber")}
OVERRIDE = {"K-txtrule-num":"B13a Known Issues: text rule on number","K-txtrule-chk":"B13b Known Issues: text rule on checkbox"}
for r in items:
    r["sobject"], r["field_api"] = SLOTS[r["field_slot"]]
    if r["item_id"] in OVERRIDE: r["bundle"] = OVERRIDE[r["item_id"]]
    elif r["bundle"].startswith("B13"): r["bundle"] = "B13c Known Issues: other"
    r["bundle"] = f'{r["bundle"]} ({r["sobject"]})'

# env flags from a real deploy to the validation-rule org (2026-09-21), overriding the earlier guesses:
#   items that fail on their own:      image (valid or broken) with no fallback icon
#   extensions that fail on their own: same icon rule, no criteria, operator/text mismatch, text+numeric together
# Everything else deployed cleanly (e.g. Maximum-only and numeric-rule-on-text-field are NOT blocked).
ITEM_PROD = {"A-img-only", "A-badimg-only", "B-img-only", "B-badimg-only"}
EXT_PROD = {"C-img-only", "C-badimg-only", "E-norule", "E-txt-blankop", "E-txt-both", "K-txtrule-num"}
for r in items: r["env"] = PROD if r["item_id"] in ITEM_PROD else BOTH
for e in exts: e["env"] = PROD if e["item_id"] in EXT_PROD else BOTH

for name,rows,cols in [("indicators.csv",items,IC),("extensions.csv",exts,EC)]:
    with open(OUT+name,"w",newline="",encoding="utf-8-sig") as f:
        w=csv.DictWriter(f,fieldnames=cols); w.writeheader(); w.writerows(rows)
print(len(items),"items",len(exts),"extensions")
print(sorted(collections.Counter(i["bundle"] for i in items).items()))
print(dict(collections.Counter(i["env"] for i in items)))
print(sorted(collections.Counter(i["field_slot"] for i in items).items()))

ACC = ["record_id","sobject","Name","AccountNumber","TickerSymbol","Rating","NumberOfEmployees","AnnualRevenue","Description"]
accs = [
 ("ACC-01","Regression Blank","","","","","","","Archetype: every field null"),
 ("ACC-02","Regression Zero","Alpha","Alpha","Hot","0","0","","Archetype: zeros; text rule match 'alp'"),
 ("ACC-03","Regression Neg","Gold","ALPHA","Warm","-5","99.99","","Negative count; Gold combo match; case variant"),
 ("ACC-04","Regression Five","Silver","alphabet","Cold","5","100.00","","Silver; contains/starts-with but not equals; currency at min"),
 ("ACC-05","Regression Ten","other","Beta","","10","100.01","","Numeric min boundary; no rating; currency inside range"),
 ("ACC-06","Regression Fifteen","","xyz","Hot","15","200.50","","Null AccountNumber; inside 10-20; currency at max"),
 ("ACC-07","Regression Twenty","Gold","","Warm","20","","","Numeric max boundary (exclusive); null ticker and revenue"),
 ("ACC-08","Regression TwentyFive","Alpha","Beta","Cold","25","150.00","","Above range; Alpha in TXT-1"),
]
rows = []
for a in accs:
    rows.append(dict(record_id=a[0],sobject="Account",Name=a[1],AccountNumber=a[2],TickerSymbol=a[3],Rating=a[4],
             NumberOfEmployees=a[5],AnnualRevenue=a[6],Description=a[8]))
with open(OUT+"records_account.csv","w",newline="",encoding="utf-8-sig") as f:
    w=csv.DictWriter(f,fieldnames=ACC); w.writeheader(); w.writerows(rows)
CON = ["record_id","sobject","LastName","DoNotCall","Account_record_id","Title"]
cons = [
 ("CON-01","Regression Contact 1","true","ACC-03","DoNotCall true; parent AccountNumber Gold (Advanced Field match)"),
 ("CON-02","Regression Contact 2","false","ACC-04","DoNotCall false; parent Silver (no match)"),
 ("CON-03","Regression Contact 3","true","","DoNotCall true; no Account (parent blank)"),
 ("CON-04","Regression Contact 4","false","","DoNotCall false; no Account"),
 ("CON-05","Regression Contact 5","false","ACC-06","DoNotCall false; parent AccountNumber null"),
]
with open(OUT+"records_contact.csv","w",newline="",encoding="utf-8-sig") as f:
    w=csv.DictWriter(f,fieldnames=CON); w.writeheader()
    for c in cons: w.writerow(dict(record_id=c[0],sobject="Contact",LastName=c[1],DoNotCall=c[2],Account_record_id=c[3],Title=c[4]))
