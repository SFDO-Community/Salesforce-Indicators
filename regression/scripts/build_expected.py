"""Build the Expected-result oracle: what SHOULD render for every item on every record.

Reads   regression/data/{items,extensions,bundle_items}.csv
        regression/data/prod_only/{items,extensions,bundle_items}.csv   (only for --env prod, the default)
        regression/planning/records_{account,contact}.csv
Writes  regression/planning/expected.csv       (--env prod, the default)
        regression/planning/expected.dev.csv   (--env dev)

Expected results follow the INTENDED behavior (three levels; avatar precedence image > initials > icon;
a broken image falls back to initials, else icon; zero handling; rule matching), NOT what the code does today.
A baseline screenshot records what happened; this file says what should have happened, so a bug is not
silently baselined. Theme-independent: it describes DOM content (avatar kind, initials, icon), not pixels.

Environments differ in WHICH items exist, not in what they're predicted to do: `regression/data/prod_only/`
holds items/extensions/bundle-items that fail the newer validation rules (see build_cmdt_csvs.py) and so
are only ever deployed to a `regression_prod`-style org (released package, no validation rules), never to
`regression_dev`. `--env prod` (default) merges them in; `--env dev` leaves them out entirely, so an item
that doesn't exist on that org produces no row at all, for any bundle, rather than being predicted as
"missing" or "none". Get this wrong and a bundle (RB01, RB02c) will show fewer avatars on dev than
predicted -- not a real regression, just an item that was never deployed there.

Confirmed 2026-10-04: before this file had the --env split, expected.csv predicted the full prod_only set
by TIMING ACCIDENT ONLY -- it had simply never been regenerated since the day the prod_only split was
introduced, so it still reflected the old, unsplit data/items.csv. Re-running the old version of this
script (reading data/items.csv alone, now 131 of 135 items post-split) would have silently dropped the 4
prod_only rows and broken PROD scoring, not just left dev unhandled -- don't reintroduce that.

`basis` says how much to trust a row:
  spec         follows the stated intended behavior
  unspecified  behavior not defined yet (hover-only, blank rule content, ties...) - decide, then update
  known-issue  intended result differs from current behavior on purpose; observed behavior in notes
  known-gap    feature gap (Empty Static Text Behavior is not applied to rule matches)
Intended rules encoded here live in the functions below; change them here when the spec changes.
"""
import csv, re, sys, collections
from pathlib import Path

REG = Path(__file__).resolve().parents[2] / "regression"
ENV = sys.argv[sys.argv.index("--env") + 1] if "--env" in sys.argv else "prod"
assert ENV in ("prod", "dev"), f"--env must be 'prod' or 'dev', got {ENV!r}"
def rd(p): return list(csv.DictReader(open(p, encoding="utf-8-sig"))) if p.exists() else []
def dev(label):
    s = re.sub(r"[^A-Za-z0-9]+", "_", label).strip("_")
    return ("X" + s) if s[0].isdigit() else s

_paths = [REG / "data"] + ([REG / "data" / "prod_only"] if ENV == "prod" else [])
items = [(dev(i["MasterLabel"]), i) for p in _paths for i in rd(p / "items.csv")]
exts = collections.defaultdict(list)
for p in _paths:
    for e in rd(p / "extensions.csv"): exts[e["Indicator_Item__c"]].append(e)
bundle_of = {}
for p in _paths:
    for b in rd(p / "bundle_items.csv"):
        bundle_of.setdefault(b["Indicator_Item__c"], []).append((b["Indicator_Bundle__c"], float(b["Order__c"])))
accs = {r["record_id"]: r for r in rd(REG / "planning" / "records_account.csv")}
cons = {r["record_id"]: r for r in rd(REG / "planning" / "records_contact.csv")}

NUMERIC = {"NumberOfEmployees", "AnnualRevenue"}
BOOL = {"DoNotCall"}
def value(item, rec):
    f = item["Advanced_Field__c"] or item["Field__c"]
    if item["Advanced_Field__c"]:            # Contact -> Account.<field>
        rec = accs.get(rec.get("Account_record_id", ""), {})
        f = f.split(".")[-1]
    v = rec.get(f, "")
    if f in BOOL: return v.strip().lower() == "true"
    if v == "": return None
    return float(v) if f in NUMERIC else v
def show(v):
    if isinstance(v, bool): return str(v).lower()
    if isinstance(v, float): return str(int(v)) if v == int(v) else repr(v)
    return str(v)

def rule_match(e, v):
    """Returns True/False, or 'error' when a text rule meets a non-string value (known bug)."""
    txt, op = e["Contains_Text__c"], e["Text_Operator__c"]
    if txt:
        if not isinstance(v, str): return "error"
        a, b = v.lower(), txt.lower()
        return {"Equals": a == b, "Does Not Equal": a != b, "Starts With": a.startswith(b)}.get(op, b in a)  # blank op = contains
    mn, mx = e["Minimum__c"], e["Maximum__c"]
    if mn != "" and isinstance(v, float):
        return float(mn) <= v and (mx == "" or v < float(mx))
    return False   # max-only, no criteria, or numeric rule on a non-number never matches

def avatar(c, level, it, v, e_ctx=None):
    """c = dict(hover,text,icon,image,bg,fg). Returns (description, basis, note)."""
    basis, note = "spec", ""
    img_bad = "DoesNotExist" in c["image"]; img_ok = bool(c["image"]) and not img_bad
    text = c["text"][:3]
    beh = it["Empty_Static_Text_Behavior__c"] or "Use Icon Only"   # a blank cell deploys as the picklist default
    if level == "D" and not c["text"] and beh != "Use Icon Only" and v is not None and not isinstance(v, bool):
        text = show(v)[:3]                                   # blank or 'Use Field Value' -> initials from the value
    if level == "V" and not c["text"] and beh == "Use Field Value":
        basis, note = "known-gap", "Empty Static Text Behavior is not applied to rule matches; expected icon only until decided"
    if img_ok: d = "image"
    elif text: d = f"initials '{text}'"
    elif c["icon"]: d = f"icon {c['icon']}"
    elif img_bad:  d, basis, note = "empty slot (broken image, no fallback)", "known-issue", "prod-only: the next release requires a fallback icon; a slot with nothing visible is the current expectation"
    elif c["hover"]: d, basis, note = "none", "known-issue", "hover text alone should not render an avatar (current release is expected to render one)"
    else:          d, basis, note = "none", ("known-issue" if level == "V" else basis), ("a rule with no content should be prevented; observed: blank avatar" if level == "V" else "")
    if img_bad and (text or c["icon"]): d += " (broken image fallback)"
    if c["bg"] and d not in ("none",): d += f" bg={c['bg']}"
    if level == "D" and c["text"] and isinstance(v, float) and v == 0:
        basis, note = "known-issue", "a value of 0 ignores the static text (observed: shows '0', or icon only with Use Icon Only)"
    return d, basis, note

def content(it, level):
    if level == "D": return dict(hover=it["Hover_Text__c"], text=it["Static_Text__c"], icon=it["Icon_Value__c"], image=it["Image__c"], bg=it["Icon_Background__c"], fg=it["Icon_Foreground__c"])
    return dict(hover=it["Inverse_Hover_Text__c"], text=it["Inverse_Static_Text__c"], icon=it["Inverse_Icon_Value__c"], image=it["Inverse_Image__c"], bg=it["Inverse_Icon_Background__c"], fg=it["Inverse_Icon_Foreground__c"])
def econtent(e): return dict(hover=e["Hover_Text__c"], text=e["Static_Text__c"], icon=e["Icon_Value__c"], image=e["Image__c"], bg=e["Icon_Background__c"], fg=e["Icon_Foreground__c"])

rows = []
for name, it in items:
    obj = it["sObject__c"]
    recs = accs if obj == "Account" else cons
    for rid, rec in recs.items():
        v = value(it, rec)
        zero_blank = isinstance(v, float) and v == 0 and it["Zero_Behavior__c"] == "Treat Zeroes as Blanks"
        present = v is not None and v is not False and not zero_blank
        state = "zero-as-missing" if zero_blank else ("present" if present else "missing")
        avatars, hovers, basis, notes, level = [], [], "spec", [], "none"
        if it["Active__c"] != "true":
            notes.append("item inactive")
        elif present:
            defc = content(it, "D")
            matches = []
            for e in exts.get(name, []):
                if e["Active__c"] != "true": continue
                m = rule_match(e, v)
                if m == "error":
                    matches = "error"; break
                if m: matches.append(e)
            if matches == "error":
                level, avatars, basis = "error", ["COMPONENT ERROR (o.toLowerCase is not a function)"], "known-issue"
                notes.append("text rule on a non-text field throws; whole bundle fails")
            elif matches:
                level = "rule"
                # intended order (next release): Priority ascending (blank last), then MasterLabel; first match wins
                key = lambda e: (e["Priority__c"] == "", float(e["Priority__c"] or 0), e["MasterLabel"])
                matches = sorted(matches, key=key)
                chosen = matches
                if it["Display_Multiple__c"] != "true" and len(matches) > 1:
                    chosen = [matches[0]]
                    if key(matches[0])[:2] == key(matches[1])[:2]:
                        basis = "known-issue"
                        notes.append("tied priority: first MasterLabel wins in the next release; the current release picks the last one")
                elif it["Display_Multiple__c"] == "true" and len(matches) > 1:
                    notes.append("multiple matches shown by Priority ascending then MasterLabel (current release: Priority descending)")
                for e in chosen:
                    d, b, n = avatar(econtent(e), "V", it, v)
                    avatars.append(d); hovers.append(e["Hover_Text__c"])
                    if b != "spec": basis = b if basis == "spec" else basis; notes.append(n)
            elif any(defc[k] for k in ("hover", "text", "icon", "image")):
                level = "default"
                d, b, n = avatar(defc, "D", it, v)
                avatars.append(d); hovers.append(defc["hover"]); basis = b
                if n: notes.append(n)
            else:
                notes.append("no rule match and no Default configured")
        else:
            mc = content(it, "M")
            if it["Show_False_or_Blank__c"] != "true":
                notes.append("Show when false or blank is cleared")
            elif not any(mc[k] for k in ("hover", "text", "icon", "image")):
                basis = "known-issue"
                notes.append("Missing enabled but no content: nothing should render (current release suspected to leave an empty slot)")
            else:
                level = "missing"
                d, b, n = avatar(mc, "M", it, v)
                avatars.append(d); hovers.append(mc["hover"]); basis = b
                if n: notes.append(n)
        if name.startswith("D_est_") and not it["Empty_Static_Text_Behavior__c"]:
            notes.append("behavior cell blank: a metadata deploy applies the default 'Use Icon Only'")
        for b, order in bundle_of.get(name, [("", 0)]):
            rows.append(dict(bundle=b, item=name, item_order=int(order), record_id=rid, field_value=("" if v is None else show(v)),
                value_state=state, level_fired=level, expected_avatars=" | ".join(avatars) if avatars else "none",
                expected_hover=" | ".join(h for h in hovers if h), basis=basis, notes="; ".join(n for n in notes if n)))

rows.sort(key=lambda r: (r["bundle"], r["record_id"], r["item_order"]))
OUT = REG / "planning" / ("expected.csv" if ENV == "prod" else "expected.dev.csv")
with open(OUT, "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
print(f"env={ENV} -> {OUT.name}:", len(rows), "rows;", dict(collections.Counter(r["basis"] for r in rows)))
print(dict(collections.Counter(r["level_fired"] for r in rows)))
