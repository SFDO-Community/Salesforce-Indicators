import { createElement } from 'lwc';
import ConfigurationManager from 'c/configurationManager';
import getNewCmdtUrls from '@salesforce/apex/IndicatorController.getNewCmdtUrls';
import getBundleOptions from '@salesforce/apex/IndicatorListBundleSelector.getBundleOptions';

jest.mock(
    '@salesforce/apex/IndicatorController.getIndicatorBundle',
    () => {
        const { createApexTestWireAdapter } = require('@salesforce/sfdx-lwc-jest');
        return { default: createApexTestWireAdapter(jest.fn()) };
    },
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/IndicatorController.getNewCmdtUrls',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/IndicatorListBundleSelector.getBundleOptions',
    () => ({ default: jest.fn() }),
    { virtual: true }
);

function flushPromises() {
    return Promise.resolve().then(() => Promise.resolve());
}

describe('c-configuration-manager', () => {
    afterEach(() => {
        jest.clearAllMocks();
        // The jsdom instance is shared across test cases in a single file so reset the DOM
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('renders without errors', () => {
        // Arrange
        getBundleOptions.mockResolvedValue([]);
        getNewCmdtUrls.mockResolvedValue({ Entities: [] });
        const element = createElement('c-configuration-manager', {
            is: ConfigurationManager
        });

        // Act
        document.body.appendChild(element);

        // Assert
        expect(element).toBeTruthy();
    });

    it('navigates to the CMDT Setup page via a clicked anchor instead of window.open', async () => {
        // Arrange
        const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => {});
        const newUrl = '%2F06N000000000001';
        getBundleOptions.mockResolvedValue([]);
        getNewCmdtUrls.mockResolvedValue({
            Entities: [{ Name: 'Indicator_Bundle', Label: 'Indicator Bundle', NewUrl: newUrl }]
        });
        const element = createElement('c-configuration-manager', {
            is: ConfigurationManager
        });
        document.body.appendChild(element);
        await flushPromises();

        const link = element.shadowRoot.querySelector('a');
        const clickSpy = jest.spyOn(link, 'click').mockImplementation(() => {});
        const menuItem = element.shadowRoot.querySelector('lightning-menu-item');
        menuItem.value = newUrl;

        // Act
        menuItem.dispatchEvent(new CustomEvent('click'));

        // Assert
        expect(windowOpenSpy).not.toHaveBeenCalled();
        expect(link.href).toContain('/lightning/setup/CustomMetadata/page?address=' + newUrl);
        expect(clickSpy).toHaveBeenCalled();

        windowOpenSpy.mockRestore();
    });
});
