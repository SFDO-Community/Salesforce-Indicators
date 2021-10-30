import { LightningElement, api, wire, track} from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import showExceptionGrid from '@salesforce/apex/ExceptionGridController.showExceptionGrid';

const columns = [
    { 
        label: 'Field', 
        fieldName: 'fieldName', 
        type: 'text', 
        initialWidth: 120,
        hideDefaultActions: true,
        clipText: true  
    },
    { 
        label: 'Icon', 
        cellAttributes: {
            iconName: { 
                fieldName: 'icon' 
            }, 
            iconAlternativeText: { 
                fieldName: 'icon' 
            }
        }, 
        initialWidth: 40,
        hideDefaultActions: true
    },
    { 
        label: 'Message', 
        fieldName: 'exceptionMessage', 
        type: 'text',
        hideDefaultActions: true,
        wrapText: true 
    }
];

export default class ExceptionGrid extends LightningElement {
    @api recordId;
    @track columns = columns;
    @track baseRecord;
    @track gridData;
    @track emptyGrid = true;


    @wire(getRecord, {recordId: '$recordId', fields: ['Id']})
    getbaseRecord({ data, error }) {
        if (data) {
            this.baseRecord = data;
            this._refreshView();
        } else if (error) {
            console.error('ERROR => ', JSON.stringify(error)); 
        }
    }

    _refreshView(){
    showExceptionGrid({ recordId: this.recordId })
        .then(result => {
            this.gridData = result; 
            console.log('Grid Size First =>', this.gridData.length); 
            if(this.gridData.length > 0) {
                this.emptyGrid = false;
                console.log('Grid Size IF > 0 =>', this.gridData.length);  
              }                     
        })
        .catch(error => {
            console.error('ERROR => ', JSON.stringify(error)); 
        })
    }
    
}