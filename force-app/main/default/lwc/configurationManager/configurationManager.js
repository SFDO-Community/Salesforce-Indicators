import { LightningElement, wire, track } from 'lwc';

import getIndicatorConfig from '@salesforce/apex/IndicatorController.getIndicatorBundle';
import getNewCmdtUrls from '@salesforce/apex/IndicatorController.getNewCmdtUrls';
import getBundleOptions from '@salesforce/apex/IndicatorListBundleSelector.getBundleOptions';
import getIndicatorBundleWrapper from '@salesforce/apex/IndicatorController.getIndicatorBundleWrapper';

import { refreshApex } from '@salesforce/apex';

import IndicatorEditModal from "c/indicatorEditModal";
import indicatorBuilderModal from 'c/indicatorBuilderModal';

import Indicator_Bundle from "@salesforce/schema/Indicator_Bundle__mdt";
import Indicator_Item from "@salesforce/schema/Indicator_Item__mdt";
import Indicator_Item_Extension from "@salesforce/schema/Indicator_Item_Extension__mdt";
import {RefreshEvent} from "lightning/refresh";

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

    indicatorBundle
    @wire(getIndicatorBundleWrapper, {QualifiedApiName : '$bundleName'})
    processIndicatorBundleWrapper ({ error, data }) {
        if(data){
            const wrapper = JSON.parse(JSON.stringify(data));
            (wrapper?.bundle?.Indicator_Bundle_Items__r || [])
                .forEach(bundleItem => {
                    bundleItem.Indicator_Item__r = (wrapper.allItems || [])
                        .find(item => item.QualifiedApiName === bundleItem.Indicator_Item__r.QualifiedApiName);
                })
            this.indicatorBundle = wrapper;
        }
        else if (error) {
            console.log(error)
        }
    }

    handleChange(event) {
        this.showSpinner = true;
        this.bundleName = event.detail.value;
        refreshApex(this.wiredData);
    }

    handleNewClick(event) {
        const developerName = (event.currentTarget.dataset || {}).developerName;

        /**This can be removed after proof of concept**/
        switch (developerName) {
            case Indicator_Bundle.objectApiName.replace('__c',''):
                IndicatorEditModal.open({
                    masterLabel:event.currentTarget.label,
                    objectApiName:Indicator_Bundle.objectApiName,
                    isNew:true,
                    size:'full'
                }).then((result) => {
                    console.log(result);
                });
                break;
            case Indicator_Item.objectApiName.replace('__c',''):
                this.openModal();
                break;
            default:
                window.open('/lightning/setup/CustomMetadata/page?address=' + event.target.value,'_blank');
        }
    }

    modalIsOpen = false;
    async openModal(indicatorId) {
        let indicator = {};
        if(indicatorId) indicator = this.indicatorBundle.allItems.find(item => item.Id === indicatorId) || {};

        this.modalIsOpen = true;
        this.modal = await indicatorBuilderModal.open({
            size: 'large',
            indicator
        }).then((result) => {
            this.modalIsOpen = false;
            this.dispatchEvent(new RefreshEvent());
        });
    }

    handleEditIndicator(event) {
        this.openModal(event.detail);
    }

}