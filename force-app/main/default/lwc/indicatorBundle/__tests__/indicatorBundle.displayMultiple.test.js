import { createElement } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import IndicatorBundle from 'c/indicatorBundle';
import getIndicatorConfig from '@salesforce/apex/IndicatorController.getIndicatorBundle';
// Same mocks as indicatorBundle.test.js (see the notes there for why each one is needed).
jest.mock('@salesforce/customPermission/Manage_Indicator_Key', () => ({ __esModule: true, default: false }), { virtual: true });
jest.mock('c/flowModal', () => ({ __esModule: true, default: { open: jest.fn().mockResolvedValue(undefined) } }));
jest.mock(
    '@salesforce/apex/IndicatorController.getIndicatorBundle',
    () => ({
        __esModule: true,
        default: require('@salesforce/wire-service-jest-util').createApexTestWireAdapter(jest.fn())
    }),
    { virtual: true }
);
jest.mock('@salesforce/client/formFactor', () => ({ __esModule: true, default: 'Large' }), { virtual: true });

// Regression tests for two reports from human testing: (1) with Display Multiple on, the matched
// Extensions rendered with no hover/popover (their results had no fId/popover fields), and (2) a
// Boolean field must never render "true"/"false" as text (Use Field Value), only its icon.
// Same mocks as indicatorBundle.test.js (see the notes there for why each one is needed).
const RECORD_ID = '001000000000001AAA';

function makeBundle(itemOverrides = {}) {
    return {
        IsActive: true,
        ObjectName: 'Account',
        CardTitle: 'Test Bundle',
        CardIcon: 'standard:account',
        CardText: '',
        Items: [
            {
                IndicatorId: 'item1',
                FieldApiName: 'Name',
                FieldLabel: 'Name',
                IsActive: true,
                DisplayMultiple: true,
                HoverValue: '',
                TextValue: '',
                IconName: 'standard:account',
                ImageUrl: '',
                DisplayFalse: false,
                EmptyStaticBehavior: '',
                ZeroBehavior: '',
                Extensions: [],
                ...itemOverrides
            }
        ]
    };
}

const ext = (id, text, hover, icon) => ({
    ExtensionId: id,
    IsActive: true,
    ContainsText: text,
    TextOperator: 'Contains',
    ExtensionIconValue: icon,
    ExtensionHoverText: hover
});

async function setupComponent(bundle, fieldValue, indsStyle = 'avatar', displayValue, props = {}) {
    const element = createElement('c-indicator-bundle', { is: IndicatorBundle });
    element.bundleName = 'Test_Bundle';
    element.recordId = RECORD_ID;
    element.objectApiName = 'Account';
    element.mappedField = 'Name';
    element.indsStyle = indsStyle;
    Object.assign(element, props);
    document.body.appendChild(element);

    getIndicatorConfig.emit(bundle);
    await Promise.resolve();

    getRecord.emit({ apiName: 'Account', fields: { Name: { value: fieldValue, displayValue } } });
    await Promise.resolve();
    await Promise.resolve();
    return element;
}

describe('c-indicator-bundle Display Multiple', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    it('shows each matched Extension its own hover text in the popover', async () => {
        const bundle = makeBundle({
            Extensions: [ext('e1', 'acme', 'First hover', 'utility:one'), ext('e2', 'corp', 'Second hover', 'utility:two')]
        });
        const element = await setupComponent(bundle, 'Acme Corp');

        const containers = element.shadowRoot.querySelectorAll('.ind-popover-container');
        expect(containers.length).toBe(2);

        containers[1].dispatchEvent(new CustomEvent('mouseenter'));
        await Promise.resolve();

        // Only the hovered indicator opens, and it carries its own Extension's text.
        const popovers = element.shadowRoot.querySelectorAll('section.slds-popover');
        expect(popovers.length).toBe(1);
        expect(popovers[0].textContent).toContain('Second hover');
    });
});

describe('c-indicator-bundle Boolean field', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    it('Use Field Value does not render "true" as Avatar text (the icon shows instead)', async () => {
        const bundle = makeBundle({ DisplayMultiple: false, EmptyStaticBehavior: 'Use Field Value' });
        const element = await setupComponent(bundle, true);
        const child = element.shadowRoot.querySelector('c-indicator-bundle-item');
        expect(child.indText).toBeFalsy();
        expect(child.indIcon).toBe('standard:account');
    });

    it('Badge with no Badge/Pill Text does not render "true" as its label', async () => {
        const bundle = makeBundle({ DisplayMultiple: false });
        const element = await setupComponent(bundle, true, 'badge');
        const child = element.shadowRoot.querySelector('c-indicator-bundle-badge');
        expect(child.indText).toBe('');
    });

    it('Use Field Value shows the display (not raw) value for non-Boolean fields', async () => {
        const bundle = makeBundle({ DisplayMultiple: false, EmptyStaticBehavior: 'Use Field Value', IconName: '', HoverValue: 'x' });
        const element = await setupComponent(bundle, 'Acme');
        const child = element.shadowRoot.querySelector('c-indicator-bundle-item');
        expect(child.indText).toBe('Acm');
    });

    it('Use Field Value shows a zero as "0" (0 is a value, not blank)', async () => {
        const bundle = makeBundle({ DisplayMultiple: false, EmptyStaticBehavior: 'Use Field Value', IconName: '', HoverValue: 'x' });
        const element = await setupComponent(bundle, 0);
        const child = element.shadowRoot.querySelector('c-indicator-bundle-item');
        expect(child.indText).toBe('0');
    });

    // Zero Value Handling (Zero_Behavior__c) decides whether 0 is a value or blank. The record's
    // display value for a zero is "0" either way, so it must not leak through when 0 is blank.
    it('Treat Zeroes as Numbers shows a zero as "0"', async () => {
        const bundle = makeBundle({ DisplayMultiple: false, ZeroBehavior: 'Treat Zeroes as Numbers', EmptyStaticBehavior: 'Use Field Value', IconName: '', HoverValue: 'x' });
        const element = await setupComponent(bundle, 0, 'avatar', '0');
        expect(element.shadowRoot.querySelector('c-indicator-bundle-item').indText).toBe('0');
    });

    it('Treat Zeroes as Blanks shows the blank (False) text, not "0", even though the display value is "0"', async () => {
        const bundle = makeBundle({
            DisplayMultiple: false, ZeroBehavior: 'Treat Zeroes as Blanks', EmptyStaticBehavior: 'Use Field Value',
            IconName: '', HoverValue: 'x', DisplayFalse: true, FalseTextValue: 'No', FalseIcon: 'utility:close'
        });
        const element = await setupComponent(bundle, 0, 'avatar', '0');
        const child = element.shadowRoot.querySelector('c-indicator-bundle-item');
        expect(child.indText).toBe('No');
    });

    it('Treat Zeroes as Blanks renders nothing when Show False or Blank is off', async () => {
        const bundle = makeBundle({
            DisplayMultiple: false, ZeroBehavior: 'Treat Zeroes as Blanks', EmptyStaticBehavior: 'Use Field Value',
            IconName: '', HoverValue: 'x', DisplayFalse: false
        });
        const element = await setupComponent(bundle, 0, 'avatar', '0');
        expect(element.shadowRoot.querySelector('c-indicator-bundle-item')).toBeNull();
    });

    it('Treat Zeroes as Blanks on a Badge shows no "0" label', async () => {
        const bundle = makeBundle({
            DisplayMultiple: false, ZeroBehavior: 'Treat Zeroes as Blanks',
            DisplayFalse: true, FalseBadgePillText: 'None', FalseIcon: 'utility:close'
        });
        const element = await setupComponent(bundle, 0, 'badge', '0');
        expect(element.shadowRoot.querySelector('c-indicator-bundle-badge').indText).toBe('None');
    });
});

// Badge/Pill labels fall back to the field's display value when no Badge/Pill Text is configured.
// 0 is a value (Zero Value Handling "Treat Zeroes as Numbers"), so it must show as a label, not
// be treated as blank. A formatted display value (e.g. a currency "$0.00") must win over the raw 0.
describe('c-indicator-bundle Badge/Pill label for zero', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    it('Badge shows a raw 0 as "0" when there is no display value', async () => {
        const bundle = makeBundle({ DisplayMultiple: false, ZeroBehavior: 'Treat Zeroes as Numbers' });
        const element = await setupComponent(bundle, 0, 'badge');
        expect(element.shadowRoot.querySelector('c-indicator-bundle-badge').indText).toBe('0');
    });

    it('Pill shows a raw 0 as "0" when there is no display value', async () => {
        const bundle = makeBundle({ DisplayMultiple: false, ZeroBehavior: 'Treat Zeroes as Numbers' });
        const element = await setupComponent(bundle, 0, 'pill');
        expect(element.shadowRoot.querySelector('c-indicator-bundle-pill').indBadgePillText).toBe('0');
    });

    it('Badge prefers the formatted display value for a zero (e.g. currency)', async () => {
        const bundle = makeBundle({ DisplayMultiple: false, ZeroBehavior: 'Treat Zeroes as Numbers' });
        const element = await setupComponent(bundle, 0, 'badge', '$0.00');
        expect(element.shadowRoot.querySelector('c-indicator-bundle-badge').indText).toBe('$0.00');
    });

    it('Badge shows the blank (False) label, not "0", under Treat Zeroes as Blanks', async () => {
        const bundle = makeBundle({
            DisplayMultiple: false, ZeroBehavior: 'Treat Zeroes as Blanks',
            DisplayFalse: true, FalseBadgePillText: 'None', FalseIcon: 'utility:close'
        });
        const element = await setupComponent(bundle, 0, 'badge', '0');
        expect(element.shadowRoot.querySelector('c-indicator-bundle-badge').indText).toBe('None');
    });
});

// "Show field value as hover fallback" is a page property: with no Hover Text configured, the popover shows
// the field's display value. 0 is a value, so it must open a popover showing "0", not be treated as empty.
describe('c-indicator-bundle popover fallback for zero', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    it('shows "0" in the popover when the fallback is on and the value is 0', async () => {
        const bundle = makeBundle({ DisplayMultiple: false, ZeroBehavior: 'Treat Zeroes as Numbers', HoverValue: '' });
        const element = await setupComponent(bundle, 0, 'avatar', undefined, { showFieldValueAsHoverFallback: true });
        const container = element.shadowRoot.querySelector('.ind-popover-container');
        expect(container.classList.contains('has-popover')).toBe(true);
        container.dispatchEvent(new CustomEvent('mouseenter'));
        await Promise.resolve();
        expect(element.shadowRoot.querySelector('section.slds-popover').textContent).toContain('0');
    });

    it('shows no popover for a zero treated as blank (Treat Zeroes as Blanks)', async () => {
        const bundle = makeBundle({ DisplayMultiple: false, ZeroBehavior: 'Treat Zeroes as Blanks', HoverValue: '', DisplayFalse: true, FalseIcon: 'utility:close' });
        const element = await setupComponent(bundle, 0, 'avatar', '0', { showFieldValueAsHoverFallback: true });
        const container = element.shadowRoot.querySelector('.ind-popover-container');
        expect(container.classList.contains('has-popover')).toBe(false);
    });
});
