# DRAFT: Styling Salesforce Indicators so they look right everywhere

> **Status: draft for the maintainers to edit.** Every statement below was observed in a scratch org running the
> next-release build (dev), on **SLDS1**, **SLDS2 (Cosmos)** and **SLDS2 dark mode**, by the feature test suite in
> `regression/`. Items marked **[after release]** describe behavior that depends on a fix that was not yet released when
> this was written. Remove the marker once it ships. Screenshots referenced here are produced by
> `features.spec.ts` (`regression/playwright/output/<env>-<theme>/features/shots/`).

An indicator is configured once (Custom Metadata) but it is **drawn by the page's theme**. The same configuration can look
quite different on SLDS1, SLDS2 and dark mode, so a few habits make the difference between "works on my screen" and
"works for everyone".

## 1. Set the background, the icon color **and** the text color together
If you override only one color, the others come from the theme, and the theme's defaults are not the same everywhere:

| What you set | SLDS1 | SLDS2 (light) | SLDS2 dark mode |
|---|---|---|---|
| Avatar **Icon Background** | applied | **ignored** (default icon color) | **ignored** |
| Avatar icon with a custom background but no **Icon Foreground** | glyph is **black** | n/a (background ignored) | n/a |
| Badge/Pill with a light background and no **Badge/Pill Text Color** | dark text, readable | dark text, readable | **light text on a light background: hard to read** |

**Advice:** when you choose a background, always choose the foreground and the text color with it. Use dark text on light
backgrounds and white text on dark backgrounds, and check the result in dark mode before you ship. Don't count on an
avatar's custom background showing up on SLDS2: treat it as a bonus on SLDS1 only, and make sure the icon itself carries
the meaning.

## 2. Badge and Pill shapes follow the theme
SLDS1 draws badges as fully rounded pills. SLDS2 and dark mode draw rounded rectangles. Don't design around an exact shape.

## 3. Badge/Pill label: what shows, and what doesn't inherit
The visible label is **Badge/Pill Text**, separate from **Hover Text** (which only feeds the popover). Order of choice:

1. A matching **extension's** Badge/Pill Text, else
2. the **item's** Badge/Pill Text, else
3. the field's value as the user sees it (formatted).

**An extension owns its own look.** If an extension matches and leaves Badge/Pill Text, Text Color or Icon Position blank, it
does **not** borrow the item's values (the label falls back to the field value, and there is no custom color). Fill in what you
want on the extension itself.

## 4. If you use **Show False or Blank**, also set the **Inverse Badge/Pill Text**
When the field is blank and you want an indicator for that state, avatars show the inverse icon. A Badge or Pill with **no
Inverse Badge/Pill Text** still draws a chip, but with an **icon only and no words**. That can be exactly what you want, or it can look
like a stray bubble. Add the text if it should say something such as "No rating yet".

## 5. Merge tokens: `{!Field_API_Name}`
Hover Text, Badge/Pill Text and the Action Target can include the record's own values, for example
`Ticker Symbol is {!TickerSymbol}` or `https://finance.yahoo.com/quote/{!TickerSymbol}`.

- If the field behind a token is **blank**, the token becomes an **empty string** (you get `Number is []`, not the raw
  `{!AccountNumber}`). Write your text so it still reads sensibly when the value is missing.
- **[after release]** Tokens in the item-level **Badge/Pill Text** (and the inverse label) are resolved. Earlier builds showed the raw
  `{!Field}` text in the badge; tokens in Hover Text and in extensions' Badge/Pill Text were never affected.

## 6. The hover popover appears only when there is something to show
No Hover Text and no action means no popover. If you would like every indicator to show its value on hover, turn on
**"Show field value in popover when Hover Text is blank"** on the component (a page-level setting). Note this gives every indicator a
popover, which changes how taps behave on mobile.

## 7. Actions
- **URL** actions open the link in a **new tab**. Merge tokens in the link are filled in from the record.
- **Flow Modal** actions open a screen flow in a dialog over the record. A flow that only displays information is the
  safest thing to launch from an indicator.
- The button defaults to **Open** (URL) or **Launch** (Flow); set **Action Button Label** to say something specific.
- **Confirm Required** means clicking the indicator itself does nothing; the user must click the button in the popover.
- Actions are hidden in the false/blank state unless you also turn on **Show False or Blank Action**.

## 8. Relative dates
Date extensions compare a record's Date or Date/Time field with a relative literal such as `TODAY`, `YESTERDAY`, `TOMORROW`,
`LAST MONTH`, `THIS MONTH`, `NEXT 30 DAYS` or `THIS YEAR` (spaces or underscores both work). The six operators:

| Operator | Matches when the record's date is... |
|---|---|
| Equals | inside the range |
| Does Not Equal | outside the range |
| Before Start | before the range begins |
| After End | after the range ends (the end day itself is **not** inside the range) |
| Before End | before the range's end (so it includes the whole range) |
| After Start | on or after the range's first day |

Notes: `NEXT 30 DAYS` starts **tomorrow**; "today" is the date of the **user viewing the record** (their org time zone), not the browser's
clock; a record with **no date** never matches an extension and shows the item's "false/blank" state. Fiscal periods are not supported.

## 9. Mapping a custom field
**[after release]** Pick custom fields from the **Field** list like any other. Earlier builds could not save an item that mapped a custom
field this way (a validation rule rejected it); the **Advanced Field** box was the workaround.

---
### What this advice is based on (for the maintainers)
| Claim | Evidence |
|---|---|
| Colors by theme (section 1, 2) | Same configuration captured on three theme orgs; avatar/badge shots under `output/dev-*/features/shots/` |
| Extension owns its look (3) | Oracle rows `F14_03`, `F14_04`; all PASS on 3 themes |
| Empty chip when no inverse text (4) | `F14_06` on the blank record |
| Blank token -> empty string (5) | `F15_03`: popover text `Number is []` |
| Popover rules, fallback flag (6) | `F15_*`, `RF17` bundle (flag on) |
| Actions (7) | `features.actions.spec.ts`, 11 checks x 3 themes |
| Dates (8) | `features.dates.spec.ts`: 15 operator/literal items x 11 records x 3 styles; results computed independently of the product code |
| Items marked [after release] | `regression/findings/badge-pill-merge-token.md`, `one-field-mapping-required-custom-field.md` |
