#!/usr/bin/env python3
"""Apply (or convert) the namespace on Custom Metadata record files in a directory.

Two target styles:
  default : inds__                      (deploy straight to an org with the package installed)
  --cci   : CumulusCI runtime tokens    (CCI decides whether to inject the namespace)
              <field>%%%NAMESPACE%%%Name__c</field>
              ___NAMESPACE___Indicator_*.md-meta.xml

For each *Indicator_*.md-meta.xml file, every <field> and the file name are brought to
the target style. Files may currently be un-prefixed, inds__-prefixed, or CCI-token
prefixed, so this also converts between the two styles in either direction.

Record <label>s and relationship values (e.g. Indicator_Bundle__c = RB01_...) are
left alone: those are record developer names, which stay un-prefixed.

Idempotent: anything already in the target style is skipped.

Usage:
    python regression/scripts/namespace_cmdt_records.py [DIR] [--dry-run] [--cci]

DIR defaults to regression/customMetadata (relative to this script's repo).
"""
import argparse
import re
import sys
from pathlib import Path

NS = "inds__"
CCI_FIELD_NS = "%%%NAMESPACE%%%"
CCI_FILE_NS = "___NAMESPACE___"

# Optional existing prefix (either style) followed by the real name.
FIELD_RE = re.compile(r"<field>(" + re.escape(NS) + "|" + re.escape(CCI_FIELD_NS) + r")?([A-Za-z])")
FILE_RE = re.compile("^(" + re.escape(NS) + "|" + re.escape(CCI_FILE_NS) + r")?(Indicator_.*\.md-meta\.xml)$")
DEFAULT_DIR = Path(__file__).resolve().parent.parent / "customMetadata"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("directory", nargs="?", type=Path, default=DEFAULT_DIR)
    parser.add_argument("--dry-run", action="store_true", help="report changes without writing")
    parser.add_argument("--cci", action="store_true",
                        help="target CumulusCI tokens (%%%%%%NAMESPACE%%%%%% / ___NAMESPACE___) instead of inds__")
    args = parser.parse_args()
    field_ns, file_ns = (CCI_FIELD_NS, CCI_FILE_NS) if args.cci else (NS, NS)

    if not args.directory.is_dir():
        sys.exit(f"Not a directory: {args.directory}")

    fields_changed = 0
    files_changed = 0
    unchanged = 0

    for path in sorted(args.directory.iterdir()):
        m = FILE_RE.match(path.name)
        if not m:
            continue

        # newline="" preserves the file's existing line endings
        with open(path, encoding="utf-8", newline="") as f:
            text = f.read()

        count = 0

        def swap(match):
            nonlocal count
            if match.group(1) != field_ns:
                count += 1
            return "<field>" + field_ns + match.group(2)

        new_text = FIELD_RE.sub(swap, text)
        target = path.with_name(file_ns + m.group(2))
        renaming = target != path

        if not count and not renaming:
            unchanged += 1
            continue
        if renaming and target.exists():
            sys.exit(f"Refusing to overwrite existing file: {target.name}")

        fields_changed += count
        files_changed += 1
        if not args.dry_run:
            if count:
                with open(path, "w", encoding="utf-8", newline="") as f:
                    f.write(new_text)
            if renaming:
                path.rename(target)

    verb = "Would update" if args.dry_run else "Updated"
    print(f"{verb} {files_changed} file(s), {fields_changed} <field> element(s) in {args.directory}")
    if unchanged:
        print(f"Skipped {unchanged} file(s) already in the target style")


if __name__ == "__main__":
    main()
