# Relative Dates — Follow-Up Spec

Status snapshot (updated 2026-11-09). The core feature is **implemented**: `DateUtility` parses
relative and definite dates into a `DateRange`, `IndicatorController` sends `StartDate`/`EndDate` to the
LWC, and `indicatorBundle.js` evaluates date operators at render time. This document now tracks only
what is left.

## Reference material

- `docs/resources/developer-guide-dates.md` — official SOQL relative date literal table (start/end
  boundaries, the `LAST_N_DAYS`/`LAST_90_DAYS` "includes today" exception, the `=` vs `</>` rule).
- `docs/resources/help-gude-dates.md` — official Reports/Dashboards relative date filter table,
  including the standard-vs-custom-field-filter distinction for `NEXT n DAYS`.
- `docs/resources/date-diagram.png` — Salesforce's own diagram of what's included/excluded per literal.

## What was delivered

- `DateUtility.convertRelativeDateRange` / `convertRelativeDate` / `convertDefiniteDate` (`YYYY-MM-DD`),
  returning `DateRange` (`StartDate` inclusive, `EndDate` exclusive).
- `IndicatorController.IndicatorExtension` exposes `StartDate` and `EndDate`; non-date values leave both null
  and are treated as plain text.
- `Text_Operator__c` picklist gained `Before Start`, `After Start`, `Before End`, `After End` (the
  `Before`/`After` values are inactive). Together with `Equals`/`Does Not Equal` these cover
  `=`, `<`, `>`, `<=`, `>=`:

| Operator | Boundary used |
|---|---|
| Equals | `field >= StartDate AND field < EndDate` |
| Does Not Equal | negation of the above |
| Before Start (`<`) | `field < StartDate` |
| After End (`>`) | `field >= EndDate` |
| Before End (`<=`)* | `field < EndDate` |
| After Start (`>=`)* | `field >= StartDate` |

\* Inferred by symmetry; the official docs only show `=`, `<`, `>`.

- `indicatorBundle.js` compares the record value (converted via `isDateValue`/`toDateKey`) against the
  boundaries as ISO strings.
- `Contains_Text__c` help text documents relative and `YYYY-MM-DD` values.
- A validation rule ensures known Date/DateTime fields use the correct `Contains_Text__c` form.

## Decisions

- **Field-type awareness:** the LWC does not receive the field type; it treats a value as a date when
  Apex parsed `Contains_Text__c` into a range and the record value looks like an ISO date. A validation
  rule covers known Date/DateTime fields. We deliberately do **not** validate relative-date syntax in a
  validation rule.
- **Fiscal periods:** deferred (see below).
- **Key LWC wording:** deferred (see below).

## Remaining work

### 1. `N=0` semantics (small)
Salesforce's docs never state what `N=0` should do. In `DateUtility` it falls out as a no-op
(`addDays(0)` etc.). Quick checks so far: `LAST_N_DAYS:0` with `Equals` behaves like "today".
- Add a few `N=0` unit tests to `DateUtilityTests` to pin the behavior for each unit
  (days/weeks/months/quarters/years and `LAST`/`NEXT`/`*AGO` variants).
- Document the behavior on `convertRelativeDateRange` or in the user docs.
- Optional: confirm against a live SOQL query using temporary `Opportunity.CloseDate` records.

### 2. Fiscal periods — future
`FISCAL YEAR` / `FISCAL QUARTER` literals still throw `DateConversionException`
(`DateUtility.cls`, `// TODO: FISCAL YEAR/QUARTER`). The regex already isolates the tokens; only the
arithmetic is missing. Open decision: standard fiscal years only (shift by
`Organization.FiscalYearStartMonth`), or also custom fiscal years (`Period`/`FiscalYearSettings`, which can
have non-uniform periods).

### 3. Key LWC wording — after this PR
`key.js` builds `ExtensionLogic` as `FieldLabel + OPERATOR + "ContainsText"`, which reads acceptably but
not nicely for the new operators (e.g. `BEFORE START "NEXT 5 DAYS"`). Revisit when the Key LWC is reworked.

### 4. Verify DateTime timezone handling
Confirm how `toDateKey` converts DateTime values near midnight (UTC vs. user timezone) against
Apex's `Date.today()` base. Not yet verified.
