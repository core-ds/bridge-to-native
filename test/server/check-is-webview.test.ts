import { checkIsWebview, isWebviewByUserAgent, isWebviewByCookies } from '../../src/server/check-is-webview';

const UA_IPHONE =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';
const UA_AMWEBVIEW =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const UA_CAPSULE =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Capsule pctest-fejfksefsef-sfsevsdfsefs-fsefses iOS 1.0';
const UA_AKEY =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 AKEY pctest-fejfksefsef-sfsevsdfsefs-fsefses iOS 1.0';

const UA_VOSKHOD =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 VOSKHOD pctest-fejfksefsef-sfsevsdfsefs-fsefses iOS 1.0';

describe('isAlfaMobileWebview', () => {
    it('should not detect webview environment in Capsule', () => {
        expect(
            checkIsWebview({
                headers: {
                    'user-agent': UA_CAPSULE,
                },
                query: {},
            }),
        ).toBeFalsy();
    });

    it('should not detect webview environment in Akey 2.0', () => {
        expect(
            checkIsWebview({
                headers: {
                    'user-agent': UA_AKEY,
                },
                query: {},
            }),
        ).toBeFalsy();
    });

    it('should not detect webview environment in VOSKHOD', () => {
        expect(
            checkIsWebview({
                headers: {
                    'user-agent': UA_VOSKHOD,
                },
                query: {},
            }),
        ).toBeFalsy();
    });

    it('should not detect webview environment in Capsule even while `app-version` header is present', () => {
        expect(
            checkIsWebview({
                headers: {
                    'app-version': '10.0.0',
                    'user-agent': UA_CAPSULE,
                },
                query: {},
            }),
        ).toBeFalsy();
    });

    it('should not detect AM-webview while UA is not matched to webview-UA', () => {
        expect(
            checkIsWebview({
                headers: {
                    'user-agent': UA_IPHONE,
                },
                query: {},
            }),
        ).toBeFalsy();
    });

    it('should detect AM-webview while UA is matched to webview-UA', () => {
        expect(
            checkIsWebview({
                headers: {
                    'user-agent': UA_AMWEBVIEW,
                },
                query: {},
            }),
        ).toBe(true);
    });

    it('should detect AM-webview while `app-version` header is present', () => {
        expect(
            checkIsWebview({
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
    it('should return false if AM-webview environment in Capsule', () => {
        expect(isWebviewByUserAgent(UA_CAPSULE, undefined)).toBeFalsy();
    });

    it('should return false if AM-webview environment in Akey 2.0', () => {
        expect(isWebviewByUserAgent(UA_AKEY, undefined)).toBeFalsy();
    });

    it('should return false if AM-webview environment in VOSKHOD', () => {
        expect(isWebviewByUserAgent(UA_VOSKHOD, undefined)).toBeFalsy();
    });

    it('should return false if AM-webview environment in Capsule even while `app-version` exist', () => {
        expect(isWebviewByUserAgent(UA_CAPSULE, '10.0.0')).toBeFalsy();
    });

    it('should return false if AM-webview while UA is not matched to webview-UA', () => {
        expect(isWebviewByUserAgent(UA_IPHONE, undefined)).toBeFalsy();
    });

    it('should return true if AM-webview while UA is matched to webview-UA', () => {
        expect(isWebviewByUserAgent(UA_AMWEBVIEW, undefined)).toBe(true);
    });

    it('should return true if AM-webview while `app-version` header is present', () => {
        expect(isWebviewByUserAgent(UA_IPHONE, '10.0.0')).toBe(true);
    });
});
