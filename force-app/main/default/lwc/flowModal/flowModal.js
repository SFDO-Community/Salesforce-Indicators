import { api } from 'lwc';
import LightningModal from 'lightning/modal';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class FlowModal extends LightningModal {
    // Values are supplied by LightningModal.open({ ... })
    @api flowApiName;
    @api interviewId; // when provided, resume interview
    @api recordId;
    // @api inputVariables = [];   // TODO: Not currently being supported.
    @api modalTitle = 'Indicators Flow Launcher';

    rendered = false;

    get flowVariables(){
        if(!this.recordId) return undefined;

        console.log('Returning Id: ', this.recordId);
        
        return [
            {
                name: 'recordId',
                type: 'String',
                value: this.recordId
            }
        ]
    }

    renderedCallback() {
        // Start or resume flow once when modal renders
        if (!this.rendered) {
            this.rendered = true;
            const flow = this.template.querySelector('[data-id="flow"]');
            if (flow) {
                try {
                    if (!this.interviewId && this.flowApiName) {
                        flow.startFlow(this.flowApiName, this.flowVariables);   // TODO: This is where this.inputVariables would go
                    }
                } catch (e) {
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Flow Error',
                            message: e?.message || 'Unable to start the flow.',
                            variant: 'error'
                        })
                    );
                }
            }
        }
    }

    handleStatusChange(event) {
        const detail = event.detail || {};
        const status = (detail.status || '').toUpperCase();
        // FINISHED, FINISHED_SCREEN, PAUSED, ERROR
        if (status === 'FINISHED' || status === 'FINISHED_SCREEN') {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Flow finished',
                    message: 'The flow has completed successfully.',
                    variant: 'success'
                })
            );
            // Return result to caller and close
            this.close({ status: 'FINISHED', interviewId: null });
        } else if (status === 'PAUSED') {
            const pausedInterviewId = detail.interviewId || null;
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Flow paused',
                    message: 'You can resume this flow later.',
                    variant: 'info'
                })
            );
            // Return interviewId so caller can persist in-memory
            this.close({ status: 'PAUSED', interviewId: pausedInterviewId });
        } else if (status === 'ERROR') {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Flow error',
                    message: 'An error occurred in the flow. Please review and try again.',
                    variant: 'error'
                })
            );
            // Keep modal open for the user to close
        }
    }

    handleCloseClick() {
        // User closed the modal without flow finishing/pausing
        this.close({ status: 'CLOSED', interviewId: this.interviewId || null });
    }
}
