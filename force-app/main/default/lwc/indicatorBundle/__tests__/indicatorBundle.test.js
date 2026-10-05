import { createElement } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import IndicatorBundle from 'c/indicatorBundle';
import FlowModal from 'c/flowModal';
import getIndicatorConfig from '@salesforce/apex/IndicatorController.getIndicatorBundle';

// __esModule: true is required on every one of these factories - without it, Babel's default-import
// interop treats the whole mock object as the default export instead of unwrapping `.default`,
// so `import x from '...'` ends up with x === { default: ... } rather than the intended value.
jest.mock('@salesforce/customPermission/Manage_Indicator_Key', () => ({ __esModule: true, default: false }), { virtual: true });

// LWC's compiler locks down component class prototypes (methods are non-writable/non-configurable),
// so jest.spyOn() on any IndicatorBundle.prototype method fails. Mocking the whole c/flowModal
// module - rather than spying on a method of our class - sidesteps that: it lets us assert whether
// the action fired without touching the frozen class at all.
jest.mock('c/flowModal', () => ({
    __esModule: true,
    default: { open: jest.fn().mockResolvedValue(undefined) }
}));

// sfdx-lwc-jest doesn't auto-generate a wire adapter for @salesforce/apex imports - unlike the
// lightning/uiRecordApi stub it ships, this needs its own explicit mock (per the tool's own
// "Wire Adapters" docs). jest.mock factories can't reference out-of-scope imports, so
// createApexTestWireAdapter is required lazily inside the factory instead.
jest.mock(
    '@salesforce/apex/IndicatorController.getIndicatorBundle',
    () => ({
        __esModule: true,
        default: require('@salesforce/wire-service-jest-util').createApexTestWireAdapter(jest.fn())
    }),
    { virtual: true }
);

// FORM_FACTOR is captured once, at module-import time, not read live on each access (confirmed
// empirically - a getter-based mock that changes value after import does NOT affect isTouchDevice
// on later component instances in the same test file). That means one formFactor value per test
// FILE, not per test - hence this file (Large/desktop) and the sibling
// indicatorBundle.touch.test.js (Small/touch) instead of one shared file with a mutable mock.
jest.mock('@salesforce/client/formFactor', () => ({ __esModule: true, default: 'Large' }), { virtual: true });

const RECORD_ID = '001000000000001AAA';

function makeBundle() {
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
                HoverValue: 'Hover text for this indicator',
                TextValue: '',
                IconName: 'standard:account',
                ImageUrl: '',
                DisplayFalse: false,
                EmptyStaticBehavior: '',
                ZeroBehavior: '',
                ActionType: 'Flow Modal',
                ActionTarget: 'Test_Flow',
                ActionConfirmRequired: false,
                Extensions: []
            }
        ]
    };
}

// mappedField is set to the same field the indicator reads (Name) purely to avoid a pre-existing
// quirk of this test double: sfdx-lwc-jest's createLdsTestWireAdapter broadcasts every .emit() to
// every @wire(getRecord, ...) subscriber in the component, regardless of that wire's own config -
// and indicatorBundle.js has two such wires (one for an optional mappedField, one for the actual
// indicator values). Leaving mappedField unset makes the first wire's handler call getFieldValue()
// with an undefined field path, which throws in the stub. Giving it a real, present field avoids
// that without changing anything relevant to the touch/desktop behavior under test.
async function setupComponent(bundle = makeBundle(), fieldValue = 'Acme') {
    const element = createElement('c-indicator-bundle', { is: IndicatorBundle });
    element.bundleName = 'Test_Bundle';
    element.recordId = RECORD_ID;
    element.objectApiName = 'Account';
    element.mappedField = 'Name';
    element.indsStyle = 'avatar';
    document.body.appendChild(element);

    getIndicatorConfig.emit(bundle);
    await Promise.resolve();

    getRecord.emit({
        apiName: 'Account',
        fields: { Name: { value: fieldValue } }
    });
    await Promise.resolve();
    await Promise.resolve();

    return element;
}

describe('c-indicator-bundle desktop (formFactor Large) indicator click behavior', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    it('fires the action on the first click, without requiring a popover reveal first', async () => {
        const element = await setupComponent();
        const itemEl = element.shadowRoot.querySelector('c-indicator-bundle-item');
        expect(itemEl).not.toBeNull();

        itemEl.click();
        await Promise.resolve();

        expect(FlowModal.open).toHaveBeenCalledTimes(1);
    });

    it('DisplayFalseAction unset: action is suppressed (no clickable class, no popover button, click no-ops) when the field is blank', async () => {
        const bundle = makeBundle();
        bundle.Items[0].DisplayFalse = true;
        const element = await setupComponent(bundle, '');

        const itemEl = element.shadowRoot.querySelector('c-indicator-bundle-item');
        expect(itemEl).not.toBeNull();

        itemEl.click();
        await Promise.resolve();
        expect(FlowModal.open).not.toHaveBeenCalled();

        const outerContainer = element.shadowRoot.querySelector('.ind-popover-container');
        outerContainer.dispatchEvent(new CustomEvent('mouseenter'));
        await Promise.resolve();
        expect(element.shadowRoot.querySelector('section.slds-popover button.slds-button_neutral')).toBeNull();
    });

    it('DisplayFalseAction set: action stays available and fires even when the field is blank', async () => {
        const bundle = makeBundle();
        bundle.Items[0].DisplayFalse = true;
        bundle.Items[0].DisplayFalseAction = true;
        const element = await setupComponent(bundle, '');

        const itemEl = element.shadowRoot.querySelector('c-indicator-bundle-item');
        expect(itemEl).not.toBeNull();

        itemEl.click();
        await Promise.resolve();

        expect(FlowModal.open).toHaveBeenCalledTimes(1);
    });

    it('ActionConfirmRequired: hover on the outer (indicator+popover) region reveals it, and the popover button fires the action', async () => {
        // Regression test: hover listeners must span BOTH the indicator and the popover together
        // on desktop (bound to .ind-popover-container, not just .ind-indicator-wrapper) - device
        // testing showed that with the narrow region alone, moving the mouse from the indicator
        // down into the popover crossed outside it and fired mouseleave, closing the popover
        // before the button could ever be reached/clicked.
        const bundle = makeBundle();
        bundle.Items[0].ActionConfirmRequired = true;
        const element = await setupComponent(bundle);

        const itemEl = element.shadowRoot.querySelector('c-indicator-bundle-item');
        itemEl.click(); // direct click must no-op when confirm is required
        await Promise.resolve();
        expect(FlowModal.open).not.toHaveBeenCalled();

        const outerContainer = element.shadowRoot.querySelector('.ind-popover-container');
        outerContainer.dispatchEvent(new CustomEvent('mouseenter'));
        await Promise.resolve();
        expect(element.shadowRoot.querySelector('section.slds-popover')).not.toBeNull();

        const actionButton = element.shadowRoot.querySelector('section.slds-popover button.slds-button_neutral');
        expect(actionButton).not.toBeNull();
        actionButton.click();
        await Promise.resolve();

        expect(FlowModal.open).toHaveBeenCalledTimes(1);
    });

    it('a mouseleave on the narrow inner wrapper alone does not close the popover on desktop', async () => {
        const element = await setupComponent();
        const outerContainer = element.shadowRoot.querySelector('.ind-popover-container');
        const innerWrapper = element.shadowRoot.querySelector('.ind-indicator-wrapper');

        outerContainer.dispatchEvent(new CustomEvent('mouseenter'));
        await Promise.resolve();
        expect(element.shadowRoot.querySelector('section.slds-popover')).not.toBeNull();

        innerWrapper.dispatchEvent(new CustomEvent('mouseleave'));
        await Promise.resolve();
        expect(element.shadowRoot.querySelector('section.slds-popover')).not.toBeNull();
    });
});
