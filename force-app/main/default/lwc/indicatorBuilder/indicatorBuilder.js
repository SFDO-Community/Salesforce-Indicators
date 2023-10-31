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

    @track itemVariants = [];
        // { label: 'Default Indicator' }
        // this.newIndicatorVariant('Default Indicator')
    

    whenToDisplayOptions = [
        { label: 'Is not blank', value: 'notBlank' },
        { label: 'Is blank', value: 'isBlank' },
        { label: 'Contains text', value: 'containsText', showMatch: 'text' },
        { label: 'Equals text', value: 'equalsText', showMatch: 'text' },
        { label: 'Equals number', value: 'equalsNumber', showMatch: 'number' },
        { label: 'Is greater than', value: 'greaterThan', showMatch: 'number' },
        { label: 'Is less than', value: 'lessThan', showMatch: 'number' },
        { label: 'Is within range', value: 'inRange', showMatch: 'numericRange' },
        { label: 'Custom formula', value: 'customFormula' },
        { label: 'Custom exception', value: 'customException' },
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

    handleForegroundColourChange(event) {
        this.indForegroundColor = event.target.value;
    }

    handleBackgroundColourChange(event) {
        this.indBackgroundColor = event.target.value;
    }
    
    handleOverideColoursChange(event) {
        this.overrideColours = event.target.checked;
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

        let newVariant = {
            label,
            whenToDisplay,
            isActive,
            iconSource,
            hoverText: '',
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
                return 'slds-vertical-tabs__content ' + (this.isActive ? 'slds-show' : 'slds-hide');
            },
            get showColourOption() {
                return this.iconSourceIs.sldsIcon;
            },
            get showColourSelectors() {
                return this.iconSourceIs.staticText || (this.showColourOption && this.overrideColours);
            }        
        }
        console.log(`newVariant = ${JSON.stringify(newVariant)}`);
        return newVariant;
    }
}