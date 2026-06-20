// JavaScript-only module (no .html/.js-meta.xml) shared by components that expose
// configurable icon colors as CSS custom properties on a single child element.

/**
 * Sets CSS custom properties (e.g. --backgroundColor) on the element matching `selector`,
 * but only if at least one of `vars` has a real value - otherwise the element is left alone
 * so it keeps using whatever default styling its own CSS already defines.
 *
 * @param {LightningElement} component - the component calling this from its own renderedCallback
 * @param {string} selector - CSS selector for the element to set the custom properties on
 * @param {Object} vars - map of CSS custom property name (without "--") to value
 * @param {Object} [defaults] - fallback value to use for a given name when vars[name] is empty
 */
export function applyColorVars(component, selector, vars, defaults = {}) {
    const hasOverride = Object.values(vars).some((value) => value);
    if (!hasOverride) {
        return;
    }

    const target = component.template.querySelector(selector);
    if (!target) {
        return;
    }

    Object.entries(vars).forEach(([name, value]) => {
        target.style.setProperty(`--${name}`, value || defaults[name]);
    });
}
