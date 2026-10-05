"""Build the regression screenshot matrix: what Playwright should capture, one row per shot.

Reads   regression/flexipages/*.flexipage-meta.xml   (which bundle sits on which tab of which page)
        regression/data/{bundles,items,bundle_items,extensions}.csv   (CMDT configuration -- the base set;
          same on every environment, since the FlexiPages and layout don't change between prod and dev)
        regression/planning/{records_account,records_contact,indicators}.csv   (records, env flags)
        regression/planning/expected.csv or expected.dev.csv   (for the expected_avatar_count/summary
          roll-up columns only -- pass --env dev to read the dev-shaped file; run build_expected.py
          --env dev first or this falls back to the prod file with a warning)
Writes  regression/planning/screenshot_matrix.csv   (generated; safe to overwrite)

The bundle/tab layout here doesn't change by environment (same FlexiPages, same bundle -> tab mapping on
both regression_prod and regression_dev) -- only the roll-up counts do, because regression_dev never
deploys regression/data/prod_only/*. Use --env dev to get accurate counts for a dev run; capture.spec.ts
itself doesn't read these roll-up columns at all (it re-filters expected.csv live), so this only matters
for a human skimming the CSV.

Shot kinds
  bundle  one element screenshot of a bundle on a record (every page bundle x every record of its object)
  hover   hover popover for an item that has hover text, on a record that triggers that level
  key     the key modal for a bundle (record independent, taken on the first record)
Bundles in the CMDT data that are not on any page get status 'not-on-page' (kept for reference and future
fix verification). Slugs are permanent once a baseline exists - never rename one.
"""
import csv, re, sys, glob, collections
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REG = ROOT / "regression"
ENV = sys.argv[sys.argv.index("--env") + 1] if "--env" in sys.argv else "prod"
assert ENV in ("prod", "dev"), f"--env must be 'prod' or 'dev', got {ENV!r}"
NS = {"m": "http://soap.sforce.com/2006/04/metadata"}
KNOWN = {
    "RB13a_Known_TextOnNum_Acct": "Known bug: text rule on number field throws 'o.toLowerCase is not a function'. Re-add to page once fixed.",
    "RB13b_Known_TextOnChk_Cont": "Known bug: text rule on checkbox field throws 'o.toLowerCase is not a function'. Re-add to page once fixed.",
    "RB12x_Inactive_Acct": "Inactive bundle cannot be saved to a page; would need activate/deploy page/deactivate. Covered by item-level G-inactive.",
}
# record that triggers each level for a hover shot: (field_slot field, level) -> record_id
HOVER_RECORD = {
    ("AccountNumber", "D"): "ACC-02", ("AccountNumber", "M"): "ACC-01", ("AccountNumber", "V"): "ACC-02",
    ("NumberOfEmployees", "D"): "ACC-04", ("NumberOfEmployees", "M"): "ACC-01", ("NumberOfEmployees", "V"): "ACC-06",
    ("DoNotCall", "D"): "CON-01", ("DoNotCall", "M"): "CON-02",
}

def rd(p):
    return list(csv.DictReader(open(p, encoding="utf-8-sig")))
def dev(label):
    s = re.sub(r"[^A-Za-z0-9]+", "_", label).strip("_")
    return ("X" + s) if s[0].isdigit() else s

# ---- pages: bundle -> (sobject, tab) in page order ----
def page_layout(path):
    root = ET.parse(path).getroot()
    sobj = root.find("m:sobjectType", ns := NS).text
    regions = {r.find("m:name", ns).text: r for r in root.iter("{%s}flexiPageRegions" % ns["m"])}
    def props(ci):
        return {p.find("m:name", ns).text: (p.find("m:value", ns).text if p.find("m:value", ns) is not None else None)
                for p in ci.findall("m:componentInstanceProperties", ns)}
    out = []
    for reg in regions.values():
        for ii in reg.findall("m:itemInstances", ns):
            ci = ii.find("m:componentInstance", ns)
            if ci is None or ci.find("m:componentName", ns).text != "flexipage:tab":
                continue
            p = props(ci)
            title, body = p.get("title"), p.get("body")
            if not body or body not in regions or title.startswith("Standard.Tab"):
                continue
            for j in regions[body].findall("m:itemInstances", ns):
                c = j.find("m:componentInstance", ns)
                if c is not None and c.find("m:componentName", ns).text.endswith("indicatorBundle"):
                    out.append((props(c)["bundleName"], sobj, title))
    return out

layout = {}
for f in sorted(glob.glob(str(REG / "flexipages" / "*.flexipage-meta.xml"))):
    for b, s, t in page_layout(f):
        layout[b] = (s, t)

bundles = {b["MasterLabel"]: b for b in rd(REG / "data" / "bundles.csv")}
bundles = {dev(k): v for k, v in bundles.items()}
items = {dev(i["MasterLabel"]): i for i in rd(REG / "data" / "items.csv")}
exts = rd(REG / "data" / "extensions.csv")
bi = collections.defaultdict(list)
for r in rd(REG / "data" / "bundle_items.csv"):
    bi[r["Indicator_Bundle__c"]].append((float(r["Order__c"]), r["Indicator_Item__c"]))
for k in bi: bi[k].sort()
plan_env = {dev(i["item_id"]): i["env"] for i in rd(REG / "planning" / "indicators.csv")}
records = {"Account": [(r["record_id"], r["Name"]) for r in rd(REG / "planning" / "records_account.csv")],
           "Contact": [(r["record_id"], r["LastName"]) for r in rd(REG / "planning" / "records_contact.csv")]}

def code(b): return b.split("_")[0]

# expected roll-up per (bundle, record) -- read the file matching --env (run build_expected.py first)
exp = collections.defaultdict(list)
_ep = REG / "planning" / ("expected.csv" if ENV == "prod" else "expected.dev.csv")
if not _ep.exists() and ENV == "dev":
    print(f"warning: {_ep.name} not found (run: python build_expected.py --env dev) -- "
          f"falling back to expected.csv, which overstates dev's roll-up counts")
    _ep = REG / "planning" / "expected.csv"
if _ep.exists():
    for r in rd(_ep):
        if r["bundle"]: exp[(r["bundle"], r["record_id"])].append(r)
def rollup(b, rid):
    rs = sorted(exp.get((b, rid), []), key=lambda r: r["item_order"] if isinstance(r["item_order"], int) else int(r["item_order"]))
    if not rs: return "", ""
    if any(r["level_fired"] == "error" for r in rs): return "0", "COMPONENT ERROR"
    vis = [r for r in rs if r["expected_avatars"] not in ("none", "undefined")]
    n = sum(len([a for a in r["expected_avatars"].split(" | ") if not a.startswith("empty slot")]) for r in vis)
    parts = [f'{r["item_order"]}:{r["expected_avatars"]}' for r in vis]
    unk = [r["item_order"] for r in rs if r["expected_avatars"] == "undefined"]
    return str(n), "; ".join(parts) + (f'; ({",".join(unk)}: undefined)' if unk else "")

# Items actually present in each bundle, per the loaded expected file -- NOT from bi/data/bundle_items.csv
# alone, which is always the base (non-prod_only) set and so can never contain a prod-only item to count.
# Reading it off `exp` means this count tracks whatever --env was loaded: for prod it includes prod_only
# items (e.g. RB01 -> 2), for dev it's always 0 (nothing prod-only ever deploys there).
items_in_bundle = collections.defaultdict(set)
for (b, rid), rs in exp.items():
    for r in rs:
        if r["item"]: items_in_bundle[b].add(r["item"])

rows = []
def add(kind, b, rec, rid, rname, **kw):
    s, tab = layout.get(b, (bundles[b]["sObject__c"], ""))
    status = "active" if b in layout else "not-on-page"
    prod = sum(1 for it in items_in_bundle.get(b, ()) if plan_env.get(it) == "prod-only")
    rows.append(dict(shot_id=kw.pop("shot_id"), kind=kind, sobject=s, page_tab=tab, bundle=b,
        card_title=bundles[b]["Card_Title__c"], record_id=rid, record_name=rname, item=kw.get("item", ""),
        item_order=kw.get("order", ""), expect_hover_text=kw.get("hover", ""),
        expected_avatar_count=kw.get("cnt", ""), expected_summary=kw.get("summ", ""), status=status,
        prod_only_items_in_bundle=prod, notes=KNOWN.get(b, "")))

order = sorted(bundles, key=lambda b: (code(b).lower()))
for b in order:
    s = bundles[b]["sObject__c"]
    for rid, rname in records[s]:
        cnt, summ = rollup(b, rid)
        add("bundle", b, None, rid, rname, shot_id=f"{s[:3].lower()}_{code(b)}_{rid}", cnt=cnt, summ=summ)
    add("key", b, None, records[s][0][0], records[s][0][1], shot_id=f"key_{code(b)}")

# hover shots: item has hover text at a level that renders
ext_by_item = collections.defaultdict(list)
for e in exts: ext_by_item[e["Indicator_Item__c"]].append(e)
for b in order:
    for n, (o, it) in enumerate(bi[b], 1):
        rec = items[it]; fld = rec["Field__c"] or rec["Advanced_Field__c"]
        levels = []
        if rec["Hover_Text__c"]: levels.append(("D", rec["Hover_Text__c"]))
        if rec["Inverse_Hover_Text__c"] and rec["Show_False_or_Blank__c"] == "true": levels.append(("M", rec["Inverse_Hover_Text__c"]))
        for e in ext_by_item.get(it, []):
            if e["Hover_Text__c"] and e["Active__c"] == "true": levels.append(("V", e["Hover_Text__c"]))
        for lv, txt in levels:
            key = (fld, lv)
            if key not in HOVER_RECORD:
                continue
            rid = HOVER_RECORD[key]
            rname = dict(records[bundles[b]["sObject__c"]]).get(rid)
            if rname is None: continue
            add("hover", b, None, rid, rname, shot_id=f"hover_{code(b)}_{it}_{lv}", item=it, order=int(o), hover=txt)
    # control: default icon without hover text falls back to the field value
    if b == "RB01_AnyValue_Acct":
        it = "A_icon"; o = [x for x, y in bi[b] if y == it][0]
        add("hover", b, None, "ACC-02", dict(records["Account"])["ACC-02"], shot_id=f"hover_{code(b)}_{it}_D",
            item=it, order=int(o), hover="(field value: Alpha)")

cols = list(rows[0].keys())
OUT = REG / "planning" / ("screenshot_matrix.csv" if ENV == "prod" else "screenshot_matrix.dev.csv")
with open(OUT, "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=cols); w.writeheader(); w.writerows(rows)
c = collections.Counter((r["kind"], r["status"]) for r in rows)
print(f"env={ENV} -> {OUT.name}:", dict(c)); print(len(rows), "rows;", len({r["shot_id"] for r in rows}), "unique shot_ids")
