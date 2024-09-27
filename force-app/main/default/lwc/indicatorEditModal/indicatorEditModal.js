/**
 * Created by robertwright on 10/31/23.
 */

import {api} from 'lwc';
import LightningModal from 'lightning/modal';

import Indicator_Bundle from "@salesforce/schema/Indicator_Bundle__mdt";
import Indicator_Item from "@salesforce/schema/Indicator_Item__mdt";
import Indicator_Item_Extension from "@salesforce/schema/Indicator_Item_Extension__mdt";

export default class IndicatorEditModal extends LightningModal {
    /*componentConstructor;
    componentProperties = {};

    @api masterLabel;
    @api objectApiName;
    @api isNew = false;

    get headerLabel() {
        return (this.isNew) ? `New ${this.masterLabel}` : `Update ${this.masterLabel}`;
    }

    get componentToRender() {
        switch (this.objectApiName) {
            case Indicator_Bundle.objectApiName:
                return "c/editIndicatorBundle";
                break;
            default:
                return "c/editIndicatorBundle";
        }
    }

    connectedCallback() {
        import(`${this.componentToRender}`)
            .then(({ default: ctor }) => (this.componentConstructor = ctor))
            .catch((err) => console.log("Error importing component"));
    }*/

}