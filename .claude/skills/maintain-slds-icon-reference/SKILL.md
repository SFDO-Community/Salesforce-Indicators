---
name: maintain-slds-icon-reference
description: Operational/maintainer skill for keeping design-salesforce-indicator's assets/slds-icons-reference.csv accurate and useful — refreshing the icon name list when the package's supported SLDS version changes, and curating the description/default_background_color/common_use columns that help an AI agent pick a good icon instead of guessing. Use this when asked to update, refresh, or curate the SLDS icon reference, add descriptions to icons, or regenerate the icon list after an SLDS version bump. Do NOT trigger this during a normal indicator-design conversation — that's design-salesforce-indicator's job, which only reads this CSV, never regenerates it.
---

# Maintaining the SLDS icon reference

This exists because `design-salesforce-indicator` previously guessed at plausible-sounding SLDS icon names that didn't actually exist — `Icon_Value__c` isn't validated anywhere in the CMDT layer, so a bad name just silently renders nothing. The fix was a real, fetched list of valid names; this skill is where that list (and its ongoing curation) is maintained, kept separate from the design skill so a design conversation never has a reason to re-scrape a website mid-interview.

The file exists as two identical copies — `../design-salesforce-indicator/assets/slds-icons-reference.csv` (customer-org use) and `../design-indicator-samples/assets/slds-icons-reference.csv` (package-repo sample authoring) — columns `type, name, default_background_color, description, common_use`. `scripts/build_icon_reference.py` is the only thing that should ever write either file; it writes both together and merges curated values across them, so curating one and re-running the script propagates to the other. Don't hand-edit just one copy and leave the other stale.

## Refreshing the name list (mechanical, safe to automate)

Run `scripts/build_icon_reference.py` from the package repo. It re-derives the name lists from the category constants at the top of the script — if Salesforce has added/removed/renamed icons since those constants were written (i.e. the package's supported SLDS version changed), first re-fetch `https://v1.lightningdesignsystem.com/icons/` (confirmed by the package maintainer as the version-matched source — not the current `lightningdesignsystem.com/icons/` page, which tracks a newer SLDS version than this package targets) and update the category constants before running.

The script preserves curated `default_background_color`/`description`/`common_use` values for any icon name that still exists, so re-running it after a small icon-list change doesn't wipe out curation work — it only adds empty rows for genuinely new icons and reports how many.

## Curating the description columns (requires actually looking, not guessing)

This is the part that can't be automated safely. `description` should say what the icon literally depicts (shape, not interpreted meaning) — e.g. `standard:all` is `four geometric shapes`, `standard:announcement` is `a megaphone` (these two are already filled in as examples). Writing plausible-sounding descriptions from the icon's *name* alone reintroduces exactly the hallucination problem this file exists to prevent — a name like `standard:opportunity` doesn't tell you what the glyph actually looks like. Look at the actual icon (the SLDS icon gallery page renders them, or an SVG source) before writing its description.

`default_background_color` is the color the icon renders with when `Icon_Background__c`/`Card_Icon_Background__c` is left unset. Both confirmed examples so far are `#117CAD` — worth testing whether this is a fixed platform default across *all* `standard:` icons (in which case it could be bulk-applied to every `standard` row) or varies; don't assume it's universal and backfill every row with `#117CAD` without checking a few more icons first. `utility:`/`action:`/`doctype:` icons render as bare glyphs with no background at all (see `design-salesforce-indicator/references/cmdt-schema.md`'s utility-icon caveat) — leave `default_background_color` blank for those categories rather than writing "none" or "n/a" into every row.

`common_use` is a short phrase for when an agent is scanning the CSV for a candidate icon during a design conversation — e.g. `status/warning states` for `utility:warning`. Only fill this in alongside a real `description`, from the same direct-look pass — don't infer it from the name either.

Curate a handful of icons at a time as they come up in real design conversations (a natural, incremental source of "which icons actually get proposed") rather than trying to backfill all ~1,660 rows in one sitting — that's the kind of bulk task that pressures toward guessing instead of looking.

## Non-goals

This skill doesn't touch anything in `design-salesforce-indicator` besides the one CSV — no SKILL.md edits, no other assets. If the CSV's *schema* needs to change (a new column), that's a joint decision with whoever maintains the design skill's consuming logic, not something to do unilaterally here.
