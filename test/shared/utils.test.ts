import { extractNativeParamsFromCookies } from '../../src/shared/utils';
import { NATIVE_PARAMS_COOKIE_KEY } from '../../src/server/constants';

describe('extractNativeParamsFromCookies', () => {
    it('should return an empty object if cookie header is missing', () => {
        const result = extractNativeParamsFromCookies();
        expect(result).toEqual(null);
    });

    it('should return an empty object if native params cookie is not present', () => {
        const result = extractNativeParamsFromCookies('otherCookie=value');
        expect(result).toEqual(null);
    });

    it('should return parsed object if native params cookie is present', () => {
        const nativeParams = { param1: 'value1', param2: 'value2' };
        const encodedNativeParams = encodeURIComponent(JSON.stringify(nativeParams));

        const result = extractNativeParamsFromCookies(`${NATIVE_PARAMS_COOKIE_KEY}=${encodedNativeParams}`);
        expect(result).toEqual(nativeParams);
    });

    it('should return null if native params cookie has invalid JSON', () => {
        const invalidJsonValue = 'invalid%7Bjson';

        const result = extractNativeParamsFromCookies(`${NATIVE_PARAMS_COOKIE_KEY}=${invalidJsonValue}`);
        expect(result).toBeNull();
    });

    it('should handle multiple cookies and return only native params cookie value', () => {
        const nativeParams = { param1: 'value1', param2: 'value2' };
        const encodedNativeParams = encodeURIComponent(JSON.stringify(nativeParams));

        const result = extractNativeParamsFromCookies(`otherCookie=value; ${NATIVE_PARAMS_COOKIE_KEY}=${encodedNativeParams}; anotherCookie=anotherValue`);
        expect(result).toEqual(nativeParams);
    });
});
