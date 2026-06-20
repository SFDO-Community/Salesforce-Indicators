import { createElement } from 'lwc';
import Key from 'c/key';

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

describe('c-key', () => {
    afterEach(() => {
        // The jsdom instance is shared across test cases in a single file so reset the DOM
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('renders without errors given a bundle', () => {
        // Arrange
        const element = createElement('c-key', {
            is: Key
        });
        element.bundle = mockBundle;

        // Act
        document.body.appendChild(element);

        // Assert
        expect(element.shadowRoot.textContent).toContain(mockBundle.CardTitle);
    });
});
