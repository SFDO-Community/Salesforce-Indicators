import { createElement } from 'lwc';
import IndicatorKeyRow from 'c/indicatorKeyRow';

describe('c-indicator-key-row', () => {
    afterEach(() => {
        // The jsdom instance is shared across test cases in a single file so reset the DOM
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('renders without errors', () => {
        // Arrange
        const element = createElement('c-indicator-key-row', {
            is: IndicatorKeyRow
        });

        // Act
        document.body.appendChild(element);

        // Assert
        expect(element.shadowRoot.textContent).toContain(element.keyDescription);
    });

    it('navigates to the CMDT Setup page via a clicked anchor instead of window.open', () => {
        // Arrange
        const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => {});
        const element = createElement('c-indicator-key-row', {
            is: IndicatorKeyRow
        });
        element.isManageEnabled = true;
        element.keyId = 'm01000000000001AAA';
        document.body.appendChild(element);

        const link = element.shadowRoot.querySelector('a');
        const clickSpy = jest.spyOn(link, 'click').mockImplementation(() => {});
        const button = element.shadowRoot.querySelector('lightning-button-icon');

        // Act
        button.name = element.keyId;
        button.dispatchEvent(new CustomEvent('click'));

        // Assert
        expect(windowOpenSpy).not.toHaveBeenCalled();
        expect(link.href).toContain('/lightning/setup/CustomMetadata/page?address=%2F' + element.keyId);
        expect(clickSpy).toHaveBeenCalled();

        windowOpenSpy.mockRestore();
    });
});
