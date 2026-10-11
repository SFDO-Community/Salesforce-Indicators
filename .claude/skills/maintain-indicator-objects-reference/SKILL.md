---
name: maintain-indicator-objects-reference
description: Operational/maintainer skill for keeping design-salesforce-indicator's assets/objects-reference/ (namespaced CMDT field-definition stubs, needed by `sf cmdt generate records` when a customer only has the managed package installed) in sync with the package's real force-app source. Use this when asked to regenerate, refresh, or sync the objects-reference stub, or after adding/removing/renaming a field on any Indicator_*__mdt object. Do NOT trigger this during a normal indicator-design conversation — that's design-salesforce-indicator's job, which only reads these stub files, never regenerates them.
---

# Maintaining the objects-reference stub

`sf cmdt generate records` needs local `.object-meta.xml`/`.field-meta.xml` files to know each CSV column's type. A customer who only has the managed package installed doesn't have those files in their own project — `design-salesforce-indicator/assets/objects-reference/` exists so the CLI generation path works for them anyway, without requiring a metadata retrieve first. It's a namespaced (`inds__`) mechanical copy of the real `force-app/main/default/objects/Indicator_*__mdt` definitions.

This is a separate skill from `design-salesforce-indicator` for the same reason `maintain-slds-icon-reference` is: it's a maintainer-triggered operational task that a customer-facing design conversation should never have a reason to run itself.

## Regenerating the stub

Run `scripts/regenerate_objects_reference.py` from the package repo whenever a field is added, removed, or renamed on any `Indicator_*__mdt` object (or a picklist value changes). It:

- Copies the real object/field-meta.xml files from `force-app/main/default/objects/Indicator_*__mdt`.
- Rewrites each field's `<fullName>` to add the `inds__` prefix, matching what a subscriber org actually sees.
- Reports exactly which fields were added or removed since the last run.

## After running it

The script only touches the mechanical XML stubs. If it reports a field change, a human pass is still needed on `design-salesforce-indicator/references/cmdt-schema.md` — a new field needs a row explaining what it's *for*, not just an entry in the reference XML, and the script has no way to write that prose. Don't skip this step just because the script ran cleanly.
