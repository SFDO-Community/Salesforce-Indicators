#!/usr/bin/env python3
"""Would a validation-rule change reject any Custom Metadata record that this repo ships?

Takes the real CMDT record sets (sample/training config, the regression sets), strips the CumulusCI namespace tokens, and runs each
set through TWO check-only deploys (nothing is saved to the org):
    1. with the rules currently in the org
    2. with candidate rule files applied inside the same rolled-back deploy (--rules)
then compares which records are rejected.

    OK            accepted both ways
    NEW_FAIL      accepted today, REJECTED by the candidate rules   <- the change would break this record
    ALREADY_FAILS rejected both ways (known: e.g. records that only deploy to older orgs)
    NOW_ACCEPTED  rejected today, accepted by the candidate rules

Usage (repo root):
    python regression/scripts/scan_records_against_rules.py --org <alias> --rules regression/findings/proposed-validation-rules
    python regression/scripts/scan_records_against_rules.py --org <alias> --rules <dir> --sets sample_Lead,training_Indicators

Each set is self-contained (its own bundles, items, extensions, bundle items), so it deploys on its own.
"""
import argparse
import csv
import importlib.util
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REG = HERE.parent
REPO = REG.parent
spec = importlib.util.spec_from_file_location("rvt", HERE / "run_validation_tests.py")
rvt = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rvt)

SETS = {
    "sample_AccountContact": REPO / "unpackaged" / "config" / "sample_AccountContact",   # records sit in Part_*/customMetadata
    "sample_Lead": REPO / "unpackaged" / "config" / "sample_Lead",
    "training_Indicators": REPO / "unpackaged" / "config" / "training_Indicators",
    "pipeline_Lead": REPO / "unpackaged" / "config" / "pipeline_Lead",
    "regression_base": REG / "customMetadata",
    "regression_dev_only": REG / "dev_only" / "customMetadata",
    "regression_prod_only": REG / "prod_only" / "customMetadata",
}


def load(dirpath: Path):
    files = {}
    for f in sorted(dirpath.rglob("*")):
        if not f.is_file() or not re.search(r"Indicator_\w+\.[^.]+\.md(-meta\.xml)?$", f.name):
            continue
        name = re.sub(r"^___NAMESPACE___", "", f.name)
        name = re.sub(r"\.md-meta\.xml$", ".md", name)
        xml = f.read_text(encoding="utf-8").replace("%%%NAMESPACE%%%", "").replace("%%%NAMESPACE_OR_C%%%", "")
        files[name] = xml
    return files


def run(org, files, out, rules):
    b = rvt.Builder("")
    b.files = files
    b.write(out, rules)
    return rvt.failures_of(rvt.deploy_check_only(org, out))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--org", default="Salesforce-Indicators__regression_dev_slds1")
    ap.add_argument("--rules", required=True)
    ap.add_argument("--sets", default="", help="comma list of: " + ", ".join(SETS))
    a = ap.parse_args()
    chosen = [s for s in a.sets.split(",") if s] or list(SETS)
    base = REG / "playwright" / "output" / "validation" / (a.org + "__scan")
    rows = []
    for name in chosen:
        files = load(SETS[name])
        if not files:
            print(f"{name}: no records found in {SETS[name]}"); continue
        print(f"{name}: {len(files)} records ...", flush=True)
        cur, cs = run(a.org, files, base / name / "current", None)
        new, ns = run(a.org, files, base / name / "candidate", a.rules)
        print(f"    current rules: status={cs} rejected={len(cur)}   |   candidate rules: status={ns} rejected={len(new)}", flush=True)
        keys = set(cur) | set(new)
        for k in sorted(keys):
            st = "ALREADY_FAILS" if k in cur and k in new else "NEW_FAIL" if k in new else "NOW_ACCEPTED"
            rows.append({"set": name, "record": k, "status": st, "current_message": cur.get(k, "")[:200], "candidate_message": new.get(k, "")[:200]})
        rows.append({"set": name, "record": f"({len(files)} records scanned)", "status": "OK", "current_message": "", "candidate_message": ""})
    # One report PER SET (a later run of a different --sets list must not overwrite an earlier set's results).
    out_csv = base / "scan_report.csv"
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    for name in chosen:
        with open(base / f"scan_{name}.csv", "w", newline="", encoding="utf-8-sig") as f:
            w = csv.DictWriter(f, fieldnames=["set", "record", "status", "current_message", "candidate_message"])
            w.writeheader(); w.writerows([r for r in rows if r["set"] == name])
    with open(out_csv, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=["set", "record", "status", "current_message", "candidate_message"])
        w.writeheader(); w.writerows(rows)
    bad = [r for r in rows if r["status"] in ("NEW_FAIL",)]
    print(f"\nNEW_FAIL (would be broken by the candidate rules): {len(bad)}")
    for r in bad:
        print(f"  {r['set']:22} {r['record']:58} {r['candidate_message'][:70]}")
    other = [r for r in rows if r["status"] in ("ALREADY_FAILS", "NOW_ACCEPTED")]
    print(f"ALREADY_FAILS / NOW_ACCEPTED: {len(other)}")
    for r in other[:12]:
        print(f"  {r['status']:13} {r['set']:22} {r['record']:50} {(r['current_message'] or r['candidate_message'])[:60]}")
    print(f"report: {out_csv}")


if __name__ == "__main__":
    sys.exit(main())
