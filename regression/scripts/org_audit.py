#!/usr/bin/env python3
"""Read-only audit of the regression/feature test orgs: is each org in the state the specs expect?

Run it BEFORE running specs (and after a rebuild / reload). It only queries; it changes nothing. It exists because a spec that finds the wrong
data either fails confusingly or, worse, tests nothing: a default-org mistake and a reload in progress have both already happened.

    python regression/scripts/org_audit.py                                   # the three dev orgs
    python regression/scripts/org_audit.py --orgs slds1,slds2                # a subset
    python regression/scripts/org_audit.py --alias-prefix Salesforce-Indicators__regression_dev_ --orgs slds1

Checks per org (expected value in brackets):
  Feature accounts [14 = 3 FEAT + 11 FDATE]; Regression accounts [8]; Regression contacts [5]; Feature contacts [4, linked to the Feature accounts, FCON-04 orphan];
  a date record equal to the org's TODAY [fresh dates]; newest CMDT present [RF19 x4, RF20 x1]; Extension validation rules [lists them: the corrected set has NoExtensionOnCheckboxField];
  the three prod-only extensions [0 on an org built from the current flow]; org expiry.
Exit code 0 when every org passes the data checks, 1 otherwise (rules / prod-only extensions are informational).
"""
import argparse
import json
import os
import shutil
import subprocess
import sys

SF = shutil.which("sf") or shutil.which("sf.cmd") or "sf"


def q(org, soql, tooling=False):
    args = [SF, "data", "query", "-o", org, "-q", soql, "--json"] + (["-t"] if tooling else [])
    out = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", env={**os.environ, "FORCE_COLOR": "0", "NO_COLOR": "1"})
    t = out.stdout
    try:
        return json.loads(t[t.find("{"):]).get("result", {})
    except Exception:
        return {}


def count(org, soql):
    return q(org, soql).get("totalSize")


def expiry(org):
    out = subprocess.run([SF, "org", "display", "-o", org, "--json"], capture_output=True, text=True, encoding="utf-8", env={**os.environ, "NO_COLOR": "1"})
    try:
        return json.loads(out.stdout[out.stdout.find("{"):])["result"].get("expirationDate", "?")
    except Exception:
        return "?"


def audit(org):
    rows, ok = [], True

    def check(label, actual, expected, hard=True):
        nonlocal ok
        good = actual == expected
        if hard and not good:
            ok = False
        rows.append((label, actual, expected, "ok" if good else ("MISMATCH" if hard else "info")))

    check("Feature accounts (3 FEAT + 11 FDATE)", count(org, "SELECT COUNT() FROM Account WHERE Name LIKE 'Feature %'"), 14)
    check("Regression accounts", count(org, "SELECT COUNT() FROM Account WHERE Name LIKE 'Regression %'"), 8)
    check("Regression contacts", count(org, "SELECT COUNT() FROM Contact WHERE LastName LIKE 'Regression %'"), 5)
    cons = q(org, "SELECT Title, Account.Name FROM Contact WHERE LastName LIKE 'Feature Contact %' ORDER BY Title").get("records", [])
    linked = [(c["Title"], (c.get("Account") or {}).get("Name")) for c in cons]
    check("Feature contacts, linked (FCON-04 has none)", linked,
          [("FCON-01", "Feature Full"), ("FCON-02", "Feature Blank"), ("FCON-03", "Feature Cold"), ("FCON-04", None)])
    today = [r["Site"] for r in q(org, "SELECT Site FROM Account WHERE Name LIKE 'Feature Date %' AND Test_Date__c = TODAY").get("records", [])]
    check("date record equal to the org's TODAY", bool(today), True)
    check("RF19 card bundles", count(org, "SELECT COUNT() FROM Indicator_Bundle__mdt WHERE DeveloperName LIKE 'RF19%'"), 4)
    check("RF20 Contact bundle", count(org, "SELECT COUNT() FROM Indicator_Bundle__mdt WHERE DeveloperName LIKE 'RF20%'"), 1)
    rules = sorted(r["ValidationName"] for r in q(org, "SELECT ValidationName FROM ValidationRule WHERE EntityDefinition.QualifiedApiName = 'Indicator_Item_Extension__mdt'", True).get("records", []))
    check("corrected checkbox rule present (NoExtensionOnCheckboxField)", "NoExtensionOnCheckboxField" in rules, True, hard=False)
    check("prod-only extensions present (0 = built from the current flow)",
          count(org, "SELECT COUNT() FROM Indicator_Item_Extension__mdt WHERE DeveloperName IN ('E_num_max_X1','E_num_on_text_X1','K_txtrule_chk_X1')"), 0, hard=False)
    return rows, ok, expiry(org)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--orgs", default="slds1,slds2,slds2-dark")
    ap.add_argument("--alias-prefix", default="Salesforce-Indicators__regression_dev_")
    a = ap.parse_args()
    all_ok = True
    for name in [o for o in a.orgs.split(",") if o]:
        org = a.alias_prefix + name
        rows, ok, exp = audit(org)
        all_ok &= ok
        print(f"\n=== {name}   ({org})   expires {exp}   -> {'READY' if ok else 'NOT READY'}")
        for label, actual, expected, status in rows:
            print(f"   {status:9} {label:58} actual={actual!s:<14} expected={expected}")
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
