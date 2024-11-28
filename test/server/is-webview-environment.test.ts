import { isWebviewEnvironment, isWebviewByUserAgent } from '../../src/server/is-webview-environment';

const UA_IPHONE =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';
const UA_WEBVIEW =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';

describe('isWebviewEnvironment', () => {
    it('should not detect webview while UA is not matched to webview-UA', () => {
        expect(
            isWebviewEnvironment({
                headers: {
                    'user-agent': UA_IPHONE,
                },
                query: {},
            }),
        ).toBeFalsy();
    });

    it('should detect webview while UA is matched to webview-UA', () => {
        expect(
            isWebviewEnvironment({
                headers: {
                    'user-agent': UA_WEBVIEW,
                },
                query: {},
            }),
        ).toBe(true);
    });

    it('should detect webview while `app-version` header is present', () => {
        expect(
            isWebviewEnvironment({
                headers: {
                    'app-version': '10.0.0',
                    'user-agent': UA_IPHONE,
                },
                query: {},
            }),
        ).toBe(true);
    });
});

describe('isAlfaMobileWebviewByUserAgent', () => {
    it('should return false if webview while UA is not matched to webview-UA', () => {
        expect(isWebviewByUserAgent(UA_IPHONE, undefined)).toBeFalsy();
    });

    it('should return true if webview while UA is matched to webview-UA', () => {
        expect(isWebviewByUserAgent(UA_WEBVIEW, undefined)).toBe(true);
    });

    it('should return true if webview while `app-version` header is present', () => {
        expect(isWebviewByUserAgent(UA_IPHONE, '10.0.0')).toBe(true);
    });
});
