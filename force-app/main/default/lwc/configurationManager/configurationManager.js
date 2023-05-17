import { LightningElement, wire, track } from 'lwc';

import getIndicatorConfig from '@salesforce/apex/IndicatorController.getIndicatorBundle';
import getNewCmdtUrls from '@salesforce/apex/IndicatorController.getNewCmdtUrls';
import getBundleOptions from '@salesforce/apex/IndicatorListBundleSelector.getBundleOptions';
import { refreshApex } from '@salesforce/apex';

export default class ConfigurationManager extends LightningElement {
    bundleName = '';
    bundle;
    showKey = false;
    showSpinner = false;
    options = [];
    newUrls = [];
    error;

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
                console.log('Error');
                console.dir(JSON.parse(JSON.stringify(error)));
            });
        getNewCmdtUrls()
            .then((result)=>{
                this.newUrls = result.Entities;
                // console.dir(this.newUrls);
            })
            .catch((error)=>{
                console.log('Error');
                console.dir(JSON.parse(JSON.stringify(error)));
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
            this.bundle = data;
            console.log('Selected: ', this.bundleName);
            // console.dir(this.bundle);
        } else if (error){
            this.showKey = false;
            this.error = error;
            this.bundle = undefined;
        }

        this.showSpinner = false;
    }

    handleChange(event) {
        this.showSpinner = true;
        this.bundleName = event.detail.value;
        refreshApex(this.wiredData);
    }

    handleNewClick(event) {
        // console.dir(event);
        window.open('/lightning/setup/CustomMetadata/page?address=' + event.target.value,'_blank');
    }

}