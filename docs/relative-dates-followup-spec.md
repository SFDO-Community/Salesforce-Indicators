# Relative Dates — Follow-Up Spec

Status snapshot for picking this work back up in a new session. Everything below assumes
`force-app/main/default/classes/DateUtility.cls` and `DateUtilityTests.cls` are already merged as of
this writing (unified regex parser, `DateRange` with `StartDate`/`EndDate`, `convertAltRelativeDate`
removed).

**Sequencing note:** there is an in-progress LWC refactor on another branch. The LWC-facing work in
this spec (Phase 2 below) should not start until that branch is merged, to avoid compounding merge
conflicts in `indicatorBundle.js` / `indicatorBundleKey.js` / `key.js`.

## Reference material

- `docs/resources/developer-guide-dates.md` — official SOQL relative date literal table (start/end
  boundaries, the `LAST_N_DAYS`/`LAST_90_DAYS` "includes today" exception, the `=` vs `</>` rule).
- `docs/resources/help-gude-dates.md` — official Reports/Dashboards relative date filter table,
  including the standard-vs-custom-field-filter distinction for `NEXT n DAYS`.
- `docs/resources/date-diagram.png` — Salesforce's own diagram of what's included/excluded per literal.

## Phase 1 — Apex-side loose ends (small, no LWC dependency)

### 1a. `N=0` semantics
Explicitly deferred during the `DateRange` work. Salesforce's docs never state what `N=0` should do.
Mathematically it already falls out as a no-op everywhere in `DateUtility` (`addDays(0)`, `addMonths(0)`,
etc. return the input date unchanged), so no code change is anticipated — this is purely a
documentation/decision task:
- Confirm the no-op behavior is what we want for every unit (days/weeks/months/quarters/years, and
  their `LAST`/`NEXT`/`*AGO` variants).
- Write that decision down somewhere a config author would see it (CMDT field help text, package
  documentation, or a class-level doc comment on `convertRelativeDateRange`).
- Optional: empirically confirm against a live SOQL query (same technique used for the `LAST_N_YEARS`
  check this session — temporary `Opportunity.CloseDate` records in the scratch org) if we want
  certainty that Salesforce's own engine treats `N=0` the same way.

### 1b. `FISCAL YEAR` / `FISCAL QUARTER` support
Still a `TODO` / throws `DateConversionException` in `DateUtility.convertRelativeDateRange`. The
unified regex already isolates the right tokens in Group 3 (`FISCAL QUARTER`, `FISCAL QUARTERS`,
`FISCAL QUARTERS AGO`, `FISCAL YEAR`, `FISCAL YEARS`, `FISCAL YEARS AGO`) — the parsing is ready, only
the arithmetic branch is missing. This is a bigger lift than calendar quarters/years because:
- Standard fiscal years just shift the calendar by `Organization.FiscalYearStartMonth` (straightforward).
- **Custom** fiscal years (per-org `Period` records) can have non-uniform period lengths and
  non-quarter-aligned boundaries — simple `addMonths(3)` math is not valid there.
- Need to decide: support standard fiscal years only (simpler, covers most orgs), or also support
  custom fiscal years (requires querying `Period`/`FiscalYearSettings`).

## Phase 2 — Wire relative dates into the Indicator LWC framework

This is the actual product goal: let an admin configure a relative date string in Custom Metadata and
have the Indicator LWCs evaluate a record's date field against it at render time. **Do this after the
LWC refactor branch merges.**

### Current state (as of this session)

- `Indicator_Item_Extension__mdt.Contains_Text__c` already gets run through
  `DateUtility.convertRelativeDate` in `IndicatorController.cls` (lines ~234-238 and ~339-343), populating
  `IndicatorController.ItemExtensionWrapper.DateToCompare` (an `@AuraEnabled Date`). The conversion is
  wrapped in a try/catch that silently swallows `DateConversionException` ("Contains text is not a
  relative date") — i.e. today, any value that isn't a relative date is just treated as plain text.
- **`DateToCompare` is computed but never consumed.** Confirmed by reading `indicatorBundle.js`
  (~lines 263-307): the actual extension-matching logic only branches on `extension.ContainsText`
  (case-insensitive string ops: Contains/Does Not Equal/Equals/Starts With) or `extension.Minimum`/
  `Maximum` (numeric range). There is no date-comparison branch at all yet.
- `Indicator_Item_Extension__mdt.Text_Operator__c` picklist currently has exactly 4 values: `Contains`,
  `Does Not Equal`, `Equals`, `Starts With`. No `Before`/`After`/date-style operators exist yet.
- `key.js` / `indicatorBundleKey.js` build a human-readable `ExtensionLogic` string (e.g.
  `FieldLabel + Operator + "ContainsText"`) purely from the raw configured strings — this happens to
  keep working for relative dates without changes, since the raw string ("NEXT 5 DAYS" etc.) is still
  meaningful to read.

### Operator → boundary mapping (derived and verified this session)

Confirmed by cross-checking all 10 `</>` worked examples in the SOQL developer doc — zero exceptions:

| Operator | Boundary used |
|---|---|
| Equals | `field >= range.StartDate AND field < range.EndDate` |
| Does Not Equal | negation of the above |
| Before (`<`) | `field < range.StartDate` |
| After (`>`) | `field >= range.EndDate` |
| On or Before (`<=`)* | `field < range.EndDate` |
| On or After (`>=`)* | `field >= range.StartDate` |

\* Inferred by symmetry, not directly confirmed by a worked example — the official docs only show
`=`, `<`, `>`. Worth a quick empirical SOQL check (same scratch-org technique as this session) before
relying on it, if `<=`/`>=`-style operators get added.

### Open design questions for the next session

1. **CMDT shape.** Does `Text_Operator__c`'s picklist grow to include date-style values (`Before`,
   `After`, maybe `On or Before`/`On or After`), reusing the existing `Contains_Text__c` field for the
   relative-date string? Or does a date comparison need its own dedicated extension fields, separate
   from the text-comparison ones? The current single-field-dual-purpose design (text vs. relative-date
   string, disambiguated only by whether `DateUtility` can parse it) is what exists today — worth
   deciding explicitly whether that's the long-term shape or a stopgap.
2. **Field-type awareness.** The LWC needs to know the target field is a Date/DateTime field before
   attempting a date comparison (vs. treating `ContainsText` as a literal string). Confirm where field
   type is/should be resolved — `IndicatorController.cls` already does schema describes for field
   labels; check whether field type is already available there or needs to be added to the wrapper sent
   to the LWC.
3. **What does the LWC receive?** Today only a single `DateToCompare` (`StartDate`) crosses the
   Apex→LWC boundary. Decide whether to send both `StartDate`/`EndDate` (likely necessary, given the
   table above) as two `@AuraEnabled` properties, or have `IndicatorController` resolve the
   operator-appropriate single boundary server-side and keep the LWC dumb. Sending both is probably
   more robust (matches `DateUtility.DateRange` as already implemented) since it keeps the
   range-vs-operator logic in one place rather than duplicating it.
4. **Record field value type on the LWC side.** `indicatorBundle.js`'s `dataValue` for a date field will
   arrive as a string from `getFieldValue`; needs proper `Date`/comparable conversion before comparing
   against `DateToCompare`/range boundaries (the existing string-comparison branch won't apply).
5. **`ExtensionLogic` display text.** Once real Before/After operators exist, decide whether the
   human-readable logic string needs to change wording (e.g. "Close Date is BEFORE NEXT 5 DAYS") or if
   the existing raw-concatenation approach already reads fine.
