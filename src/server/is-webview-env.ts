import {
    HEADER_KEY_COOKIE,
    HEADER_KEY_NATIVE_APPVERSION,
    HEADER_KEY_USER_AGENT,
} from '../query-and-headers-keys';

import { versionPattern, webviewUaIOSPattern } from './regexp-patterns';
import { type UniversalRequest } from './types';
import { getHeaderValue, hasBridgeToNativeDataCookie } from './utils';

/**
 * На основе объекта запроса любого типа определяет, сделан ли запрос из вебвью.
 *
 * @param request Объект запроса (Request или IncomingMessage).
 */
export function isWebviewEnv(request: UniversalRequest) {
    const appVersion = getHeaderValue(request, HEADER_KEY_NATIVE_APPVERSION);
    const userAgent = getHeaderValue(request, HEADER_KEY_USER_AGENT);

    const isWebviewByHeaders =
        // `app-version` в заголовках — основной индикатор запроса из вебвью.
        (appVersion && versionPattern.test(appVersion)) ||
        // Проверка «на всякий случай» для iOS — нет уверенности,
        // что `app-version` стабильно и на всех версиях есть во всех запросах из вебвью.
        (userAgent && webviewUaIOSPattern.test(userAgent));

    if (isWebviewByHeaders) return true;

    const isBrowserEnv = userAgent && !webviewUaIOSPattern.test(userAgent) && !appVersion;

    if (isBrowserEnv) return false;

    // Выставленная ранее кука — однозначный индикатор вебвью окружения.
    const cookieHeader = getHeaderValue(request, HEADER_KEY_COOKIE);

    if (hasBridgeToNativeDataCookie(cookieHeader)) {
        return true;
    }

    return false;
}
