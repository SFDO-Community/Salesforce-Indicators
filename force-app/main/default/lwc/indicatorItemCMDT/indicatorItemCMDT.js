import { LightningElement, api, wire } from 'lwc';
import showIndicators from '@salesforce/apex/IndicatorsController.showIndicators';

const columns = [
    { label: 'Field Name', fieldName: 'fieldName', type: 'text' },
    { label: 'Icon Name', fieldName: 'iconName', type: 'text' },
    { label: 'Text Value', fieldName: 'textValue', type: 'text' },
    { label: 'Image URL', fieldName: 'imgURL', type: 'text' },
    { label: 'Hover Text', fieldName: 'hoverText', type: 'text' }
];

export default class IndicatorItemCMDT extends LightningElement {
    @api
    recordId;

    columns = columns;

    @wire(showIndicators, { recordId: '$recordId' })
    indData;
}