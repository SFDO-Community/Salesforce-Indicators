"""
Regenerates design-salesforce-indicator's assets/objects-reference/ from the
package's real force-app source.

This lives in its own maintenance skill, separate from design-salesforce-indicator,
for the same reason maintain-slds-icon-reference does: it's a maintainer-triggered
operational task, not something a customer-facing design conversation should
ever run itself.

Run this after any change to force-app/main/default/objects/Indicator_*__mdt
(a field added/removed/renamed, a picklist value changed, etc.) so
design-salesforce-indicator's bundled reference for `sf cmdt generate records`
doesn't silently drift from the actual schema.

This only regenerates the mechanical object/field-meta.xml stub copies (namespaced
with inds__). It does NOT touch design-salesforce-indicator/references/cmdt-schema.md's
prose - that file's tables, business-rule notes, and gotchas are hand-maintained
and need a human pass whenever this script reports a change, since a new field
also needs a row explaining what it's for, not just an entry in the XML.

Usage: python scripts/regenerate_objects_reference.py
Run from anywhere; paths are resolved relative to this script's location.
"""
import re
import shutil
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = SKILL_DIR.parent.parent.parent
SRC_ROOT = REPO_ROOT / "force-app" / "main" / "default" / "objects"
DEST_ROOT = SKILL_DIR.parent / "design-salesforce-indicator" / "assets" / "objects-reference"

OBJECTS = [
    "Indicator_Bundle__mdt",
    "Indicator_Item__mdt",
    "Indicator_Bundle_Item__mdt",
    "Indicator_Item_Extension__mdt",
]

NS = "inds__"
FULLNAME_RE = re.compile(r"(<fullName>)([^<]+)(</fullName>)")


def namespace_fullname(text: str) -> str:
    return FULLNAME_RE.sub(lambda m: f"{m.group(1)}{NS}{m.group(2)}{m.group(3)}", text, count=1)


def main():
    if not SRC_ROOT.exists():
        raise SystemExit(f"Expected package source at {SRC_ROOT} - run this from within the package repo.")

    before_fields = {}
    if DEST_ROOT.exists():
        for obj_dir in DEST_ROOT.iterdir():
            before_fields[obj_dir.name] = sorted(p.name for p in (obj_dir / "fields").glob("*.field-meta.xml"))
        shutil.rmtree(DEST_ROOT)
    DEST_ROOT.mkdir(parents=True)

    changed = []
    for obj in OBJECTS:
        src_obj_dir = SRC_ROOT / obj
        dest_obj_name = f"{NS}{obj}"
        dest_obj_dir = DEST_ROOT / dest_obj_name
        fields_dest = dest_obj_dir / "fields"
        fields_dest.mkdir(parents=True)

        src_object_meta = src_obj_dir / f"{obj}.object-meta.xml"
        dest_object_meta = dest_obj_dir / f"{dest_obj_name}.object-meta.xml"
        dest_object_meta.write_text(src_object_meta.read_text(encoding="utf-8"), encoding="utf-8")

        field_files = sorted((src_obj_dir / "fields").glob("*.field-meta.xml"))
        new_names = []
        for f in field_files:
            content = f.read_text(encoding="utf-8")
            new_content = namespace_fullname(content)
            new_name = f"{NS}{f.name}"
            (fields_dest / new_name).write_text(new_content, encoding="utf-8")
            new_names.append(new_name)

        old_names = before_fields.get(dest_obj_name, [])
        if sorted(new_names) != sorted(old_names):
            added = sorted(set(new_names) - set(old_names))
            removed = sorted(set(old_names) - set(new_names))
            changed.append((obj, added, removed))

        print(f"{obj}: {len(field_files)} fields -> {dest_obj_name}")

    if changed:
        print("\nField changes detected - update design-salesforce-indicator/references/cmdt-schema.md's tables and prose to match:")
        for obj, added, removed in changed:
            if added:
                print(f"  {obj}: added {added}")
            if removed:
                print(f"  {obj}: removed {removed}")
    else:
        print("\nNo field changes since the last regeneration.")


if __name__ == "__main__":
    main()
