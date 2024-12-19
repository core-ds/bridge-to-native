import { NATIVE_PARAMS_COOKIE_KEY } from '../constants';
import { getHeaderValue } from './get-header-value';
import { UniversalRequest } from '../types';

/**
 * Возвращает объект с параметрами нативного приложения из cookie, если они были сохранены ранее.
 */
export function extractNativeParamsFromCookie(request: UniversalRequest) {
    const cookies = getHeaderValue(request, 'cookie');

    if (!cookies) {
        return null;
    }

    const cookiesArray = typeof cookies === 'string' ? [cookies] : cookies;
    const nativeParamsCookie = cookiesArray.find((cookie) =>
        cookie.startsWith(NATIVE_PARAMS_COOKIE_KEY),
    );

    if (!nativeParamsCookie) {
        return null;
    }

    const [, value] = nativeParamsCookie.split('=');

    return value;
}
