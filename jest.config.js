const { jestConfig } = require('@salesforce/sfdx-lwc-jest/config');

module.exports = {
    ...jestConfig,
    moduleNameMapper: {
        '^lightning/modal$': '<rootDir>/force-app/test/jest-mocks/lightning/modal'
    }
};
