#!/usr/bin/env python3
"""Add the batch-2 feature tabs to the dev-only record pages (idempotent).

  Account dev page  -> tab "Cards":    RF19a-d card-colour bundles (Lightning Card title) + two Dynamic Forms-title variants
  Contact dev page  -> tab "Features": RF20 Contact bundle in avatar/badge/pill + the Account bundle RF15 shown through
                                       mappedField=AccountId (showFooter on) in avatar/badge/pill

A tab is added by CLONING an existing tab (and its facet) of the same page, so the new tab uses exactly that page's own template/structure.
The Contact dev page is first copied from the base regression page when it does not exist yet. The files have the same API names as the base
pages, so regression_dev deploys them AFTER the base pages (see cumulusci.yml).

Run from the repo root:  python regression/scripts/add_feature_tabs.py
"""
import copy
import shutil
import sys
import uuid
import xml.etree.ElementTree as ET
from pathlib import Path

NS = "http://soap.sforce.com/2006/04/metadata"
ET.register_namespace("", NS)
q = lambda t: f"{{{NS}}}{t}"
REG = Path(__file__).resolve().parent.parent
BASE_CONTACT = REG / "flexipages" / "Contact_Record_Page_Regression.flexipage-meta.xml"
DEV = REG / "dev_only" / "flexipages"
ACCOUNT_DEV = DEV / "Account_Record_Page_Regression.flexipage-meta.xml"
CONTACT_DEV = DEV / "Contact_Record_Page_Regression.flexipage-meta.xml"


def props(ci):
    return {p.find(q("name")).text: p for p in ci.findall(q("componentInstanceProperties"))}


def set_prop(ci, name, value):
    p = props(ci).get(name)
    if p is None:
        p = ET.Element(q("componentInstanceProperties"))
        ET.SubElement(p, q("name")).text = name
        idx = 0
        for k, e in enumerate(ci.findall(q("componentInstanceProperties"))):
            if e.find(q("name")).text < name:
                idx = k + 1
        ci.insert(idx, p)
    v = p.find(q("value"))
    if v is None:
        v = ET.SubElement(p, q("value"))
    v.text = value


def val(ci, name):
    p = props(ci).get(name)
    v = p.find(q("value")) if p is not None else None
    return v.text if v is not None else None


def find_tab(root, title):
    """-> (tab itemInstances, region holding it, facet region it points at)."""
    by_name = {r.find(q("name")).text: r for r in root.findall(q("flexiPageRegions"))}
    for r in root.findall(q("flexiPageRegions")):
        for ii in r.findall(q("itemInstances")):
            ci = ii.find(q("componentInstance"))
            if ci is not None and ci.find(q("componentName")).text == "flexipage:tab" and val(ci, "title") == title:
                return ii, r, by_name[val(ci, "body")]
    raise SystemExit(f"tab {title!r} not found")


def has_tab(root, title):
    try:
        find_tab(root, title)
        return True
    except SystemExit:
        return False


def add_tab(root, clone_from, new_title, specs):
    """specs: list of dicts {bundle, style, title_style, mapped, footer}."""
    if has_tab(root, new_title):
        print(f"  tab {new_title!r} already present: skipped")
        return
    tab_ii, tab_region, facet = find_tab(root, clone_from)
    ids = {e.text for e in root.iter(q("identifier"))}
    facet_name = "Facet-" + str(uuid.uuid4())
    new_tab = copy.deepcopy(tab_ii)
    tci = new_tab.find(q("componentInstance"))
    set_prop(tci, "title", new_title)
    set_prop(tci, "body", facet_name)
    ap = props(tci).get("active")
    if ap is not None:
        tci.remove(ap)
    n = 0

    def ident():
        nonlocal n
        while True:
            n += 1
            i = f"inds_indicatorBundleT{n}"
            if i not in ids:
                ids.add(i)
                return i

    # sibling tab ids must be unique too
    if tci.find(q("identifier")) is not None:
        tci.find(q("identifier")).text = ident()
    new_facet = copy.deepcopy(facet)
    new_facet.find(q("name")).text = facet_name
    template = new_facet.findall(q("itemInstances"))[0]
    for old in new_facet.findall(q("itemInstances")):
        new_facet.remove(old)
    at = list(new_facet).index(new_facet.find(q("name")))
    for sp in specs:
        ii = copy.deepcopy(template)
        ci = ii.find(q("componentInstance"))
        set_prop(ci, "bundleName", sp["bundle"])
        set_prop(ci, "indsStyle", sp.get("style", "avatar"))
        set_prop(ci, "indsShape", "circle")
        set_prop(ci, "titleStyle", sp.get("title_style", "Lightning Card"))
        set_prop(ci, "showFieldValueAsHoverFallback", "false")
        set_prop(ci, "showTitle", "true")
        set_prop(ci, "showDescription", "true")
        set_prop(ci, "showFooter", "true" if sp.get("footer") else "false")
        mp = props(ci).get("mappedField")
        if sp.get("mapped"):
            set_prop(ci, "mappedField", sp["mapped"])
        elif mp is not None and mp.find(q("value")) is not None:
            mp.remove(mp.find(q("value")))          # unmapped: leave mappedField empty
        ci.find(q("identifier")).text = ident()
        new_facet.insert(at, ii)
        at += 1
    # insert the new tab right after the tab it was cloned from, and the facet after the facet it was cloned from
    tab_region.insert(list(tab_region).index(tab_ii) + 1, new_tab)
    root.insert(list(root).index(facet) + 1, new_facet)
    print(f"  tab {new_title!r} added with {len(specs)} component(s)")


def save(tree, path):
    ET.indent(tree, space="    ")
    tree.write(path, encoding="UTF-8", xml_declaration=True)
    lines = path.read_text(encoding="utf-8").split("\n")
    lines[0] = '<?xml version="1.0" encoding="UTF-8"?>'
    path.write_text("\n".join(lines), encoding="utf-8", newline="")


def main():
    # ---- Account: Cards tab
    print("Account dev page")
    tree = ET.parse(ACCOUNT_DEV)
    cards = [dict(bundle=b, style="avatar") for b in ("RF19a_CardBoth_Acct", "RF19b_CardBgOnly_Acct", "RF19c_CardFgOnly_Acct", "RF19d_CardNone_Acct")]
    cards += [dict(bundle=b, style="avatar", title_style="Dynamic Forms") for b in ("RF19a_CardBoth_Acct", "RF19b_CardBgOnly_Acct")]
    add_tab(tree.getroot(), "Pill", "Cards", cards)
    save(tree, ACCOUNT_DEV)

    # ---- Contact: Features tab
    print("Contact dev page")
    if not CONTACT_DEV.exists():
        shutil.copyfile(BASE_CONTACT, CONTACT_DEV)
        print("  copied the base Contact regression page to dev_only/flexipages")
    tree = ET.parse(CONTACT_DEV)
    feats = [dict(bundle="RF20_Contact_Con", style=s) for s in ("avatar", "badge", "pill")]
    feats += [dict(bundle="RF15_Popover_Acct", style=s, mapped="AccountId", footer=True) for s in ("avatar", "badge", "pill")]
    add_tab(tree.getroot(), "Item Level and Known Issues", "Features", feats)
    save(tree, CONTACT_DEV)


if __name__ == "__main__":
    sys.exit(main())
