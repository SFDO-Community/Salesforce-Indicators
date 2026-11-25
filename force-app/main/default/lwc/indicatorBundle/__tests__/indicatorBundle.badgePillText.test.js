import { createElement } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import IndicatorBundle from 'c/indicatorBundle';
import getIndicatorConfig from '@salesforce/apex/IndicatorController.getIndicatorBundle';

// Regression tests for {!Field} merge tokens in item-level Badge/Pill Text and the inverse (false-state)
// Badge/Pill Text. Found by the dev-only feature tests (regression/findings/badge-pill-merge-token.md): the label
// was built from the original wired item, which still held the raw token, instead of the merged copy in itemsById.
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
                DisplayMultiple: false,
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

async function setupComponent(bundle, fieldValue, indsStyle) {
    const element = createElement('c-indicator-bundle', { is: IndicatorBundle });
    element.bundleName = 'Test_Bundle';
    element.recordId = RECORD_ID;
    element.objectApiName = 'Account';
    element.mappedField = 'Name';
    element.indsStyle = indsStyle;
    document.body.appendChild(element);

    getIndicatorConfig.emit(bundle);
    await Promise.resolve();

    getRecord.emit({ apiName: 'Account', fields: { Name: { value: fieldValue } } });
    await Promise.resolve();
    await Promise.resolve();
    return element;
}

describe('c-indicator-bundle Badge/Pill Text merge tokens', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    it.each([
        ['badge', 'c-indicator-bundle-badge', 'indText'],
        ['pill', 'c-indicator-bundle-pill', 'indBadgePillText']
    ])('%s: resolves {!Field} in Badge/Pill Text (true state)', async (style, selector, prop) => {
        const element = await setupComponent(makeBundle({ BadgePillText: 'Account is {!Name}' }), 'Acme', style);
        const child = element.shadowRoot.querySelector(selector);
        expect(child).not.toBeNull();
        expect(child[prop]).toBe('Account is Acme');
    });

    it('badge: resolves {!Field} in the inverse Badge/Pill Text; a blank field resolves to an empty string, not the raw token', async () => {
        const bundle = makeBundle({ DisplayFalse: true, FalseBadgePillText: 'Missing:{!Name}.' });
        const element = await setupComponent(bundle, '', 'badge');
        const child = element.shadowRoot.querySelector('c-indicator-bundle-badge');
        expect(child).not.toBeNull();
        expect(child.indText).toBe('Missing:.');
    });
});
