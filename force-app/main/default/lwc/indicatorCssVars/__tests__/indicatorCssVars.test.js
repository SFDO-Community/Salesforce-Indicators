import { applyColorVars } from '../indicatorCssVars';

// applyColorVars is shared by the card icon, the Key icon, the avatar, the badge and the pill. It must never write the
// literal string "undefined" into a CSS custom property: that is a valid-looking but meaningless value, so the SLDS icon
// hook that reads it becomes invalid and the glyph falls back to the browser default (black) instead of the theme default.
// Found by the dev-only feature tests (an avatar with only a background colour rendered a black glyph on SLDS1).
function setup() {
    const target = document.createElement('div');
    const component = { template: { querySelector: jest.fn(() => target) } };
    return { target, component };
}

describe('applyColorVars', () => {
    it('sets both variables when both colours are configured', () => {
        const { target, component } = setup();
        applyColorVars(component, '.x', { backgroundColor: '#111111', foregroundColor: '#eeeeee' });
        expect(target.style.getPropertyValue('--backgroundColor')).toBe('#111111');
        expect(target.style.getPropertyValue('--foregroundColor')).toBe('#eeeeee');
    });

    it('does not write the string "undefined" when only the background is configured', () => {
        const { target, component } = setup();
        // jsdom silently ignores setProperty(name, undefined), but Chrome writes the literal text "undefined": so assert on the call itself.
        const setProperty = jest.spyOn(target.style, 'setProperty');
        applyColorVars(component, '.x', { backgroundColor: '#111111', foregroundColor: undefined });
        expect(setProperty).not.toHaveBeenCalledWith('--foregroundColor', undefined);
        expect(setProperty).not.toHaveBeenCalledWith('--foregroundColor', 'undefined');
        expect(target.style.getPropertyValue('--backgroundColor')).toBe('#111111');
        expect(target.style.getPropertyValue('--foregroundColor')).toBe('');
        expect(target.style.cssText).not.toContain('undefined');
    });

    it('does not write the string "undefined" when only the foreground is configured', () => {
        const { target, component } = setup();
        const setProperty = jest.spyOn(target.style, 'setProperty');
        applyColorVars(component, '.x', { backgroundColor: '', foregroundColor: '#eeeeee' });
        expect(setProperty).not.toHaveBeenCalledWith('--backgroundColor', undefined);
        expect(setProperty).not.toHaveBeenCalledWith('--backgroundColor', '');
        expect(target.style.getPropertyValue('--foregroundColor')).toBe('#eeeeee');
        expect(target.style.getPropertyValue('--backgroundColor')).toBe('');
        expect(target.style.cssText).not.toContain('undefined');
    });

    it('clears a variable that was set on an earlier render when its colour is later removed', () => {
        const { target, component } = setup();
        applyColorVars(component, '.x', { backgroundColor: '#111111', foregroundColor: '#eeeeee' });
        applyColorVars(component, '.x', { backgroundColor: '#111111', foregroundColor: undefined });
        expect(target.style.getPropertyValue('--foregroundColor')).toBe('');
    });

    it('uses the supplied default for a missing colour', () => {
        const { target, component } = setup();
        applyColorVars(component, '.x', { backgroundColor: '#111111', foregroundColor: undefined }, { foregroundColor: 'white' });
        expect(target.style.getPropertyValue('--foregroundColor')).toBe('white');
    });

    it('leaves the element alone when no colour is configured', () => {
        const { target, component } = setup();
        applyColorVars(component, '.x', { backgroundColor: undefined, foregroundColor: '' });
        expect(target.style.cssText).toBe('');
    });
});
