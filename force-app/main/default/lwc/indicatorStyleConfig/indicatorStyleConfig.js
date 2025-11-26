import { LightningElement, api } from 'lwc';
import { IMAGE_SOURCE_OPTIONS, IMAGE_SIZE_OPTIONS, transformConstantObject } from 'c/indicatorUtils';

export default class IndicatorStyleConfig extends LightningElement {
    @api
    get indicator() {
        return this._indicator;
    }
    set indicator(value) {
        this._indicator = value;
    }
    _indicator = {};
    get indicatorString() { return JSON.stringify(this.indicator) };

    imageSourceOptions = transformConstantObject(IMAGE_SOURCE_OPTIONS).options;
    imageSizeOptions = transformConstantObject(IMAGE_SIZE_OPTIONS).options;

    handleIndicatorPropertyChange(event) {
        if (event.currentTarget.dataset.property) {
            let target = event.currentTarget;
            let tagName = target.tagName.toLowerCase();
            let value;
            if (tagName === 'c-icon-selector') {
                value = event.detail;
            } else if (target.type === 'checkbox') {
                value = target.checked;
            } else if (tagName === 'lightning-combobox') {
                value = event.detail.value;
            } else {
                value = target.value;
            }

            console.log(`value is ${value}, property name is ${target.dataset.property}`);

            const detail = {
                index: this.indicator.index,
                value: value,
                propertyName: target.dataset.property,
            }
            const selectedEvent = new CustomEvent("indicatorchange", { detail });
            this.dispatchEvent(selectedEvent);

            if (target.dataset.property === 'iconSource') {
                const nullSourceEvent = new CustomEvent("indicatorchange", {
                    detail: {
                        value: null,
                        propertyName: 'sourceValue'
                    }
                });
                this.dispatchEvent(nullSourceEvent);
            }

            // this.indicator[target.dataset.property] = value;
            // if (target.dataset.property === 'iconSource') {
            //     this.indicator.sourceValue = null;
            // }
            // console.log(`updated indicator value = ${JSON.stringify(this.indicator)}`);
        }
    }
}