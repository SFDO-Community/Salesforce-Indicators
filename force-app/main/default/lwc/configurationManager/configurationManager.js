import { LightningElement, wire, track } from 'lwc';

import getIndicatorConfig from '@salesforce/apex/IndicatorController.getIndicatorBundle';
import getNewCmdtUrls from '@salesforce/apex/IndicatorController.getNewCmdtUrls';
import getBundleOptions from '@salesforce/apex/IndicatorListBundleSelector.getBundleOptions';
import getIndicatorBundleWrapper from '@salesforce/apex/IndicatorController.getIndicatorBundleWrapper';

import { refreshApex } from '@salesforce/apex';

import indicatorBuilderModal from 'c/indicatorBuilderModal';
import editIndicatorBundleModal from 'c/editIndicatorBundleModal';

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
            
            // Convert Indicator_Item_Extensions__r to Extensions for component compatibility
            if (wrapper.allItems && Array.isArray(wrapper.allItems)) {
                wrapper.allItems.forEach(item => {
                    if (item.Indicator_Item_Extensions__r) {
                        item.Extensions = item.Indicator_Item_Extensions__r.map(ext => ({
                            IsActive: ext.Active__c,
                            ContainsText: ext.Contains_Text__c,
                            TextOperator: ext.Text_Operator__c || 'Contains',
                            Maximum: ext.Maximum__c,
                            Minimum: ext.Minimum__c,
                            ExtensionHoverText: ext.Hover_Text__c,
                            ExtensionIconValue: ext.Icon_Value__c,
                            ExtensionImageUrl: ext.Image__c,
                            ExtensionTextValue: ext.Static_Text__c,
                            PriorityOrder: ext.Priority__c,
                            ExtensionDescription: ext.Description__c,
                            ExtensionId: ext.Id,
                            QualifiedApiName: ext.QualifiedApiName,  // Include QualifiedApiName for updates
                            Indicator_Item__c: ext.Indicator_Item__c, // Include relationship field for updates
                            BackgroundColor: ext.Icon_Background__c,
                            ForegroundColor: ext.Icon_Foreground__c
                        }));
                    }
                });
            }
            
            this.indicatorBundle = wrapper;
        }
        else if (error) {
            console.log(error);
        }
    }

    handleChange(event) {
        this.showSpinner = true;
        this.bundleName = event.detail.value;
        refreshApex(this.wiredData);
    }

    handleNewClick(event) {
        const developerName = (event.currentTarget.dataset || {}).developerName;
        console.log(developerName);
        /**This can be removed after proof of concept**/
        switch (developerName) {
            case Indicator_Bundle.objectApiName.replace('__c', ''):
                editIndicatorBundleModal.open().then((result) => {
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

    handleEditBundle(event) {
        console.log('🔧 Edit Bundle event received:', event.detail);
        console.log('🔧 Available bundle data:', this.bundle);
        console.log('🔧 Available indicator bundle:', this.indicatorBundle);
        console.log('🔧 Available bundleName:', this.bundleName);
        
        try {
            const bundleId = event.detail;
            
            // Use the current bundle data or find from indicatorBundle
            let bundleData = this.bundle;
            if (this.indicatorBundle?.bundle) {
                bundleData = this.indicatorBundle.bundle;
                console.log('🔧 Using indicatorBundle.bundle:', bundleData);
            } else if (this.bundle) {
                console.log('🔧 Using this.bundle:', bundleData);
            }
            
            // If we don't have bundle data, try to create it from available info
            if (!bundleData && this.bundleName) {
                bundleData = {
                    QualifiedApiName: this.bundleName,
                    Label: this.bundleName
                };
                console.log('🔧 Created minimal bundle data:', bundleData);
            }
            
            console.log('🔧 Final bundle data to pass:', bundleData);
            
            if (bundleData) {
                console.log('🔧 Opening modal with bundleData:', JSON.stringify(bundleData, null, 2));
                
                editIndicatorBundleModal.open({
                    size: 'large',
                    bundle: bundleData
                }).then((result) => {
                    console.log('🔧 Edit Bundle modal result:', result);
                }).catch((error) => {
                    console.error('🔧 Modal open error:', error);
                });
            } else {
                console.error('🔧 No bundle data available');
            }
        } catch (error) {
            console.error('🔧 handleEditBundle error:', error);
        }
    }

}