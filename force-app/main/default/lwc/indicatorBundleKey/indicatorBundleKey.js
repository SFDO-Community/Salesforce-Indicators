import { api } from 'lwc';
import LightningModal from 'lightning/modal';

export default class IndicatorBundleKey extends LightningModal {

    @api bundleName;
    @api bundle;

    isOpen = false;

    get bundleTitle() {
        return this.bundle.CardTitle;
    }

    // The legend itself is rendered entirely by the child c-key component (see indicatorBundleKey.html);
    // this just forwards the modal footer's Expand/Collapse All button into it.
    handleState2(){
        this.isOpen = !this.isOpen;
        this.template.querySelector('c-key').handleState();
    }

    handleOkay() {
        this.close('okay');
    }
}
