<<<<<<< HEAD
import { LightningElement, api, track, wire } from 'lwc';
import { /* FIELD_TYPES ,*/ transformConstantObject } from 'c/fsc_objectFieldSelectorUtils';
import { getObjectInfo } from "lightning/uiObjectInfoApi";

const FIELD_TYPES = {
    TEXT: { value: 'text', default: true },
    NUMBER: { value: 'number', dataTypes: ['Integer', 'Double', 'Int', 'Long'] },
    DATE: { value: 'date', dataTypes: ['DateTime', 'Date', 'Time'] },
}

const SHOW_ONE_OR_ALL = {
    SHOW_ONE: { label: 'the first variant with matching criteria', value: 'showOne', default: true },
    SHOW_ALL: { label: 'all variants with matching criteria', value: 'showAll' }

}

export default class IndicatorBuilder extends LightningElement {
    @api objectApiName = 'Account';
    @api fieldApiName = 'Name';
    @api fieldType;
    @api showOneOrAll;

    // @wire(getObjectInfo, { objectApiName: "$objectApiName" })
    // wiredObjectInfo({ error, data }) {
    //     if (data) {
    //         console.log(`in wiredObjectInfo, found data`);
    //         let fieldData = data.fields[this.fieldApiName];
    //         console.log(JSON.stringify(Object.keys(data.fields)));
    //         if (fieldData) {
    //             console.log(`found fieldData: ${JSON.stringify(fieldData)}`);
    //         }
    //     }
    // }

    @track itemVariants = [];

    // indSize = 'large';
    // @api indShape = 'base';
    // @api indText = '';
    // @api indImage = '';
    // indIcon = 'standard:marketing_actions';
    // @api indHoverText;
    // @api displayMode = 'showWhenValue';
    // indBackgroundColor;
    // indForegroundColor;


    showMatch = {};
    // iconSource = {};

    @track fieldTypes = transformConstantObject(FIELD_TYPES);
    @track showOneOrAllOptions = transformConstantObject(SHOW_ONE_OR_ALL);

    // showTextMatch = false;
    // showNumberMatch = false;
    // overrideColors = false;

    get objectAndFieldSelected() {
        return this.objectApiName && this.fieldApiName;
    }

=======
import { LightningElement, api, track } from 'lwc';

export default class IndicatorBuilder extends LightningElement {
    indSize = 'large';
    @api indShape = 'base';
    @api indText = '';
    @api indImage = '';
    indIcon = 'standard:marketing_actions';
    @api indHoverText = '';
    indBackgroundColor;
    indForegroundColor;

    showMatch = {};
    iconSource = {}
    showTextMatch = false;
    showNumberMatch = false;
    overrideColours = false;
    
>>>>>>> 73e5f784ff3ef05a4d7d8281abdb8191f0999bef
    get activeVariantTabIndex() {
        return this._activeVariantTabIndex;
    }
    set activeVariantTabIndex(value) {
        this._activeVariantTabIndex = value;
        this.itemVariants = this.itemVariants.map((variant, index) => {
            variant.isActive = index == this.activeVariantTabIndex;
            return variant;
        });
    }
    _activeVariantTabIndex = 0;

<<<<<<< HEAD
    get categorizedFieldType() {
        let type = this.fieldTypes.options.find(fieldType => fieldType.dataTypes && fieldType.dataTypes.includes(this.fieldType));
        if (type) {
            return type.value;
        } else {
            return this.fieldTypes.default.value;
        }
        // switch (this.fieldType) {
        //     case 'Integer':
        //     case 'Double':
        //     case 'Int':
        //     case 'Long':
        //         return 'number';
        //     case 'DateTime':
        //     case 'Date':
        //     case 'Time':
        //         return 'date';
        //     default:
        //         return ''
        // }
    }

    get filteredWhenToDisplayOptions() {
        return this.whenToDisplayOptions.filter(option => !option.dataTypes || option.dataTypes.includes(this.categorizedFieldType));
    }

    get fieldTypeIsNumber() {
        return this.categorizedFieldType === FIELD_TYPES.NUMBER.value;
    }

    get itemVariantsString() { return JSON.stringify(this.itemVariants) };
    // { label: 'Default Indicator' }
    // this.newIndicatorVariant('Default Indicator')

=======
    @track itemVariants = [];
        // { label: 'Default Indicator' }
        // this.newIndicatorVariant('Default Indicator')
    
>>>>>>> 73e5f784ff3ef05a4d7d8281abdb8191f0999bef

    whenToDisplayOptions = [
        { label: 'Is not blank', value: 'notBlank' },
        { label: 'Is blank', value: 'isBlank' },
<<<<<<< HEAD
        { label: 'Contains text', value: 'containsText', dataTypes: [FIELD_TYPES.TEXT.value], showMatch: 'text' },
        { label: 'Equals text', value: 'equalsText', dataTypes: [FIELD_TYPES.TEXT.value], showMatch: 'text' },
        { label: 'Starts with text', value: 'startsWithText', dataTypes: [FIELD_TYPES.TEXT.value], showMatch: 'text' },
        { label: 'Equals number', value: 'equalsNumber', dataTypes: [FIELD_TYPES.NUMBER.value], showMatch: 'number' },
        { label: 'Is greater than', value: 'greaterThan', dataTypes: [FIELD_TYPES.NUMBER.value], showMatch: 'number' },
        { label: 'Is less than', value: 'lessThan', dataTypes: [FIELD_TYPES.NUMBER.value], showMatch: 'number' },
        { label: 'Is within range', value: 'inRange', dataTypes: [FIELD_TYPES.NUMBER.value], showMatch: 'numericRange' },
        // { label: 'Custom formula', value: 'customFormula' },
        // { label: 'Custom exception', value: 'customException' },
=======
        { label: 'Contains text', value: 'containsText', showMatch: 'text' },
        { label: 'Equals text', value: 'equalsText', showMatch: 'text' },
        { label: 'Equals number', value: 'equalsNumber', showMatch: 'number' },
        { label: 'Is greater than', value: 'greaterThan', showMatch: 'number' },
        { label: 'Is less than', value: 'lessThan', showMatch: 'number' },
        { label: 'Is within range', value: 'inRange', showMatch: 'numericRange' },
        { label: 'Custom formula', value: 'customFormula' },
        { label: 'Custom exception', value: 'customException' },
>>>>>>> 73e5f784ff3ef05a4d7d8281abdb8191f0999bef
    ];

    iconSourceOptions = [
        { label: 'Lightning Icon', value: 'sldsIcon' },
        { label: 'Static Text', value: 'staticText' },
        { label: 'URL', value: 'url' },
        { label: 'Static Resource', value: 'staticResource' },
    ];

    iconSizeOptions = [
        { label: 'x-small', value: 'x-small' },
        { label: 'small', value: 'small' },
        { label: 'medium', value: 'medium', default: true },
        { label: 'large', value: 'large' },
    ];

    fieldLabelOptions = [
        { label: 'Hide field label', value: 'hide' },
        { label: 'Show standard label', value: 'standard' },
        { label: 'Show custom label', value: 'custom' },
<<<<<<< HEAD
    ];

    displayModeOptions = [
        { label: 'Display indicator when field is populated, hide indicator when field is blank', value: 'showWhenValue' },
        { label: 'Display indicator when field is blank, hide indicator when field is populated', value: 'showWhenBlank' },
        { label: 'Display indicator based on custom logic', value: 'customLogic' },
    ];

    // get showColorOption() {
    //     return this.iconSource.sldsIcon || this.iconSource.staticText;
    // }

    // get showColorSelectors() {
    //     return this.showColorOption && this.overrideColors;
    // }

    get indicator() {
        if (this.itemVariants?.length) {
            return this.itemVariants[0];
        }
        return {};
    }

    connectedCallback() {
        console.log(`in indicatorBuilder connectedCallback`);
        if (this.itemVariants.length === 0) {
            console.log(`adding default variants`);
            this.addNewVariant('has a value', 'notBlank');
            this.addNewVariant('is blank', 'isBlank');
            this.activeVariantTabIndex = 0;
        }
        this.setDefaultValues();
    }

    setDefaultValues() {
        if (!this.showOneOrAll) {
            this.showOneOrAll = this.showOneOrAllOptions.default.value;
        }
    }

    handleObjectFieldSelectorChange(event) {
        console.log(`in handleObjectFieldSelectorChange, event.detail = ${JSON.stringify(event.detail)}`);
        if (!event.detail) {
            console.log(`Error: no event.detail in handleObjectFieldSelectorChange`);
            return;
        }
        this.objectApiName = event.detail.objectValue;
        this.fieldApiName = event.detail.fieldValue;
        if (event.detail.fieldData?.length) {
            this.fieldType = event.detail.fieldData[0].dataType;
        }

=======
    ]

    get showColourOption() {
        return this.iconSource.sldsIcon || this.iconSource.staticText;
    }

    get showColourSelectors() {
        return this.showColourOption && this.overrideColours;
    }

    connectedCallback() {
        if (this.itemVariants.length === 0) {
            console.log(`adding default variants`);
            this.addNewVariant('When field has value', 'notBlank');
            this.addNewVariant('When field is blank', 'isBlank');
            this.activeVariantTabIndex = 0;
        }
>>>>>>> 73e5f784ff3ef05a4d7d8281abdb8191f0999bef
    }

    handleWhenToDisplayChange(event) {
        let value = event.detail.value;
        let matchingOption = this.whenToDisplayOptions.find(option => option.value == value);
        if (matchingOption) {
            this.showMatch = { [matchingOption.showMatch]: true };
        }
    }

    handleIconSourceChange(event) {
        let value = event.detail.value;
        let variantToUpdate = this.itemVariants[target.dataset.index];
        console.log(`value = ${value}`);
        // this.iconSource = { [value]: true };
        variantToUpdate.iconSource = { [value]: true };
    }

    handleIconSelection(event) {
        console.log(JSON.stringify(event.detail));
        this.indIcon = event.detail;
    }

    handleStaticTextChange(event) {
        this.indText = event.target.value;
    }

<<<<<<< HEAD
    handleForegroundColorChange(event) {
        this.indForegroundColor = event.target.value;
    }

    handleBackgroundColorChange(event) {
        this.indBackgroundColor = event.target.value;
    }

    handleOverideColorsChange(event) {
        this.overrideColors = event.target.checked;
=======
    handleForegroundColourChange(event) {
        this.indForegroundColor = event.target.value;
    }

    handleBackgroundColourChange(event) {
        this.indBackgroundColor = event.target.value;
    }
    
    handleOverideColoursChange(event) {
        this.overrideColours = event.target.checked;
>>>>>>> 73e5f784ff3ef05a4d7d8281abdb8191f0999bef
    }

    handleAddVariantClick() {
        // this.itemVariants.push({ label: `Indicator Variant ${(this.itemVariants.length + 1)}`});
        // this.itemVariants.push(this.newIndicatorVariant(`Indicator Variant ${(this.itemVariants.length + 1)}`));        
        this.addNewVariant(`Indicator Variant ${(this.itemVariants.length + 1)}`);
    }

    handleTabAnchorClick(event) {
        console.log(`in handleTabAnchorClick`);
        this.activeVariantTabIndex = event.currentTarget.dataset.index;
        console.log(`activeVariantTabIndex = ${this.activeVariantTabIndex}`);
    }

<<<<<<< HEAD
    // handleDisplayModeChange(event) {
    //     this.displayMode = event.detail.value;
    //     this.showVariantLogic = this.displayMode == 'customLogic';
    // }

    handleIndicatorChange(event) {
        console.log(`in handleIndicatorChange, detail  = ${JSON.stringify(event.detail)}`);
        if (event.detail) {
            let variantToUpdate = this.itemVariants[event.detail.index];
            if (variantToUpdate && event.detail.propertyName) {
                variantToUpdate[event.detail.propertyName] = event.detail.value;
                this.itemVariants = [...this.itemVariants];
            }
        }
    }

=======
>>>>>>> 73e5f784ff3ef05a4d7d8281abdb8191f0999bef
    handleVariantPropertyChange(event) {
        if (event.currentTarget.dataset.property) {
            let target = event.currentTarget;
            let tagName = target.tagName.toLowerCase();
            let value;
            if (tagName === 'c-icon-selector') {
                value = event.detail;
            } else if (target.type === 'checkbox') {
                value = target.checked;
            } else if (tagName === 'lightning-combobox') {
                value = event.detail.value;
            } else {
                value = target.value;
            }

            console.log(`index is ${target.dataset.index}, value is ${value}, property name is ${target.dataset.property}`);

            let variantToUpdate = this.itemVariants[target.dataset.index];
            if (variantToUpdate) {
                variantToUpdate[target.dataset.property] = value;
                if (target.dataset.property === 'iconSource') {
                    variantToUpdate.sourceValue = null;
                }
                this.itemVariants = [...this.itemVariants];
                console.log(`updated variant value = ${JSON.stringify(variantToUpdate)}`);
            }
        }
    }

    addNewVariant(label, whenToDisplay) {
        this.itemVariants.push(this.newIndicatorVariant(label, whenToDisplay));
        this.activeVariantTabIndex = this.itemVariants.length - 1;
    }

    newIndicatorVariant(label, whenToDisplay, isActive = true, iconSource = 'sldsIcon') {
        let whenToDisplayOptions = this.whenToDisplayOptions;
<<<<<<< HEAD
        let index = this.itemVariants.length;
=======
>>>>>>> 73e5f784ff3ef05a4d7d8281abdb8191f0999bef

        let newVariant = {
            label,
            whenToDisplay,
            isActive,
            iconSource,
<<<<<<< HEAD
            index,
            hoverText: '',
            overrideColors: false,
=======
            hoverText: '',
>>>>>>> 73e5f784ff3ef05a4d7d8281abdb8191f0999bef
            get iconSourceIs() {
                return { [this.iconSource]: true }
            },
            get filterTypeIs() {
                let matchingOption = whenToDisplayOptions.find(option => option.value == this.whenToDisplay);
                return matchingOption ? { [matchingOption.showMatch]: true } : {};
            },
            get tabAnchorClass() {
                return 'slds-vertical-tabs__nav-item' + (this.isActive ? ' slds-is-active' : '');
            },
            get tabPaneClass() {
<<<<<<< HEAD
                return 'slds-vertical-tabs__content slds-col ' + (this.isActive ? 'slds-show' : 'slds-hide');
            },
            get showColorOption() {
                return this.iconSourceIs.sldsIcon;
            },
            get showColorSelectors() {
                return this.iconSourceIs.staticText || (this.showColorOption && this.overrideColors);
            }
=======
                return 'slds-vertical-tabs__content ' + (this.isActive ? 'slds-show' : 'slds-hide');
            },
            get showColourOption() {
                return this.iconSourceIs.sldsIcon;
            },
            get showColourSelectors() {
                return this.iconSourceIs.staticText || (this.showColourOption && this.overrideColours);
            }        
>>>>>>> 73e5f784ff3ef05a4d7d8281abdb8191f0999bef
        }
        console.log(`newVariant = ${JSON.stringify(newVariant)}`);
        return newVariant;
    }
}