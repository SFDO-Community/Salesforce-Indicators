import { api, wire } from 'lwc';
import LightningModal from 'lightning/modal';
import getIndicatorConfig from '@salesforce/apex/IndicatorController.getIndicatorBundle';
import { refreshApex } from '@salesforce/apex';

export default class IndicatorBundleKey extends LightningModal {

    @api bundleName;
    @api bundle;
    @api showRefresh = false;

    _bundle;
    wiredBundleResult;
    isOpen = false;
    isKeyLoading = false;

    @wire(getIndicatorConfig, { bundleDevName: '$bundleName' })
    wiredBundle(result) {
        this.wiredBundleResult = result;
        const { data, error } = result;
        if (data) this._bundle = data;
        if (data || error) this.isKeyLoading = false;
    }

    get displayBundle() {
        return this._bundle ?? this.bundle;
    }

    get bundleTitle() {
        return this.displayBundle?.CardTitle;
    }

    // The legend itself is rendered entirely by the child c-key component (see indicatorBundleKey.html);
    // this just forwards the modal footer's Expand/Collapse All button into it.
    handleState2(){
        this.isOpen = !this.isOpen;
        this.template.querySelector('c-key').handleState();
    }

    handleRefreshKey() {
        this.isKeyLoading = true;
        refreshApex(this.wiredBundleResult)
            .then(() => { this.isKeyLoading = false; })
            .catch(() => { this.isKeyLoading = false; });
    }

    handleOkay() {
        this.close('okay');
    }
}
