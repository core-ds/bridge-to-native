import { closeWebviewUtil } from '../../../src/client/services-and-utils/close-webview-util';

describe('closeWebview', () => {
    const originalWindow = window;

    afterEach(() => {
        // eslint-disable-next-line no-global-assign
        window = originalWindow;
    });

    it('should modify URL correctly', () => {
        const testUrl = 'http://example.com';

        // eslint-disable-next-line no-global-assign
        window = Object.create(window);
        Object.defineProperty(window, 'location', {
            value: {
                href: testUrl,
            },
            writable: true,
        });

        closeWebviewUtil();
        expect(window.location.href).toBe(`${testUrl}/?closeWebView=true`);
    });
});
