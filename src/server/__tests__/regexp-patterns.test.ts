import { bridgeToNativeDataCookieExistencePattern } from '../regexp-patterns';

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
