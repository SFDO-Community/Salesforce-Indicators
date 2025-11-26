import { api, track } from 'lwc';
import LightningModal from 'lightning/modal';

export default class EditIndicatorBundleModal extends LightningModal {
    
    @api bundle;
    
    get modalTitle() {
        return this.bundle?.Label || 'Edit Bundle';
    }
    
    handleCancel() {
        this.close();
    }
    
    handleSave(event) {
        this.close(event.detail);
    }
}