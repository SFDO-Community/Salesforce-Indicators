#!/usr/bin/env python3
"""Intended-behavior oracle for the dev-only FEATURE tests (Badge/Pill fields, popover, actions).

Reads   regression/planning/features/{items,extensions,records_account}.csv
Writes  regression/planning/expected.features.csv      (one row per style x record x item)

Separate from build_expected.py on purpose: that oracle predicts an avatar descriptor from token-driven
items; this one needs style-aware output (badge/pill label, icon position, text color) and popover output
(body text, action button label/help/confirm, resolved URL). Both stay independent so the verified
prod-vs-dev baseline cannot be disturbed. At v0.5 release the feature rows merge into the base planning.

RULES ENCODED (source: force-app/main/default/lwc/indicatorBundle/indicatorBundle.js)
  * True state (field has a value):
      - matched extension (Priority ASC, first wins; all matches when Display Multiple) OWNS text/color/position/
        icon/hover: a blank extension field does NOT fall back to the item (user-confirmed intended 2026-10-05).
      - Badge/Pill label = extension-or-item Badge_Pill_Text, else the field's display value.
      - Icon position blank -> component default 'start' (badge only; the pill component has no position).
  * False state (value blank): shown only when Show False/Blank is on; uses the Inverse_* fields only.
  * Merge tokens {!Field} resolve against the record (blank field -> '', basis=unconfirmed).
  * Popover exists when it has a body (resolved hover text) or an allowed action. Field-value-as-hover fallback
    applies only to bundles on a page instance with showFieldValueAsHoverFallback=true (RF17).
  * Action button label: Action_Button_Label, else 'Open' (URL) / 'Launch' (Flow Modal). In the false state the
    action is available only when Show_False_or_Blank_Action is on.
  * basis = spec (rule above) | unconfirmed (behavior the code does not pin down; confirm from screenshots).
"""
import csv
import re
from pathlib import Path

REG = Path(__file__).resolve().parent.parent
PLAN = REG / "planning" / "features"
OUT = REG / "planning" / "expected.features.csv"

STYLES = ["avatar", "badge", "pill"]
FB_BUNDLES = {"RF17_PopoverFallback_Acct"}          # page sets showFieldValueAsHoverFallback=true for these bundles only
DEFAULT_LABEL = {"URL": "Open", "Flow Modal": "Launch"}


def read(name):
    with open(PLAN / name, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


items, exts, records = read("items.csv"), read("extensions.csv"), read("records_account.csv")
contact_records = read("records_contact.csv")
bundle_sobject = {b["bundle_id"]: b["sobject"] for b in read("bundles.csv")}
account_by_id = {r["record_id"]: r for r in records}
exts_by_item = {}
for e in exts:
    exts_by_item.setdefault(e["item_id"], []).append(e)
for lst in exts_by_item.values():
    lst.sort(key=lambda e: float(e["priority"] or 999))


def blank(v):
    return v is None or str(v).strip() == ""


def merge(template, rec):
    """Resolve {!Field}; returns (text, used_blank_field)."""
    used_blank = False

    def sub(m):
        nonlocal used_blank
        v = rec.get(m.group(1), "")
        if blank(v):
            used_blank = True
        return "" if blank(v) else str(v)

    return re.sub(r"\{!(\w+)\}", sub, template or ""), used_blank


def ext_matches(e, value):
    v, t = str(value).lower(), (e["text"] or "").lower()
    return {"Equals": v == t, "Contains": t in v, "Starts With": v.startswith(t), "Does Not Equal": v != t}.get(e["operator"], False)


def build_row(style, rec, it, bundle, record_id=None, via=""):
    """One expected row for (style, record, item-in-bundle). `rec` supplies the VALUES; `record_id` overrides which planning
    record the row is filed under (used for mappedField rows, where a Contact page shows its parent Account's values)."""
    rid = record_id or rec["record_id"]
    fb = bundle in FB_BUNDLES
    field = it["field_api"] or it.get("advanced_field", "")
    value = rec.get(field, "")
    has = not blank(value)
    display = str(value)
    basis, notes = "spec", []
    inds = []   # one dict per rendered indicator
    if has:
        matched = [e for e in exts_by_item.get(it["item_id"], []) if ext_matches(e, value)]
        if matched and it["display_multiple"] != "true":
            matched = matched[:1]
        if matched:
            for e in matched:
                inds.append(dict(src="ext", icon=e["icon"], bg=e["bg"], text=e["badge_text"] or display,
                                 color=e["badge_color"], pos=e["badge_pos"] or "start", hover=e["hover"],
                                 own_blank=blank(e["badge_text"])))
                if blank(e["badge_text"]) and not blank(it["badge_text"]):
                    notes.append("extension owns state: item Badge/Pill Text NOT inherited")
        else:
            inds.append(dict(src="item", icon=it["icon"], bg=it["bg"], text=it["badge_text"] or display,
                             color=it["badge_color"], pos=it["badge_pos"] or "start", hover=it["hover"]))
        action_ok = bool(it["action_type"])
    elif it["show_missing"] == "true":
        inds.append(dict(src="inverse", icon=it["inv_icon"], bg=it["inv_bg"], text=it["inv_badge_text"],
                         color=it["inv_badge_color"], pos=it["inv_badge_pos"] or "start", hover=it["inv_hover"]))
        action_ok = bool(it["action_type"]) and it["action_false"] == "true"
        if blank(it["inv_badge_text"]) and style in ("badge", "pill"):
            basis = "unconfirmed"
            notes.append("false state with no inverse Badge/Pill Text: empty label is a guess")
    else:
        action_ok = False

    labels, icons, bgs, colors, poss, bodies, buttons, helps, confirms, urls = ([] for _ in range(10))
    for d in inds:
        labels.append(d["text"] if style in ("badge", "pill") else "")
        if style in ("badge", "pill") and "{!" in (d["text"] or ""):
            d["text"], ub = merge(d["text"], rec)
            labels[-1] = d["text"]
            basis = "unconfirmed" if ub else basis
        icons.append(d["icon"])
        bgs.append(d["bg"])
        colors.append(d["color"] if style in ("badge", "pill") else "")
        poss.append(d["pos"] if style == "badge" else "")   # pill has no icon-position prop (indicatorBundlePill)
        body, ub = merge(d["hover"], rec)
        if ub:
            basis = "unconfirmed"
            notes.append("merge token on blank field: blank-vs-raw-token resolution unconfirmed")
        if blank(body) and fb and has:
            body = display
        bodies.append(body)
        if action_ok:
            buttons.append(it["action_label"] or DEFAULT_LABEL[it["action_type"]])
            helps.append(it["action_help"])
            confirms.append(it["action_confirm"] or "false")
            urls.append(merge(it["action_target"], rec)[0] if it["action_type"] == "URL" else it["action_target"])
        else:
            buttons.append(""); helps.append(""); confirms.append(""); urls.append("")
    popover = ["yes" if (b or bt) else "no" for b, bt in zip(bodies, buttons)]
    row = {
        "shot_id": f"{style}_{rid}_{bundle.split('_')[0]}_{it['item_id']}", "style": style,
        "record_id": rid, "bundle": bundle, "item_id": it["item_id"],
        "visible_count": len(inds), "labels": "|".join(labels), "icons": "|".join(icons),
        "bgs": "|".join(bgs), "text_colors": "|".join(colors), "positions": "|".join(poss),
        "popover": "|".join(popover), "popover_bodies": "|".join(bodies),
        "button_labels": "|".join(buttons), "help_texts": "|".join(helps),
        "confirm_required": "|".join(confirms), "action_urls": "|".join(urls),
        "basis": basis, "notes": "; ".join(dict.fromkeys(notes)), "verifies": it["verifies"], "via": via,
    }
    return row


rows = []
# An item may sit in more than one bundle (items.csv `extra_bundles`): one placement per (item, bundle).
placements = [(it, it["bundle"]) for it in items] + [
    (it, b) for it in items for b in filter(None, (it.get("extra_bundles") or "").split(";"))]
CARD_BUNDLES = ("RF19",)                       # card-colour bundles are asserted by features.cards.spec.ts (card + Key), not per indicator
MAPPED_BUNDLES = {"RF15_Popover_Acct"}          # Account bundles also shown on the Contact page through mappedField=AccountId


def has_token(it):
    texts = [it["hover"], it["badge_text"], it["inv_hover"], it["inv_badge_text"], it["action_target"]]
    for e in exts_by_item.get(it["item_id"], []):
        texts += [e["hover"], e["badge_text"]]
    return any("{!" in (x or "") for x in texts)


for style in STYLES:
    for it, bundle in placements:
        if bundle.startswith(CARD_BUNDLES):
            continue
        for rec in (records if bundle_sobject[bundle] == "Account" else contact_records):
            rows.append(build_row(style, rec, it, bundle))
        if bundle in MAPPED_BUNDLES:
            for crec in contact_records:
                acct = account_by_id.get(crec["account"])
                if acct:
                    r = build_row(style, acct, it, bundle, record_id=crec["record_id"], via="mappedField:AccountId")
                    if has_token(it):
                        # does {!Field} resolve against the MAPPED record or the page's own record? The component decides; not pinned down by code reading.
                        r["basis"] = "unconfirmed"
                        r["notes"] = (r["notes"] + "; " if r["notes"] else "") + "mapped record: merge token resolves against the Account or the Contact? unconfirmed"
                else:   # AccountId blank: what a mapped bundle shows is not pinned down by the code
                    r = dict(build_row(style, {"record_id": crec["record_id"]}, it, bundle, record_id=crec["record_id"], via="mappedField:AccountId"),
                             visible_count=0, labels="", icons="", bgs="", text_colors="", positions="", popover="", popover_bodies="",
                             button_labels="", help_texts="", confirm_required="", action_urls="", basis="unconfirmed",
                             notes="mappedField points at a blank AccountId: nothing, an illustration or an error? unconfirmed")
                rows.append(r)

cols = list(rows[0].keys())
with open(OUT, "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=cols)
    w.writeheader()
    w.writerows(rows)
import collections
print(f"{OUT.name}: {len(rows)} rows;", dict(collections.Counter(r["basis"] for r in rows)))
