import {
    CAPSULE_UA_SUBSTR,
    AKEY_UA_SUBSTR,
    VOSKHOD_UA_SUBSTR,
    NATIVE_PARAMS_COOKIE_NAME
} from './constants';
import { RequestHeaderType } from './types';

/**
 * Заголовок с версией приложения, который посылает вебвью из AM Android
 */
const AppVersion = 'app-version';

/**
 * Возвращает `app-version` из заголовков запроса
 */
export function extractAppVersion(request: RequestHeaderType): string | undefined {
    return request.headers[AppVersion];
}

/**
 * Возвращает `User-agent` из заголовков запроса
 */
export function extractUserAgent(request: RequestHeaderType): string {
    return request.headers['user-agent'];
}

/**
 * Возвращает объект с `webview-параметрами` из cookies
 */
export function extractNativeParamsFromCookies(request: RequestHeaderType): Record<string, string> | null {
    const cookieHeader = request.headers['cookie'];

    if (!cookieHeader) {
        return {};
    }

    const cookiesArray = cookieHeader.split('; ');
    const cookieString = cookiesArray.find((cookie: string) => cookie.startsWith(`${NATIVE_PARAMS_COOKIE_NAME}=`));

    if (!cookieString) return null;

    const [, value] = cookieString.split('=');

    try {
        return JSON.parse(decodeURIComponent(value));
    } catch {
        return null;
    }
}


/**
 * Проверка по юзерагенту на сервере
 */
export const isAkeyWebview = (userAgent: string) =>
    userAgent.includes(CAPSULE_UA_SUBSTR) ||
    userAgent.includes(AKEY_UA_SUBSTR) ||
    userAgent.includes(VOSKHOD_UA_SUBSTR);
