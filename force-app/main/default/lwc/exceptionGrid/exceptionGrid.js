import { LightningElement, api, wire} from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { getRecordNotifyChange } from 'lightning/uiRecordApi';
import showExceptionGrid from '@salesforce/apex/ExceptionGridController.showExceptionGrid';

const columns = [
    { label: 'Field Name', fieldName: 'fieldName', type: 'text' },
    { label: 'Error', fieldName: 'isError', type: 'boolean' },
    { label: 'Exception Message', fieldName: 'exceptionMessage', type: 'text' }
];

export default class ExceptionGrid extends LightningElement {
    columns = columns;
    @api 
    recordId;
 
    gridData;
    @wire(showExceptionGrid, { recordId: '$recordId' })
    retrieveExceptions(wireResult){
        const { data, error } = wireResult;
        this.gridData = wireResult;
        if(data){
            console.log("ExceptData", data)
            this.records = data
        }
        if(error) {
            console.error(error)
        }
    }
    
    handler() { 
        updateRecordApexMethod()
        .then(() => {
            refreshApex(this.gridData);
            getRecordNotifyChange([{recordId: this.recordId}]); // Refresh the Lightning Data Service cache
        });
      }
}