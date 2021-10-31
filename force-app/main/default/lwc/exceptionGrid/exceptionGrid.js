import { LightningElement, api, wire, track} from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import showExceptionGrid from '@salesforce/apex/ExceptionGridController.showExceptionGrid';

const columns = [
    { 
        label: 'Field', 
        fieldName: 'fieldName', 
        type: 'text', 
        initialWidth: 150,
        hideDefaultActions: true,
        clipText: true  
    },
    { 
        label: 'Value', 
        fieldName: 'fieldValue', 
        type: 'text', 
        initialWidth: 150,
        hideDefaultActions: true,
        wrapText: true  
    },
    { 
        label: 'Error', 
        fieldName: 'isError', 
        type: 'boolean', 
        initialWidth: 50,
        hideDefaultActions: true,
        clipText: true  
    },
    /*{ 
        label: 'Icon', 
        cellAttributes: {
            iconName: { 
                fieldName: 'icon' 
            }, 
            iconAlternativeText: { 
                fieldName: 'icon' 
            }
        }, 
        initialWidth: 50,
        hideDefaultActions: true
    },*/
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
    @track errorOccurred = false;
    @track errorMessgae = '';


    @wire(getRecord, {recordId: '$recordId', layoutTypes: ['Compact'], modes: ['View'] })
    getbaseRecord({ data, error }) {
        if (data) {
            this.baseRecord = data;
            this.errorOccurred = false;
            this._refreshView();
        } else if (error) {
            this.errorOccurred = true;
            this.errorMessage = JSON.stringify(error);
            console.error('ERROR => ', JSON.stringify(error)); 
        }
    }

    _refreshView(){
    showExceptionGrid({ recordId: this.recordId })
        .then(result => {
            this.gridData = result;
            this.errorOccurred = false; 
            console.log('Grid Size First =>', this.gridData.length); 
            if(this.gridData.length > 0) {
                this.emptyGrid = false;
                console.log('Grid Size IF > 0 =>', this.gridData.length);  
              } else {
                this.emptyGrid = true;
                console.log('Grid Size IF = 0 =>', this.gridData.length);
              }                    
        })
        .catch(error => {
            this.errorOccurred = true;
            this.errorMessage = JSON.stringify(error);
            console.error('ERROR => ', JSON.stringify(error)); 
        })
    }
    
}