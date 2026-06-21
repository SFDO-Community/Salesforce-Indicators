import { createElement } from 'lwc';
import Key from 'c/key';

jest.mock(
    '@salesforce/customPermission/Manage_Indicator_Key',
    () => ({ default: true }),
    { virtual: true }
);

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

    it('navigates to the CMDT Setup page via a clicked anchor instead of window.open', () => {
        // Arrange
        const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => {});
        const element = createElement('c-key', {
            is: Key
        });
        element.bundle = mockBundle;
        document.body.appendChild(element);

        const link = element.shadowRoot.querySelector('a');
        const clickSpy = jest.spyOn(link, 'click').mockImplementation(() => {});
        const editBundleButton = element.shadowRoot.querySelector('lightning-button');

        // Act
        editBundleButton.dispatchEvent(new CustomEvent('click'));

        // Assert
        expect(windowOpenSpy).not.toHaveBeenCalled();
        expect(link.href).toContain('/lightning/setup/CustomMetadata/page?address=%2F' + mockBundle.BundleId);
        expect(clickSpy).toHaveBeenCalled();

        windowOpenSpy.mockRestore();
    });
});
