#!/usr/bin/env python3
"""Validation-rule tests for the Indicator CMDT objects, run as CHECK-ONLY deploys (nothing is saved to the org).

Source of truth: regression/planning/validation/cases.csv  (hand-editable; one row per case)
Output:          regression/playwright/output/validation/<org>/{positives,negatives}/   Metadata API packages
                 regression/playwright/output/validation/<org>/validation_report.csv     per-case result

How it works
  * Each case becomes one CMDT record (VT_<case_id>) built from the row's fields. A fixed set of VALID parent bundles and
    items (VT_B_*, VT_I_*) is added to every package, so a child case never fails because its parent did.
  * Two packages are deployed with `sf project deploy start --dry-run` (validate, then roll back):
      positives = parents + every `expect=pass` case.      The deploy must SUCCEED.
      negatives = parents + every `expect=fail|gap` case.  The deploy must FAIL; the failure list says which records were
                                                           rejected and why. A record NOT in the failure list was ACCEPTED.
  * Result per case:
      PASS         pass case accepted, or fail case rejected with the expected message
      FAIL         pass case rejected, or fail case ACCEPTED (a rule is missing/broken)
      WRONG_RULE   fail case rejected, but not by the rule/message we expected
      GAP_OPEN     gap case accepted: the product still lets this through (documented risk)
      GAP_CLOSED   gap case now rejected: a rule has been added -> change the case to expect=fail

Usage (from the repo root):
    python regression/scripts/run_validation_tests.py --org Salesforce-Indicators__regression_dev_slds1
    python regression/scripts/run_validation_tests.py --build-only          # just write the packages
    python regression/scripts/run_validation_tests.py --ns inds__ --org <managed-package org>

Needs: sf CLI, an org with the package (or the unmanaged source) deployed, and Account.Test_Date__c (regression/dev_only/objects).
"""
import argparse
import csv
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from xml.sax.saxutils import escape

REG = Path(__file__).resolve().parent.parent
CASES = REG / "planning" / "validation" / "cases.csv"
API_VERSION = "67.0"

# Valid parents shared by every package. Fields are chosen so each DataType the extension rules look at is present.
PARENT_BUNDLES = {"VT_B_Acct": "Account", "VT_B_Con": "Contact"}
PARENT_ITEMS = {  # name: (sObject, Field__c or None, Advanced_Field__c or None)
    "VT_I_Text": ("Account", "AccountNumber", None),        # Text
    "VT_I_Pick": ("Account", "Rating", None),               # Picklist
    "VT_I_Num": ("Account", "NumberOfEmployees", None),     # Number
    "VT_I_Cur": ("Account", "AnnualRevenue", None),         # Currency
    "VT_I_Date": ("Account", "Test_Date__c", None),         # Date (custom field)
    "VT_I_Adv": ("Account", None, "Parent.AccountNumber"),  # Advanced field: no DataType, so no type-driven rule applies
    "VT_I_Chk": ("Contact", "DoNotCall", None),             # Checkbox
    "VT_I_Con": ("Contact", "LastName", None),              # Text on a different sObject (for the sObject-mismatch case)
}
NUMERIC = {"Minimum", "Maximum", "Order"}


def sf(*args, check=True):
    # On Windows `sf` is sf.cmd, which CreateProcess cannot find by bare name: resolve it (shutil.which honours PATHEXT).
    exe = shutil.which("sf") or shutil.which("sf.cmd") or "sf"
    out = subprocess.run([exe, *args], capture_output=True, text=True, encoding="utf-8",
                         env={**os.environ, "FORCE_COLOR": "0", "NO_COLOR": "1"})
    text = out.stdout
    i = text.find("{")
    return json.loads(text[i:]) if i >= 0 else {"status": 1, "message": out.stderr[:500]}


class Builder:
    def __init__(self, ns):
        self.ns = ns
        self.files = {}   # path inside customMetadata/ -> xml

    def rec(self, kind, name, fields):
        """fields: list of (api_name_without_ns, value|None, type). None values are omitted (field left unset)."""
        body = []
        for api, val in fields:
            if val is None or val == "":
                continue
            if api in NUMERIC:
                t, v = "xsd:double", f"{float(val)}"
            elif isinstance(val, bool):
                t, v = "xsd:boolean", "true" if val else "false"
            else:
                t, v = "xsd:string", escape(str(val))
            body.append(f"    <values>\n        <field>{self.ns}{api}__c</field>\n        <value xsi:type=\"{t}\">{v}</value>\n    </values>")
        xml = ('<?xml version="1.0" encoding="UTF-8"?>\n<CustomMetadata xmlns="http://soap.sforce.com/2006/04/metadata" '
               'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">\n'
               f"    <label>{name}</label>\n    <protected>false</protected>\n" + "\n".join(body) + "\n</CustomMetadata>\n")
        self.files[f"{self.ns}{kind}.{name}.md"] = xml

    def parents(self):
        for n, s in PARENT_BUNDLES.items():
            self.rec("Indicator_Bundle", n, [("sObject", s), ("Active", True)])
        for n, (s, f, a) in PARENT_ITEMS.items():
            self.rec("Indicator_Item", n, [("sObject", s), ("Field", f), ("Advanced_Field", a), ("Active", True),
                                           ("Empty_Static_Text_Behavior", "Use Icon Only"), ("Icon_Value", "standard:account")])

    def case(self, c):
        name = f"VT_{c['case_id']}"
        g = lambda k: c.get(k, "")
        if c["object"] == "Bundle":
            self.rec("Indicator_Bundle", name, [("sObject", g("sObject")), ("Active", True)])
        elif c["object"] == "Item":
            behavior = g("Empty_Static_Text_Behavior")
            behavior = None if behavior == "__OMIT__" else (behavior or "Use Icon Only")
            self.rec("Indicator_Item", name, [("sObject", g("sObject")), ("Field", g("Field")), ("Advanced_Field", g("Advanced_Field")),
                     ("Active", True), ("Empty_Static_Text_Behavior", behavior), ("Icon_Value", g("Icon_Value")),
                     ("Inverse_Icon_Value", g("Inverse_Icon_Value")), ("Image", g("Image")), ("Inverse_Image", g("Inverse_Image")),
                     ("Static_Text", g("Static_Text"))])
        elif c["object"] == "Extension":
            self.rec("Indicator_Item_Extension", name, [("Indicator_Item", g("item")), ("Active", True), ("Contains_Text", g("Contains_Text")),
                     ("Text_Operator", g("Text_Operator")), ("Minimum", g("Minimum")), ("Maximum", g("Maximum")),
                     ("Icon_Value", g("Icon_Value")), ("Image", g("Image"))])
        elif c["object"] == "BundleItem":
            self.rec("Indicator_Bundle_Item", name, [("Indicator_Bundle", g("bundle")), ("Indicator_Item", g("item")), ("Order", "1"),
                     ("Action_Type", g("Action_Type")), ("Action_Target", g("Action_Target"))])
        else:
            raise ValueError(f"unknown object {c['object']!r} in case {c['case_id']}")

    def write(self, root: Path, rules_dir=None):
        cm = root / "customMetadata"
        cm.mkdir(parents=True, exist_ok=True)
        for old in cm.glob("*"):
            old.unlink()
        for p, x in self.files.items():
            (cm / p).write_text(x, encoding="utf-8")
        extra_types = ""
        if rules_dir:
            # Candidate rule change: convert source-format rule files into a partial CustomObject per sObject, so the rules are
            # applied inside the SAME check-only deploy that validates the records (rolled back afterwards, nothing is saved).
            objs = root / "objects"
            objs.mkdir(exist_ok=True)
            members = []
            for obj_dir in sorted(d for d in Path(rules_dir).iterdir() if d.is_dir()):
                parts = []
                for rf in sorted((obj_dir / "validationRules").glob("*.xml")):
                    body = rf.read_text(encoding="utf-8")
                    body = body.split("?>", 1)[1] if body.lstrip().startswith("<?xml") else body
                    body = body.replace('<ValidationRule xmlns="http://soap.sforce.com/2006/04/metadata">', "<validationRules>")
                    body = body.replace("</ValidationRule>", "</validationRules>")
                    parts.append(body.strip())
                # A CustomObject must carry its label/pluralLabel/visibility even when only validation rules are being changed:
                # copy them from the real object definition so the candidate matches the shipped type exactly.
                src = REG.parent / "force-app" / "main" / "default" / "objects" / obj_dir.name / f"{obj_dir.name}.object-meta.xml"
                src_xml = src.read_text(encoding="utf-8")
                header = "".join(f"    <{tag}>{re.search(f'<{tag}>(.*?)</{tag}>', src_xml, re.S).group(1)}</{tag}>\n"
                                 for tag in ("label", "pluralLabel", "visibility"))
                (objs / f"{obj_dir.name}.object").write_text(
                    '<?xml version="1.0" encoding="UTF-8"?>\n<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">\n'
                    + header + "\n".join(parts) + "\n</CustomObject>\n", encoding="utf-8")
                members.append(f"<members>{obj_dir.name}</members>")
            extra_types = f"    <types>{''.join(members)}<name>CustomObject</name></types>\n"
        (root / "package.xml").write_text(
            '<?xml version="1.0" encoding="UTF-8"?>\n<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n'
            f"    <types><members>*</members><name>CustomMetadata</name></types>\n{extra_types}    <version>{API_VERSION}</version>\n</Package>\n",
            encoding="utf-8")


def failures_of(result):
    d = (result.get("result") or {}).get("details") or {}
    cf = d.get("componentFailures") or []
    if isinstance(cf, dict):
        cf = [cf]
    return {f.get("fullName", ""): f.get("problem", "") for f in cf}, (result.get("result") or {}).get("status", result.get("status"))


def deploy_check_only(org, path):
    return sf("project", "deploy", "start", "--metadata-dir", str(path), "--dry-run", "--target-org", org, "--json", "--wait", "20")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--org", default="Salesforce-Indicators__regression_dev_slds1")
    ap.add_argument("--ns", default="", help="namespace prefix incl. underscores, e.g. inds__ (default: none, unmanaged)")
    ap.add_argument("--build-only", action="store_true")
    ap.add_argument("--rules", help="dir of CANDIDATE rule files (<dir>/<Object>__mdt/validationRules/*.xml) applied inside the check-only deploys")
    a = ap.parse_args()

    cases = list(csv.DictReader(open(CASES, encoding="utf-8-sig", newline="")))
    out = REG / "playwright" / "output" / "validation" / (a.org + ("__candidate" if a.rules else ""))
    pos, neg = Builder(a.ns), Builder(a.ns)
    pos.parents(); neg.parents()
    for c in cases:
        (pos if c["expect"] == "pass" else neg).case(c)
    pos.write(out / "positives", a.rules); neg.write(out / "negatives", a.rules)
    print(f"built {len(pos.files)} positive-package records and {len(neg.files)} negative-package records -> {out}")
    if a.build_only:
        return

    print("check-only deploy: positives (must succeed)...")
    pr = deploy_check_only(a.org, out / "positives")
    pfail, pstatus = failures_of(pr)
    print(f"  status={pstatus}  failures={len(pfail)}")
    print("check-only deploy: negatives (must fail; the failure list is the result)...")
    nr = deploy_check_only(a.org, out / "negatives")
    nfail, nstatus = failures_of(nr)
    print(f"  status={nstatus}  failures={len(nfail)}")
    (out / "raw_positives.json").write_text(json.dumps(pr, indent=1), encoding="utf-8")
    (out / "raw_negatives.json").write_text(json.dumps(nr, indent=1), encoding="utf-8")

    rows, tally = [], {}
    parent_names = {f"Indicator_Bundle.{n}" for n in PARENT_BUNDLES} | {f"Indicator_Item.{n}" for n in PARENT_ITEMS}
    for c in cases:
        failed = pfail if c["expect"] == "pass" else nfail
        problem = next((v for k, v in failed.items() if k.endswith(f"VT_{c['case_id']}")), None)
        accepted = problem is None
        if c["expect"] == "pass":
            result = "PASS" if accepted else "FAIL"
        elif c["expect"] == "fail":
            if accepted:
                result = "FAIL"
            elif c["msg_contains"] and c["msg_contains"].lower() not in problem.lower():
                result = "WRONG_RULE"
            else:
                result = "PASS"
        else:  # gap
            result = "GAP_OPEN" if accepted else "GAP_CLOSED"
        tally[result] = tally.get(result, 0) + 1
        rows.append({"case_id": c["case_id"], "object": c["object"], "expect": c["expect"], "result": result, "rule": c["rule"],
                     "accepted_by_org": "yes" if accepted else "no", "org_message": (problem or "")[:300], "description": c["description"]})
    unexpected_parent = [k for k in list(pfail) + list(nfail) if any(k.endswith(p.split(".")[1]) for p in parent_names)]
    with open(out / "validation_report.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)
    print(f"\nRESULT {tally}")
    for r in rows:
        if r["result"] not in ("PASS",):
            print(f"  {r['result']:10} {r['case_id']:5} {r['rule'][:42]:42} {r['org_message'][:90]}")
    if unexpected_parent:
        print("\nWARNING: a shared PARENT record failed, so results for its children may be unreliable:", unexpected_parent)
    if pstatus not in ("Succeeded", "SucceededPartial") and not pfail:
        print("\nWARNING: positives deploy did not succeed and reported no component failures; see raw_positives.json")
    print(f"report: {out / 'validation_report.csv'}")


if __name__ == "__main__":
    sys.exit(main())
