import { LightningElement, api } from 'lwc';

export default class IndicatorKeyRow extends LightningElement {

    @api keyId = '';
    @api keyIcon = 'custom:custom20';
    @api keyImage = '';
    @api keyText = '';
    @api keyDescription = 'Description will go here (use same form Normal and Inverse)';
    @api keyFillType = 'Static Text || Icon Image || Field Value';
    @api keyHoverValue = 'Field Value || Hover Text';
    @api keyPriority = 'Priority ("Last" for Normal / "First" for Inverse)';
    @api keyExtensionLogic = 'Extension Logic (Contains Text or Within Range)';
    @api isManageEnabled = false;
    @api keyBackground = '';
    @api keyForeground = '';
    @api keyIsActive = false;

    handleClick(event){
        // window.open() is distorted by Lightning Web Security for Setup pages;
        // a real anchor click uses native browser navigation instead. See docs/sdd/0002-window-open.md.
        const link = this.refs.cmdtLink;
        link.href = '/lightning/setup/CustomMetadata/page?address=%2F' + event.target.name;
        link.click();
    }

}