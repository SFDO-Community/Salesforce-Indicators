"""Build a strictly-local, self-contained HTML viewer for comparing one shot across all six
regression/playwright/output/<env>-<theme>/ sets side by side.

Reads   regression/planning/screenshot_matrix.csv   (list of shot_ids, kind, bundle, record, status)
        regression/playwright/output/<set>/capture_report.csv   (per-set result/actual/basis, bundle shots)
        regression/playwright/output/<set>/keys/keys_report.csv (per-set result, key shots)
Writes  regression/playwright/output/comparison.html

No server, no upload, no network calls -- open the file directly in a browser (file://). All data
(shot list + per-set results) is embedded inline as JS so nothing is fetched at runtime; only the
<img> tags load local sibling files, which a browser allows from a file:// page. Image paths are
relative to this file's own location (regression/playwright/output/), so the six <set>/ folders must
stay siblings of comparison.html -- that's already how build_shot_matrix.py's capture output lands.

Re-run after any new capture run to refresh (it does not change what capture.spec.ts/keys.spec.ts write).
"""
import csv, json, re
from pathlib import Path

REG = Path(__file__).resolve().parents[1]
OUT = REG / "playwright" / "output"
SETS = ["prod-slds1", "prod-slds2", "prod-slds2-dark", "dev-slds1", "dev-slds2", "dev-slds2-dark"]

def rd(p):
    return list(csv.DictReader(open(p, encoding="utf-8-sig"))) if p.exists() else []

matrix = rd(REG / "planning" / "screenshot_matrix.csv")

# per-set lookups: shot_id -> {result, actual, basis} for bundle shots; shot_id -> {result} for keys
bundle_reports = {s: {r["shot_id"]: r for r in rd(OUT / s / "capture_report.csv")} for s in SETS}
key_reports = {s: {r["shot_id"]: r for r in rd(OUT / s / "keys" / "keys_report.csv")} for s in SETS}

# The capture report's "basis" column is just a terse category word (known-issue/known-gap/unspecified) --
# not an explanation. The real explanation lives per-item in expected.csv (prod) / expected.dev.csv (dev)'s
# "notes" column. Build bundle+record -> [distinct non-empty notes for rows with a non-spec basis], per env,
# so the viewer can show *why* a KNOWN shot differs, not just that it does.
ENV_EXPECTED_FILE = {"prod": "expected.csv", "dev": "expected.dev.csv"}
notes_by_bundle_record = {}
for env, fname in ENV_EXPECTED_FILE.items():
    grouped = {}
    for r in rd(REG / "planning" / fname):
        if r.get("basis") not in (None, "", "spec") and r.get("notes"):
            key = (r["bundle"], r["record_id"])
            grouped.setdefault(key, [])
            for note in r["notes"].split(";"):
                note = note.strip()
                if note and note not in grouped[key]:
                    grouped[key].append(note)
    notes_by_bundle_record[env] = grouped

def env_of(set_name):
    return "dev" if set_name.startswith("dev-") else "prod"

def entry_for(shot_id, kind, bundle, record_id):
    out = {}
    for s in SETS:
        src = bundle_reports[s] if kind == "bundle" else key_reports[s]
        r = src.get(shot_id)
        if not r:
            out[s] = None
        elif kind == "bundle":
            notes = notes_by_bundle_record[env_of(s)].get((bundle, record_id), [])
            out[s] = {"result": r["result"], "actual": r["actual"], "basis": r["basis_of_expected"], "notes": notes, "img": f"{s}/shots/{shot_id}.png"}
        else:
            out[s] = {"result": r["result"], "chars": r.get("text_chars", ""), "img": f"{s}/keys/{shot_id}.png", "txt": f"{s}/keys/{shot_id}.txt"}
    return out

records = []
for r in matrix:
    if r["status"] != "active" or r["kind"] not in ("bundle", "key"):
        continue
    records.append({
        "id": r["shot_id"], "kind": r["kind"], "bundle": r["bundle"], "card_title": r["card_title"],
        "record_id": r["record_id"], "sobject": r["sobject"],
        "label": f"{r['shot_id']}  —  {r['card_title']}" + (f" ({r['record_id']})" if r["kind"] == "bundle" else ""),
        "sets": entry_for(r["shot_id"], r["kind"], r["bundle"], r["record_id"]),
    })
records.sort(key=lambda r: r["id"])

DATA = json.dumps(records, ensure_ascii=False)
SETS_JSON = json.dumps(SETS)

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Regression shot comparison</title>
<style>
  :root {{
    --bg: #ffffff; --fg: #1a1a1a; --muted: #6b7280; --border: #e2e2e2; --card-bg: #fafafa;
    --pass: #2e844a; --known: #b86a00; --diff: #c0362c; --missing: #9ca3af;
  }}
  @media (prefers-color-scheme: dark) {{
    :root:not([data-theme="light"]) {{
      --bg: #15181c; --fg: #e8e8e8; --muted: #9aa0a6; --border: #30343a; --card-bg: #1c1f24;
      --pass: #4caf72; --known: #d99a3f; --diff: #e06a5f; --missing: #6b7280;
    }}
  }}
  :root[data-theme="dark"] {{
    --bg: #15181c; --fg: #e8e8e8; --muted: #9aa0a6; --border: #30343a; --card-bg: #1c1f24;
    --pass: #4caf72; --known: #d99a3f; --diff: #e06a5f; --missing: #6b7280;
  }}
  * {{ box-sizing: border-box; }}
  body {{ margin: 0; background: var(--bg); color: var(--fg); font: 14px/1.4 -apple-system, Segoe UI, Roboto, sans-serif; }}
  header {{ position: sticky; top: 0; background: var(--bg); border-bottom: 1px solid var(--border); padding: 14px 16px; z-index: 5; }}
  h1 {{ font-size: 16px; margin: 0 0 10px; }}
  #search {{ width: 100%; max-width: 640px; padding: 8px 10px; font-size: 14px; border: 1px solid var(--border); border-radius: 6px; background: var(--card-bg); color: var(--fg); }}
  #matches {{ margin-top: 8px; max-height: 240px; overflow-y: auto; border: 1px solid var(--border); border-radius: 6px; display: none; background: var(--card-bg); max-width: 640px; }}
  #matches div {{ padding: 6px 10px; cursor: pointer; border-bottom: 1px solid var(--border); }}
  #matches div:last-child {{ border-bottom: none; }}
  #matches div:hover, #matches div.active {{ background: var(--border); }}
  .muted {{ color: var(--muted); }}
  main {{ padding: 16px; }}
  #current-title {{ font-size: 15px; margin-bottom: 4px; }}
  #current-meta {{ color: var(--muted); margin-bottom: 14px; font-size: 13px; }}
  .grid {{ display: grid; grid-template-columns: repeat(var(--cols, 3), minmax(0, 1fr)); gap: 14px; }}
  #cols-toggle {{ display: inline-flex; gap: 4px; margin-left: 12px; vertical-align: middle; }}
  #cols-toggle button {{ font-size: 12px; padding: 4px 9px; border: 1px solid var(--border); background: var(--card-bg); color: var(--fg); border-radius: 5px; cursor: pointer; }}
  #cols-toggle button.active {{ background: var(--fg); color: var(--bg); }}
  .legend {{ font-size: 12px; color: var(--muted); margin-top: 8px; max-width: 760px; }}
  .legend b {{ color: var(--fg); }}
  .card {{ border: 1px solid var(--border); border-radius: 8px; background: var(--card-bg); overflow: hidden; }}
  .card-head {{ display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-bottom: 1px solid var(--border); }}
  .set-name {{ font-weight: 600; font-size: 13px; }}
  .badge {{ font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px; color: #fff; }}
  .badge.PASS {{ background: var(--pass); }} .badge.KNOWN {{ background: var(--known); }}
  .badge.DIFF {{ background: var(--diff); }} .badge.ERROR {{ background: var(--diff); }}
  .badge.CAPTURED {{ background: var(--pass); }} .badge.missing {{ background: var(--missing); }}
  .card-body {{ padding: 10px; }}
  .card img {{ width: 100%; display: block; border: 1px solid var(--border); border-radius: 4px; background: #fff; }}
  .not-captured {{ padding: 30px 10px; text-align: center; color: var(--muted); font-style: italic; }}
  .actual {{ font-size: 11px; color: var(--muted); margin-top: 6px; word-break: break-word; }}
  .basis-note {{ font-size: 11px; color: var(--known); margin-top: 4px; }}
  #empty {{ color: var(--muted); padding: 40px 0; text-align: center; }}
  a.txtlink {{ font-size: 11px; }}
</style>
</head>
<body>
<header>
  <h1>Regression shot comparison <span class="muted">— strictly local, open via file://, no upload</span>
    <span id="cols-toggle">
      <span class="muted" style="font-size:12px;">cols:</span>
      <button data-cols="2">2</button><button data-cols="3">3</button><button data-cols="6">6</button>
    </span>
  </h1>
  <input id="search" type="text" placeholder="Type a shot id or bundle name, e.g. acc_RB01_ACC-02, key_RB06, RB05c..." autocomplete="off">
  <div id="matches"></div>
  <div class="legend">
    <b>PASS</b> rendered exactly as predicted. &nbsp;
    <b>KNOWN</b> differs from prediction, but the difference is already documented (see "basis" on the card) -- not a surprise. &nbsp;
    <b>DIFF</b> differs from prediction and nothing explains it yet -- the one result worth investigating. &nbsp;
    <b>The bullet notes</b> under a KNOWN card are the actual documented explanation(s) for that specific shot's difference, pulled from the planning oracle -- not shown on PASS cards, since there's nothing to explain there.
  </div>
</header>
<main>
  <div id="current-title"></div>
  <div id="current-meta"></div>
  <div id="viewer" class="grid"></div>
  <div id="empty">Start typing above to find a shot. {len(records)} shots indexed ({sum(1 for r in records if r["kind"]=="bundle")} bundle, {sum(1 for r in records if r["kind"]=="key")} key).</div>
</main>
<script>
const DATA = {DATA};
const SETS = {SETS_JSON};
const SET_LABEL = {{"prod-slds1":"Prod · SLDS1","prod-slds2":"Prod · SLDS2","prod-slds2-dark":"Prod · SLDS2 dark","dev-slds1":"Dev · SLDS1","dev-slds2":"Dev · SLDS2","dev-slds2-dark":"Dev · SLDS2 dark"}};
const byId = Object.fromEntries(DATA.map(r => [r.id, r]));

const search = document.getElementById('search');
const matches = document.getElementById('matches');
const viewer = document.getElementById('viewer');
const titleEl = document.getElementById('current-title');
const metaEl = document.getElementById('current-meta');
const emptyEl = document.getElementById('empty');

function renderMatches(q) {{
  if (!q) {{ matches.style.display = 'none'; matches.innerHTML = ''; return; }}
  const ql = q.toLowerCase();
  const hits = DATA.filter(r => r.id.toLowerCase().includes(ql) || r.bundle.toLowerCase().includes(ql) || r.card_title.toLowerCase().includes(ql)).slice(0, 40);
  matches.innerHTML = hits.map(r => `<div data-id="${{r.id}}">${{r.label}}</div>`).join('') || '<div class="muted">No matches</div>';
  matches.style.display = 'block';
  matches.querySelectorAll('div[data-id]').forEach(el => el.addEventListener('click', () => {{
    search.value = el.dataset.id; matches.style.display = 'none'; show(el.dataset.id);
  }}));
}}
search.addEventListener('input', () => renderMatches(search.value.trim()));
search.addEventListener('keydown', e => {{
  if (e.key === 'Enter') {{
    const exact = byId[search.value.trim()];
    if (exact) {{ matches.style.display = 'none'; show(exact.id); }}
  }}
}});
document.addEventListener('click', e => {{ if (!matches.contains(e.target) && e.target !== search) matches.style.display = 'none'; }});

function show(id) {{
  const r = byId[id];
  if (!r) return;
  emptyEl.style.display = 'none';
  titleEl.textContent = r.label;
  metaEl.textContent = `kind: ${{r.kind}}  |  bundle: ${{r.bundle}}  |  sobject: ${{r.sobject}}` + (r.kind === 'bundle' ? `  |  record: ${{r.record_id}}` : '');
  viewer.innerHTML = SETS.map(s => {{
    const e = r.sets[s];
    if (!e) {{
      return `<div class="card"><div class="card-head"><span class="set-name">${{SET_LABEL[s]}}</span><span class="badge missing">not captured</span></div><div class="not-captured">No data for this shot in this set</div></div>`;
    }}
    const badge = `<span class="badge ${{e.result}}">${{e.result}}</span>`;
    if (r.kind === 'bundle') {{
      return `<div class="card"><div class="card-head"><span class="set-name">${{SET_LABEL[s]}}</span>${{badge}}</div>
        <div class="card-body">
          <img src="${{e.img}}" alt="${{id}} - ${{s}}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=not-captured>Image not found on disk</div>'">
          ${{e.result === 'KNOWN' && e.notes && e.notes.length ? `<div class="basis-note">${{e.notes.map(n => '• ' + n).join('<br>')}}</div>` : ''}}
        </div></div>`;
    }}
    return `<div class="card"><div class="card-head"><span class="set-name">${{SET_LABEL[s]}}</span>${{badge}}</div>
      <div class="card-body">
        <img src="${{e.img}}" alt="${{id}} - ${{s}}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=not-captured>Image not found on disk</div>'">
        <div class="actual">${{e.chars}} chars &middot; <a class="txtlink" href="${{e.txt}}" target="_blank">open text</a></div>
      </div></div>`;
  }}).join('');
}}

// Column count: per-viewer convenience only (not part of the data), remembered across reloads.
function setCols(n) {{
  viewer.style.setProperty('--cols', n);
  document.querySelectorAll('#cols-toggle button').forEach(b => b.classList.toggle('active', b.dataset.cols == n));
  try {{ localStorage.setItem('regression-viewer-cols', n); }} catch (e) {{}}
}}
document.querySelectorAll('#cols-toggle button').forEach(b => b.addEventListener('click', () => setCols(b.dataset.cols)));
let savedCols = 3;
try {{ savedCols = parseInt(localStorage.getItem('regression-viewer-cols'), 10) || 3; }} catch (e) {{}}
setCols(savedCols);

// Deep link support: comparison.html#acc_RB01_ACC-02
if (location.hash.length > 1) {{
  const id = decodeURIComponent(location.hash.slice(1));
  if (byId[id]) {{ search.value = id; show(id); }}
}}
</script>
</body>
</html>
"""

out_path = OUT / "comparison.html"
out_path.write_text(html, encoding="utf-8")
print(f"wrote {out_path} ({len(records)} shots indexed, {len(html)//1024} KB)")
