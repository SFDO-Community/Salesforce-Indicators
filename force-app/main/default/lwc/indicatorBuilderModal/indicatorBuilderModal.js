/**
 * Created by common-unite on 9/27/24.
 */

import {api, track} from 'lwc';
import LightningModal from 'lightning/modal';
import deployIndicatorBundles from '@salesforce/apex/MetadataUtility.deployIndicatorBundles';

export default class IndicatorBuilderModal extends LightningModal {

    @api get indicator() {
        return this._indicator
    };
    set indicator(value) {
        if(value) {
            const clonedValue = JSON.parse(JSON.stringify(value));
            for (let key in clonedValue) {
                if (key.endsWith('__r')) {
                    let newKey = key.replace('__r', '__c');
                    clonedValue[newKey] = clonedValue[key].QualifiedApiName;
                    delete clonedValue[key];
                }
            }
            this._indicator = clonedValue;
        }
        else this._indicator = {};
    }
    @track _indicator = {}

    hasChanges = false
    saveInProgress = false;

    deployMetaData() {
        const wrapper = {
            indicatorItem: JSON.parse(JSON.stringify(this.indicator))
        }
        const wrapperString = JSON.stringify(wrapper);

        console.log(JSON.parse(JSON.stringify(wrapper)));

       deployIndicatorBundles({wrapper:wrapperString})
            .then(result => {
                console.log('deploymentId = '+result);
                this.close(result);
            })
            .catch(error => {
                console.log(error);
            })
            .finally(() => {
               this.saveInProgress = false;
               this.hasChanges = false;
            });
    }

    handleIndicatorValueChange(event) {
        const fieldApiName = event.detail.fieldApiName;
        const value = event.detail.value;
        if(fieldApiName) {
            this._indicator[fieldApiName] = value;
            this.hasChanges = true;
        }
    }
    handleSaveIndicatorMetadata(event) {
        this.saveInProgress = true;
        this.deployMetaData();
    }
}