import { LightningElement } from 'lwc';

// sfdx-lwc-jest doesn't ship a stub for lightning/modal (a newer base component), so this
// project provides its own per the "Other Component Mocks" pattern in the sfdx-lwc-jest docs.
export default class LightningModal extends LightningElement {
    static open() {
        return Promise.resolve();
    }

    close(result) {
        this.dispatchEvent(new CustomEvent('lightningmodalclose', { detail: result }));
    }
}
