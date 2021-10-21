import { LightningElement, api, wire} from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import showExceptionGrid from '@salesforce/apex/ExceptionGridController.showExceptionGrid';

const columns = [
    { label: 'Field Name', fieldName: 'fieldName', type: 'text' },
    { label: 'Error', fieldName: 'isError', type: 'boolean' },
    { label: 'Exception Message', fieldName: 'exceptionMessage', type: 'text' }
];

export default class ExceptionGrid extends LightningElement {
    @api recordId;
    columns = columns;
    account;
    gridData;
    err;

    @wire(getRecord, {recordId: '$recordId', fields: ['Account.Id']})
    getaccountRecord({ data, error }) {
        console.log('accountRecord => ', data, error);
        if (data) {
            this.account = data;
            this._refreshView();
        } else if (error) {
            console.error('ERROR => ', JSON.stringify(error)); // handle error properly
        }
    }

    _refreshView(){
    console.log('In Refresh View => ', JSON.stringify(this.account));
    showExceptionGrid({ recordId: this.recordId })
         .then(result => {
            this.gridData = result;
            console.log('Grid Data After => ', JSON.stringify(this.gridData));
        })
        .catch(error => {
            this.err = error;
        })
    }
    
}