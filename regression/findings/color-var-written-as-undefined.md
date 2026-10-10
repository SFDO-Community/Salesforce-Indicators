# Finding: configuring only ONE of Icon Background / Icon Foreground writes the text "undefined" into a CSS variable

**Found by:** the dev-only feature tests (avatar tab on SLDS1), 2026-10-08; confirmed with a live DOM probe.
**Severity:** visual bug. An indicator (or the card icon, or the Key's icon) that has a custom **background** but no **foreground** renders a **black glyph**
instead of the theme's default (white) glyph; the mirror case (foreground only) leaves the background variable invalid.

## What happens
`indicatorCssVars.applyColorVars()` is shared by the card header icon (`indicatorBundle.js:267`), the avatar (`indicatorBundleItem.js:55`), the Key's icon
(`key.js:47`) and the pill. When *either* colour is configured it writes *both* CSS custom properties:

```js
target.style.setProperty(`--${name}`, value || defaults[name]);
```

Those callers pass no `defaults`, so the missing colour is written as `undefined`. Chrome stores the literal text. Live probe of an avatar with only a background
(extension `E14_04`, bg `#757575`, no foreground), inline style on the icon element:

```
--backgroundColor: #757575; --foregroundColor: undefined;
```

The stylesheets map the SLDS icon hooks to those variables (`--slds-c-icon-color-foreground: var(--foregroundColor)`). `undefined` is a valid *token* but not a valid
*colour*, so the hook is invalid at computed time and the icon's fill falls back to the browser default: **black glyph**. On SLDS1 (which honours the background) this
shows as a black icon on a coloured circle. (The Badge is unaffected: it passes theme-aware `defaults`.)

## Fix (applied in this repo, verified by unit tests; NOT yet deployed or re-captured)
`force-app/main/default/lwc/indicatorCssVars/indicatorCssVars.js`: set the property only when there is a real value; otherwise **remove** it, so `var(--name)` stays unset,
the hook's own fallback applies, and a value left by an earlier render is cleared:

```js
const resolved = value || defaults[name];
if (resolved) target.style.setProperty(`--${name}`, resolved);
else target.style.removeProperty(`--${name}`);
```

Tests: `indicatorCssVars/__tests__/indicatorCssVars.test.js` (6). **3 fail without the fix** (background-only, foreground-only, stale value not cleared) and all 6 pass with it;
the full suite is 31 of 31. (jsdom ignores `setProperty(name, undefined)` while Chrome writes `"undefined"`, so the tests spy on the call itself.)

## Verified in the org (2026-10-08, LWC redeployed to SLDS1, SLDS2 and SLDS2-dark)
- Live probe, avatar `E14_04` (background only): inline style is now `--backgroundColor: #757575;` with **no** `--foregroundColor` entry (before: `--foregroundColor: undefined;`).
- SLDS1 screenshot: that indicator's glyph is now **white** (it was black); indicators with both colours are unchanged.
- `features.spec.ts` now fails any indicator whose inline CSS variables contain the text `undefined` (a permanent guard for this bug class). With the fix deployed it passes 312 of 312 on all three themes.

## Related
The card header icon and the Key icon share the bug, so a card with only `Card_Icon_Background__c` (or only `...Foreground__c`) is affected too. A card-colour bundle and a Key
capture are planned to cover all four combinations (both, background only, foreground only, none) on all three themes.
