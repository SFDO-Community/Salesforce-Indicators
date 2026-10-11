#!/usr/bin/env python3
"""Back up a capture run, then compare a later run against it (phase-1 regression shots and keys): scoring AND pixels.

Why: capture.spec.ts / keys.spec.ts MERGE into the existing output folder, so re-running silently replaces the reference you wanted to compare against.
Back up first; compare after. DOM scoring (PASS/KNOWN/DIFF) cannot see colour or layout changes; the pixel comparison can.

    # 1) before re-running the specs: copy the current results somewhere safe (outside the repo)
    python regression/scripts/compare_captures.py backup --to <dir> [--sets dev-slds1,dev-slds2,dev-slds2-dark]
    # 2) re-run capture.spec.ts / keys.spec.ts on the orgs, then compare
    python regression/scripts/compare_captures.py compare --before <dir> [--sets ...] [--threshold 24]

`--sets` are output folder names (<env>-<theme>). A pixel counts as changed when any channel differs by more than --threshold (default 24, ignores anti-aliasing).
Requires Pillow (`pip install pillow`). Read-only except for `backup`, which copies files. Exit code is always 0: this reports, you judge.
"""
import argparse
import csv
import shutil
import sys
from pathlib import Path

REG = Path(__file__).resolve().parent.parent
OUT = REG / "playwright" / "output"
DEFAULT_SETS = "dev-slds1,dev-slds2,dev-slds2-dark"


def backup(a):
    for s in a.sets.split(","):
        src, dst = OUT / s, Path(a.to) / s
        for sub in ("shots", "keys"):
            (dst / sub).mkdir(parents=True, exist_ok=True)
        for f in ("capture_report.csv", "capture_raw.json", "keys_report.csv"):
            if (src / f).exists():
                shutil.copy2(src / f, dst / f)
        for f in list((src / "shots").glob("acc_*.png")) + list((src / "shots").glob("con_*.png")):
            shutil.copy2(f, dst / "shots" / f.name)
        for f in (src / "keys").glob("*"):
            if f.is_file():
                shutil.copy2(f, dst / "keys" / f.name)
        print(f"{s}: backed up {len(list((dst / 'shots').glob('*.png')))} shots, {len(list((dst / 'keys').glob('*')))} key files -> {dst}")


def results(path):
    if not path.exists():
        return {}
    with open(path, encoding="utf-8-sig", newline="") as f:
        return {r["shot_id"]: r["result"] for r in csv.DictReader(f)}


def compare(a):
    from PIL import Image, ImageChops
    before = Path(a.before)
    for s in a.sets.split(","):
        print(f"\n=== {s}")
        old, new = results(before / s / "capture_report.csv"), results(OUT / s / "capture_report.csv")
        changed = {k: (old[k], new.get(k)) for k in old if new.get(k) != old[k]}
        tally = lambda d: {v: list(d.values()).count(v) for v in sorted(set(d.values()))}
        print(f"   scoring: before {tally(old)} | after {tally(new)} | shots whose result changed: {len(changed)}")
        for k, (o, n) in list(changed.items())[:10]:
            print(f"      {k}: {o} -> {n}")
        rows = []
        compared = 0
        for sub in ("shots", "keys"):
            od, nd = before / s / sub, OUT / s / sub
            if not od.exists():
                continue
            for f in sorted(od.glob("*.png")):
                nf = nd / f.name
                if not nf.exists():
                    rows.append((sub, f.name, "MISSING NOW", "")); continue
                compared += 1
                x, y = Image.open(f).convert("RGB"), Image.open(nf).convert("RGB")
                if x.size != y.size:
                    rows.append((sub, f.name, "SIZE", f"{x.size} -> {y.size}")); continue
                d = ImageChops.difference(x, y).convert("L").point(lambda v: 255 if v > a.threshold else 0)
                n = sum(1 for v in d.getdata() if v)        # Pillow warns that getdata() is deprecated from v14; still correct here
                if n:
                    rows.append((sub, f.name, f"{n} px", str(d.getbbox())))
        print(f"   pixels: compared {compared} images; changed: {len(rows)}")
        for r in rows[:15]:
            print(f"      {r[0]:5} {r[1]:34} {r[2]:>12}  {r[3]}")
        if len(rows) > 15:
            print(f"      ... and {len(rows) - 15} more")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("backup"); b.add_argument("--to", required=True); b.add_argument("--sets", default=DEFAULT_SETS); b.set_defaults(fn=backup)
    c = sub.add_parser("compare"); c.add_argument("--before", required=True); c.add_argument("--sets", default=DEFAULT_SETS)
    c.add_argument("--threshold", type=int, default=24); c.set_defaults(fn=compare)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    sys.exit(main())
