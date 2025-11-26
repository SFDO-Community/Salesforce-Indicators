const IMAGE_SOURCE_OPTIONS = {
    ICON: { label: 'Lightning Icon', value: 'sldsIcon', default: true },
    TEXT: { label: 'Static Text', value: 'staticText' },
    URL: { label: 'URL', value: 'url' },
    STATIC_RESOURCE: { label: 'Static Resource', value: 'staticResource' },
};

const IMAGE_SIZE_OPTIONS = {
    X_SMALL: { label: 'x-small', value: 'x-small' },
    SMALL: { label: 'small', value: 'small' },
    MEDIUM: { label: 'medium', value: 'medium', default: true },
    LARGE: { label: 'large', value: 'large' },
};

const transformConstantObject = (constant) => {
    return {
        list: constant,
        get options() { return Object.values(this.list).filter(option => !option.hide); },
        get default() { return this.options.find(option => option.default); },
        findFromValue: function (value) {
            let entry = this.options.find(option => option.value == value);
            return entry || this.default;
        },
        findFromLabel: function (label) {
            let entry = this.options.find(option => option.label == label);
            return entry || this.default;
        }
    }
}

export { IMAGE_SOURCE_OPTIONS, IMAGE_SIZE_OPTIONS, transformConstantObject }