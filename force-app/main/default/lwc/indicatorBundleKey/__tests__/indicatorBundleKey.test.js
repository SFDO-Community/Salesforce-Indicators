import { createElement } from 'lwc';
import IndicatorBundleKey from 'c/indicatorBundleKey';

const mockBundle = {
    CardTitle: 'Test Bundle',
    CardText: 'A bundle used for testing',
    CardIcon: 'standard:account',
    BundleDescription: 'A bundle used for testing',
    BundleId: 'm01000000000001AAA',
    IsActive: true,
    ObjectName: 'Account',
    Items: []
};

describe('c-indicator-bundle-key', () => {
    afterEach(() => {
        // The jsdom instance is shared across test cases in a single file so reset the DOM
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('renders without errors given a bundle', () => {
        // Arrange
        const element = createElement('c-indicator-bundle-key', {
            is: IndicatorBundleKey
        });
        element.bundleName = 'Test_Bundle';
        element.bundle = mockBundle;

        // Act
        document.body.appendChild(element);

        // Assert
        const header = element.shadowRoot.querySelector('lightning-modal-header');
        expect(header.label).toBe(mockBundle.CardTitle);
    });
});
