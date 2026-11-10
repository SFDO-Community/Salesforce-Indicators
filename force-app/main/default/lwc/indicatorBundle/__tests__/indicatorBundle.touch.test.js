import { createElement } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import IndicatorBundle from 'c/indicatorBundle';
import FlowModal from 'c/flowModal';
import getIndicatorConfig from '@salesforce/apex/IndicatorController.getIndicatorBundle';

// See indicatorBundle.test.js for why each formFactor value needs its own file (FORM_FACTOR is
// captured once at module-import time, not read live), and why the other mocks below look the
// way they do (__esModule interop, c/flowModal instead of spying on a frozen class prototype,
// and the manual @salesforce/apex wire adapter mock).
jest.mock('@salesforce/customPermission/Manage_Indicator_Key', () => ({ __esModule: true, default: false }), { virtual: true });

jest.mock('c/flowModal', () => ({
    __esModule: true,
    default: { open: jest.fn().mockResolvedValue(undefined) }
}));

jest.mock(
    '@salesforce/apex/IndicatorController.getIndicatorBundle',
    () => ({
        __esModule: true,
        default: require('@salesforce/wire-service-jest-util').createApexTestWireAdapter(jest.fn())
    }),
    { virtual: true }
);

jest.mock('@salesforce/client/formFactor', () => ({ __esModule: true, default: 'Small' }), { virtual: true });

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

// Real elapsed time, not just a microtask tick - needed between simulated *distinct* taps so
// TOUCH_TOGGLE_DEDUP_WINDOW_MS (which exists only to bridge a single tap's own paired
// mouseenter+click) has genuinely expired, the same way it would between two real separate taps.
function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function setupComponent() {
    const element = createElement('c-indicator-bundle', { is: IndicatorBundle });
    element.bundleName = 'Test_Bundle';
    element.recordId = RECORD_ID;
    element.objectApiName = 'Account';
    element.mappedField = 'Name';
    element.indsStyle = 'avatar';
    document.body.appendChild(element);

    getIndicatorConfig.emit(makeBundle());
    await Promise.resolve();

    getRecord.emit({
        apiName: 'Account',
        fields: { Name: { value: 'Acme' } }
    });
    await Promise.resolve();
    await Promise.resolve();

    return element;
}

describe('c-indicator-bundle touch (formFactor Small) indicator click behavior', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    it('tapping the indicator (mouseenter, since click is unreliable on touch) only ever toggles the popover - never fires the action', async () => {
        const element = await setupComponent();
        const containerEl = element.shadowRoot.querySelector('.ind-indicator-wrapper');
        expect(containerEl).not.toBeNull();

        containerEl.dispatchEvent(new CustomEvent('mouseenter')); // open
        await Promise.resolve();
        expect(element.shadowRoot.querySelector('section.slds-popover')).not.toBeNull();
        expect(FlowModal.open).not.toHaveBeenCalled();

        await wait(200); // simulate a genuinely separate later tap, not the same tap's own events
        containerEl.dispatchEvent(new CustomEvent('mouseenter')); // close
        await Promise.resolve();
        expect(element.shadowRoot.querySelector('section.slds-popover')).toBeNull();

        await wait(200);
        containerEl.dispatchEvent(new CustomEvent('mouseenter')); // open again
        await Promise.resolve();
        expect(element.shadowRoot.querySelector('section.slds-popover')).not.toBeNull();

        // The synthetic mouseleave a real tap would also fire must not undo the toggle.
        containerEl.dispatchEvent(new CustomEvent('mouseleave'));
        await Promise.resolve();
        expect(element.shadowRoot.querySelector('section.slds-popover')).not.toBeNull();

        expect(FlowModal.open).not.toHaveBeenCalled();
    });

    it('tapping the indicator itself (click) never fires the action, even while the popover is open', async () => {
        const element = await setupComponent();
        const containerEl = element.shadowRoot.querySelector('.ind-indicator-wrapper');
        const itemEl = element.shadowRoot.querySelector('c-indicator-bundle-item');

        containerEl.dispatchEvent(new CustomEvent('mouseenter')); // open via mouseenter
        await Promise.resolve();
        expect(element.shadowRoot.querySelector('section.slds-popover')).not.toBeNull();

        itemEl.click(); // a click may still land (just unreliably) - it must be a no-op on touch
        await Promise.resolve();

        expect(FlowModal.open).not.toHaveBeenCalled();
        expect(element.shadowRoot.querySelector('section.slds-popover')).not.toBeNull();
    });

    it('fires the action only when the popover\'s own button is tapped', async () => {
        const element = await setupComponent();
        const containerEl = element.shadowRoot.querySelector('.ind-indicator-wrapper');

        containerEl.dispatchEvent(new CustomEvent('mouseenter')); // open the popover
        await Promise.resolve();

        const actionButton = element.shadowRoot.querySelector('section.slds-popover button.slds-button_neutral');
        expect(actionButton).not.toBeNull();

        actionButton.click();
        await Promise.resolve();

        expect(FlowModal.open).toHaveBeenCalledTimes(1);
    });

    it('falls back to click driving the toggle when mouseenter does not fire on a repeat tap (the pill/anchor case)', async () => {
        // Real anchors (the pill's clickable path) retain the browser's hover/focus state, so
        // device testing showed mouseenter only fires on the *first* tap of a given pill - not on
        // repeat taps - while click fires reliably every tap. Simulate that exact asymmetry:
        // first tap fires both events (mouseenter opens, click is deduped as a no-op); the second
        // tap fires *only* click, which must still close it.
        const element = await setupComponent();
        const containerEl = element.shadowRoot.querySelector('.ind-indicator-wrapper');
        const itemEl = element.shadowRoot.querySelector('c-indicator-bundle-item');

        containerEl.dispatchEvent(new CustomEvent('mouseenter')); // first tap: mouseenter opens
        itemEl.click(); // first tap: click deduped as a no-op
        await Promise.resolve();
        expect(element.shadowRoot.querySelector('section.slds-popover')).not.toBeNull();

        await wait(200); // simulate a genuinely separate later tap, not the same tap's own events
        itemEl.click(); // second tap: mouseenter does NOT fire this time - click alone must close it
        await Promise.resolve();
        expect(element.shadowRoot.querySelector('section.slds-popover')).toBeNull();
        expect(FlowModal.open).not.toHaveBeenCalled();
    });

    it('a mouseenter landing on the popover button cannot close the popover out from under itself', async () => {
        // Regression test: the popover (including its button) is a sibling of .ind-indicator-
        // wrapper, not a descendant, specifically so this can't happen - device testing showed a
        // tap on the button re-triggering the indicator's own mouseenter and closing the popover
        // (destroying the button) before its click could ever fire the action.
        const element = await setupComponent();
        const containerEl = element.shadowRoot.querySelector('.ind-indicator-wrapper');

        containerEl.dispatchEvent(new CustomEvent('mouseenter')); // open the popover
        await Promise.resolve();

        const actionButton = element.shadowRoot.querySelector('section.slds-popover button.slds-button_neutral');
        actionButton.dispatchEvent(new CustomEvent('mouseenter', { bubbles: true }));
        await Promise.resolve();

        expect(element.shadowRoot.querySelector('section.slds-popover')).not.toBeNull();

        actionButton.click();
        await Promise.resolve();

        expect(FlowModal.open).toHaveBeenCalledTimes(1);
    });
});
