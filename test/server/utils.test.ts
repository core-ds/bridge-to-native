import { extractNativeParamsFromCookies } from '../../src/server/utils';
import { NATIVE_PARAMS_COOKIE_NAME } from '../../src/server/constants';

describe('extractNativeParamsFromCookies', () => {
    it('should return an empty object if cookie header is missing', () => {
        const request = { headers: {} };
        const result = extractNativeParamsFromCookies(request);
        expect(result).toEqual({});
    });

    it('should return an empty object if native params cookie is not present', () => {
        const request = { headers: { cookie: 'otherCookie=value' } };
        const result = extractNativeParamsFromCookies(request);
        expect(result).toEqual(null);
    });

    it('should return parsed object if native params cookie is present', () => {
        const nativeParams = { param1: 'value1', param2: 'value2' };
        const encodedNativeParams = encodeURIComponent(JSON.stringify(nativeParams));
        const request = { headers: { cookie: `${NATIVE_PARAMS_COOKIE_NAME}=${encodedNativeParams}` } };

        const result = extractNativeParamsFromCookies(request);
        expect(result).toEqual(nativeParams);
    });

    it('should return null if native params cookie has invalid JSON', () => {
        const invalidJsonValue = 'invalid%7Bjson';
        const request = { headers: { cookie: `${NATIVE_PARAMS_COOKIE_NAME}=${invalidJsonValue}` } };

        const result = extractNativeParamsFromCookies(request);
        expect(result).toBeNull();
    });

    it('should handle multiple cookies and return only native params cookie value', () => {
        const nativeParams = { param1: 'value1', param2: 'value2' };
        const encodedNativeParams = encodeURIComponent(JSON.stringify(nativeParams));
        const request = {
            headers: {
                cookie: `otherCookie=value; ${NATIVE_PARAMS_COOKIE_NAME}=${encodedNativeParams}; anotherCookie=anotherValue`
            }
        };

        const result = extractNativeParamsFromCookies(request);
        expect(result).toEqual(nativeParams);
    });
});
