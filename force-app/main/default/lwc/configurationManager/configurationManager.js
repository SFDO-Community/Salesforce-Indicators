import { LightningElement, wire, track, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

import getIndicatorConfig from '@salesforce/apex/IndicatorController.getIndicatorBundle';
import getNewCmdtUrls from '@salesforce/apex/IndicatorController.getNewCmdtUrls';
import getBundleOptions from '@salesforce/apex/IndicatorListBundleSelector.getBundleOptions';
import { refreshApex } from '@salesforce/apex';

export default class ConfigurationManager extends NavigationMixin(LightningElement) {
    @api flexipageRegionWidth;
    bundleName = '';
    bundle;
    showKey = false;
    showSpinner = false;
    isKeyLoading = false;
    options = [];
    newUrls = [];
    error;
    errorMessage;

    // Used for refreshing Apex
    wiredCmdt;
    wiredData;

    connectedCallback(){
        // console.log('Picklist Wire call');
        getBundleOptions()
            .then((result)=>{
                this.options = result;
            })
            .catch((error)=>{
                console.error(error);
                this.errorMessage = 'Unable to load the list of Indicator Bundles.';
            });
        getNewCmdtUrls()
            .then((result)=>{
                this.newUrls = result.Entities;
                // console.dir(this.newUrls);
            })
            .catch((error)=>{
                console.error(error);
                this.errorMessage = 'Unable to load the New Custom Metadata menu.';
            });
    }

    @wire(getIndicatorConfig, {bundleDevName : '$bundleName'})
    bundleWire (result) {
        // console.log('Config Wire call');
        this.wiredData = result;
        const { data, error } = result;

        if (data){
            this.showKey = this.bundleName ? true : false;
            this.error = undefined;
            this.errorMessage = undefined;
            this.bundle = data;
            // console.log('Selected: ', this.bundleName);
            // console.dir(this.bundle);
        } else if (error){
            this.showKey = false;
            this.error = error;
            this.errorMessage = 'Unable to load the selected Indicator Bundle.';
            this.bundle = undefined;
        }

        if (data || error) this.isKeyLoading = false;
        this.showSpinner = false;
    }

    handleChange(event) {
        this.showSpinner = true;
        this.bundleName = event.detail.value;
        refreshApex(this.wiredData);
    }

    handleNewClick(event) {
        this.navigateToCmdt('/lightning/setup/CustomMetadata/page?address=' + event.target.value);
    }

    handleRefreshKey() {
        this.isKeyLoading = true;
        refreshApex(this.wiredData)
            .then(() => { this.isKeyLoading = false; })
            .catch(() => { this.isKeyLoading = false; });
    }

    handlePreviewClick() {
        this[NavigationMixin.Navigate]({
            type: 'standard__component',
            attributes: {
                componentName: 'c__recipePreviewer'
            }
        });
    }

    navigateToCmdt(url) {
        // window.open() is distorted by Lightning Web Security for Setup pages;
        // a real anchor click uses native browser navigation instead. See docs/sdd/0002-window-open.md.
        const link = this.refs.cmdtLink;
        link.href = url;
        link.click();
    }

    get selectorSize() {
        if (this.flexipageRegionWidth === 'SMALL') return 12;
        if (this.flexipageRegionWidth === 'MEDIUM') return 6;
        return 3;
    }

}