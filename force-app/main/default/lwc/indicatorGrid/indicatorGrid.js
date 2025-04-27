import { LightningElement, api, wire, track } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import getIndicatorConfig from '@salesforce/apex/IndicatorController.getIndicatorBundle';
import template1 from "./indicatorGrid1.html";
import template2 from "./indicatorGrid2.html";
import template3 from "./indicatorGrid3.html";

export default class IndicatorGrid extends LightningElement {
    @api recordId;
    @api objectApiName;
    @api bundleName;
    @api isStandardUsage = false;
    @api columns = 1;
    @api templateId = 1;
    
    @track bundle;
    @track card = {};
    @track wiredCmdt;
    @track apiFieldnameDefinitions = [];
    @track recordData;
    @track errorOccurred = false;
    @track errorMessage;
    @track bundleActive = false;
    @track showIllustration = false;
    @track illustration = {};
    @track sectionBodyClass = '';
    @track indicators = [];

    isSelectedAll = true;

    render() {
        switch(this.templateId){
            case '1':
                return template1;
            case '2':
                return template2;
            case '3':
                return template3;
            default:
                return template1;
        }
    }

    get filterAllVariant(){
        return this.isSelectedAll ? 'brand' : 'neutral';
    }
    
    handleFilterClick(event){
        this.isSelectedAll = !this.isSelectedAll;
    }

    // Call the Apex Class to return the CMDT Bundle, Items, and Extensions wrapper.
    @wire(getIndicatorConfig, {bundleDevName : '$bundleName'})
    bundleWire (result) {
        this.wiredCmdt = result;
        const { data, error } = result;
        if(data) {
            if(Object.keys(data).length) {  // Used to confirm that values were returned, rather than an empty object
                this.bundle = data;
                this.bundleActive = true;
                this.errorOccurred = false;
                this.errorMessage = undefined;

                if(!this.bundle.IsActive){
                    this.errorOccurred = true;
                    this.bundleActive = false;
                    this.showIllustration = true;
                    this.illustration = {
                        heading : 'Uh oh!',
                        messageBody: 'Bundle (' + this.bundleName + ') not found. Check if it\'s active.',
                        imageName: 'error:no_access'
                    }
                } else {
                    // Assign the values to the card
                    this.card = {
                        title : this.bundle.CardTitle,
                        icon: this.bundle.CardIcon,
                        body: this.bundle.CardText
                    }

                    if(this.bundle.CardIconBackground || this.bundle.CardIconForeground ){
                        this.card.iconClass = 'cardIcon slds-media__figure slds-var-m-right_x-small ';
                    } else {
                        this.card.iconClass = 'slds-media__figure slds-var-m-right_x-small ';
                    }

                    if(this.isStandardUsage != true){
                        this.sectionBodyClass = 'slds-grid grid-wrap slds-card__body slds-card__body_inner';
                    } else {
                        this.card.iconClass = 'slds-media__figure slds-var-m-right_x-small';
                        this.sectionBodyClass = 'slds-grid grid-wrap slds-card__body';
                    }

                    if(this.bundle.Items.length === 0){
                        this.showIllustration = true;
                        this.illustration = {
                            heading : 'Bundle has no items!',
                            messageBody: 'Better assign some Indicator Items to this Bundle.',
                            imageName: 'misc:no_content'
                        }
                    }
                    
                    // Loop through the returned CMDT indicator settings and assign the Api Fields which should be queried
                    for( let i = 0; i < this.bundle.Items.length; i++){
                        let apiFieldSyntax = '' + this.objectApiName + '.' + this.bundle.Items[i].FieldApiName;
                        this.apiFieldnameDefinitions = [...this.apiFieldnameDefinitions, apiFieldSyntax];
                    }
                }
            } else {
                console.log('No such Bundle');
                this.card = {
                    title : 'Uh Oh!',
                    icon: 'utility:error',
                    body: 'No results were found for the assigned indicator bundle.'
                }
                this.bundleActive = false;
            }
        } else if (error) {
            console.log('Error querying Bundle');
            this.bundle = undefined;
            this.bundleActive = false;
            this.errorOccurred = true;
            this.errorMessage = JSON.stringify(error);
        }
    }
    
    // Get the record data for the fields defined in the bundle
    @wire(getRecord, { recordId: '$recordId', fields: '$apiFieldnameDefinitions' })
    wiredRecord({ error, data }) {
        if (data) {
            this.recordData = data;
            this.errorOccurred = false;
            this.processIndicators();
        } else if (error) {
            this.errorOccurred = true;
            this.errorMessage = 'Error loading record data: ' + JSON.stringify(error);
        }
    }
    
    // Process the indicators based on the record data and bundle configuration
    processIndicators() {
        if (!this.bundle || !this.recordData) return;
        
        this.indicators = [];
        
        this.bundle.Items.forEach(item => {
            if (!item.IsActive) return;
            
            const fieldName = item.FieldApiName;
            const fieldValue = this.getFieldValue(fieldName);
            
            let indicator = {
                fieldLabel: item.FieldLabel,
                fieldApiName: fieldName,
                fieldValue: fieldValue,
                message: '',
                classification: '',
                iconClass: '',
                iconName: ''
            };
            
            // Determine classification based on field value and configuration
            console.log('Field value:', fieldValue);
            console.log('Field Type', typeof fieldValue);
            this.determineClassification(indicator, item, fieldValue);
            console.log(JSON.stringify(indicator));
            
            this.indicators.push(indicator);
        });
    }
    
    // Get field value from the record data
    getFieldValue(fieldName) {
        if (!this.recordData || !this.recordData.fields || !this.recordData.fields[fieldName]) {
            return null;
        }
        return this.recordData.fields[fieldName].value;
    }
    
    // Determine the classification of the indicator based on the field value and configuration
    determineClassification(indicator, item, fieldValue) {
        // Check if field is empty
        const isFalse = fieldValue === null || fieldValue === undefined || fieldValue === '' || fieldValue === false || (fieldValue === 0 && item.ZeroBehavior === 'Treat Zeroes as Blanks');
        
        if (item.DisplayFalse && isFalse) {
            // Handle empty values
            indicator.classification = item.InverseClassification;
            indicator.message = item.InverseDisplayText;
            if (indicator.classification === 'Custom') {
                indicator.iconVariant = 'default';
                indicator.iconName = item.FalseIcon;
            }
        } else {
            // Check extensions for more complex conditions
            let extensionMatched = false;
            
            if (item.Extensions && item.Extensions.length > 0) {
                // Sort extensions by priority
                const sortedExtensions = [...item.Extensions].sort((a, b) => a.PriorityOrder - b.PriorityOrder);
                
                for (const ext of sortedExtensions) {
                    if (!ext.IsActive) continue;
                    
                    let conditionMet = false;
                    
                    // Text comparison
                    if (typeof fieldValue === 'string' && ext.TextOperator && ext.ContainsText) {
                        if (ext.TextOperator === 'Contains' && fieldValue.includes(ext.ContainsText)) {
                            conditionMet = true;
                        } else if (ext.TextOperator === 'Equals' && fieldValue === ext.ContainsText) {
                            conditionMet = true;
                        } else if (ext.TextOperator === 'Does Not Equal' && fieldValue !== ext.ContainsText) {
                            conditionMet = true;
                        }  else if (ext.TextOperator === 'Starts With' && fieldValue.startsWith(ext.ContainsText)) {
                            conditionMet = true;
                        }
                        console.log('Text met?', conditionMet);
                    }
                    
                    // Numeric comparison
                    if (typeof fieldValue === 'number' && (ext.Minimum !== undefined || ext.Maximum !== undefined)) {
                        const minCondition = ext.Minimum === undefined || fieldValue >= ext.Minimum;
                        const maxCondition = ext.Maximum === undefined || fieldValue < ext.Maximum;
                        conditionMet = minCondition && maxCondition;
                        console.log('Numeric met?', conditionMet);
                    }
                    
                    console.log('Extension met?', conditionMet);
                    if (conditionMet) {
                        console.log(JSON.stringify(ext));
                        extensionMatched = true;
                        indicator.classification = ext.Classification || 'Info';
                        indicator.message = ext.DisplayText || 'Condition met';
                        if (indicator.classification === 'Custom') {
                            indicator.iconVariant = 'default';
                            indicator.iconName = ext.ExtensionIconValue;
                        }
                        
                        break;
                    }
                }
            }
            
            // If no extension matched, use default success state
            if (!extensionMatched) {
                indicator.classification = item.Classification || 'Success';
                indicator.message = item.DisplayText || 'Criteria satisfied';
                if (indicator.classification === 'Custom') {
                    indicator.iconVariant = 'default';
                    indicator.iconName = item.IconName;
                }
            }

        }

        if (indicator.classification === 'Error') {
            indicator.iconVariant = 'error';
            indicator.iconName = 'utility:error';
        } else if (indicator.classification === 'Warning') {
            indicator.iconVariant = 'warning';
            indicator.iconName = 'utility:warning';
        } else if (indicator.classification === 'Success') {
            indicator.iconVariant = 'success';
            indicator.iconName = 'utility:success';
        } else if (indicator.classification === 'Info') {
            indicator.iconVariant = 'default';
            indicator.iconName = 'utility:info';
        }
    }
    
    get gridClass() {
        return `slds-grid slds-wrap slds-grid_pull-padded-small slds-grid_${this.columns}-cols-wrap`;
    }
    
    get hasIndicators() {
        return this.indicators && this.indicators.length > 0;
    }
    
    get showError() {
        return this.errorOccurred;
    }
}

/*
    <!-- Inline script to handle filter counter and no results message -->
    <script>
        // This script will run after the component is rendered
        (function() {
            // Get all filter buttons
            const filterButtons = document.querySelectorAll('.filter-button');
            
            // Add click event to each button
            filterButtons.forEach(button => {
                button.addEventListener('click', function() {
                    // Get the lightning card container
                    const card = this.closest('lightning-card');
                    
                    // Get all visible rows after filtering
                    const visibleRows = card.querySelectorAll('tr.indicator-row[style=""]');
                    const totalRows = card.querySelectorAll('tr.indicator-row').length;
                    
                    // Update counter
                    const filterCounter = card.querySelector('.filter-counter');
                    const filterCount = card.querySelector('.filter-count');
                    
                    if (this.textContent.trim() === 'All') {
                        filterCounter.style.display = 'none';
                    } else {
                        filterCounter.style.display = 'block';
                        filterCount.textContent = visibleRows.length;
                    }
                    
                    // Show/hide no results message
                    const noResultsMsg = card.querySelector('.no-filter-results');
                    if (visibleRows.length === 0 && this.textContent.trim() !== 'All') {
                        noResultsMsg.style.display = 'block';
                    } else {
                        noResultsMsg.style.display = 'none';
                    }
                });
            });
        })();
    </script>
*/