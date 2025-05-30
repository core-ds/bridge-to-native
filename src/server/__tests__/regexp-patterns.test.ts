import {
    bridgeToNativeDataCookieExistencePattern,
    iosAppIdPattern,
    versionPattern,
    webviewUaIOSPattern,
} from '../regexp-patterns';

describe('bridgeToNativeDataCookieExistencePattern', () => {
    it('should match cookie key without space after separator', () => {
        expect(
            'foo=bar;bridgeToNativeData=value'.match(bridgeToNativeDataCookieExistencePattern),
        ).not.toBeNull();
    });

    it('should match cookie key with space after separator', () => {
        expect(
            'foo=bar; bridgeToNativeData=value'.match(bridgeToNativeDataCookieExistencePattern),
        ).not.toBeNull();
    });

    it('should match cookie key without separator', () => {
        expect(
            'bridgeToNativeData=value'.match(bridgeToNativeDataCookieExistencePattern),
        ).not.toBeNull();
    });

    it('should not match cookie key with prefix', () => {
        expect(
            'prefbridgeToNativeData=value'.match(bridgeToNativeDataCookieExistencePattern),
        ).toBeNull();
        expect(
            'foo=bar; prefbridgeToNativeData=value'.match(bridgeToNativeDataCookieExistencePattern),
        ).toBeNull();
    });

    it('should not match cookie key with suffix', () => {
        expect(
            'bridgeToNativeDataPost=value'.match(bridgeToNativeDataCookieExistencePattern),
        ).toBeNull();
    });

    it('should not match cookie key without equals sign', () => {
        expect(
            'bridgeToNativeData value'.match(bridgeToNativeDataCookieExistencePattern),
        ).toBeNull();
    });

    it('should not use lastIndex RegExp property', () => {
        const testStr = 'bridgeToNativeData=value; foo=bar';

        expect(bridgeToNativeDataCookieExistencePattern.test(testStr)).toBeTruthy();
        expect(bridgeToNativeDataCookieExistencePattern.test(testStr)).toBeTruthy();
    });
});

describe('iosAppIdPattern', () => {
    it('should match valid value', () => {
        expect('com.example.app'.match(iosAppIdPattern)).not.toBeNull();
        expect('com.test.app'.match(iosAppIdPattern)).not.toBeNull();
    });

    it('should capture the app name', () => {
        const match = 'com.example.app'.match(iosAppIdPattern);
        expect(match?.[1]).toBe('example');
    });

    it('should not match invalid value', () => {
        expect('com.example'.match(iosAppIdPattern)).toBeNull();
        expect('example.app'.match(iosAppIdPattern)).toBeNull();
        expect('com.example.com'.match(iosAppIdPattern)).toBeNull();
    });

    it('should not match numbers in value', () => {
        expect('com.example1.app'.match(iosAppIdPattern)).toBeNull();
    });

    it('should not match special characters in value', () => {
        expect('com.example@.app'.match(iosAppIdPattern)).toBeNull();
    });

    it('should not use lastIndex RegExp property', () => {
        const testStr = 'com.example.app';

        expect(iosAppIdPattern.test(testStr)).toBeTruthy();
        expect(iosAppIdPattern.test(testStr)).toBeTruthy();
    });
});

describe('versionPattern', () => {
    it('should match version with only numbers', () => {
        expect('1.2.3'.match(versionPattern)?.[1]).toBe('1.2.3');
    });

    it('should match version with build type', () => {
        expect('1.2.3 feature'.match(versionPattern)?.[1]).toBe('1.2.3');
        expect('1.2.3 beta'.match(versionPattern)?.[1]).toBe('1.2.3');
    });

    it('should not match invalid version formats', () => {
        expect('1.2'.match(versionPattern)).toBeNull();
        expect('1.2.3.4'.match(versionPattern)).toBeNull();
        expect('abc.1.2'.match(versionPattern)).toBeNull();
    });

    it('should not be statefull and does not use lastIndex RegExp property', () => {
        const testStr = '123.123.123 feature';

        expect(versionPattern.test(testStr)).toBeTruthy();
        expect(versionPattern.test(testStr)).toBeTruthy();
    });
});

describe('webviewUaIOSPattern', () => {
    it('should match WebView', () => {
        expect('Mozilla/5.0 WebView Something').toMatch(webviewUaIOSPattern);
    });

    it('should match iPhone without Safari', () => {
        expect('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)').toMatch(
            webviewUaIOSPattern,
        );
    });

    it('should match iPad without Safari', () => {
        expect('Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)').toMatch(webviewUaIOSPattern);
    });

    it('should match iPod without Safari', () => {
        expect('Mozilla/5.0 (iPod; CPU iPhone OS 15_0 like Mac OS X)').toMatch(webviewUaIOSPattern);
    });

    it('should not match when Safari is present', () => {
        expect(
            'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) Version/15.0 Safari/604.1',
        ).not.toMatch(webviewUaIOSPattern);
    });

    it('should match regardless of case', () => {
        expect('mozilla/5.0 WEBVIEW').toMatch(webviewUaIOSPattern);
        expect('mozilla/5.0 (IPHONE; CPU iPhone OS 15_0 like Mac OS X)').toMatch(
            webviewUaIOSPattern,
        );
    });

    it('should not match other devices', () => {
        expect('Mozilla/5.0 (Linux; Android 10)').not.toMatch(webviewUaIOSPattern);
    });

    it('should not use lastIndex RegExp property', () => {
        const testStr = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)';

        expect(webviewUaIOSPattern.test(testStr)).toBeTruthy();
        expect(webviewUaIOSPattern.test(testStr)).toBeTruthy();
    });
});
