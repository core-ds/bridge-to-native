import { HEADER_KEY_NATIVE_APP_VERSION, HEADER_KEY_USER_AGENT } from './constants';
import { versionPattern, webviewUaIOSPattern } from './regexp-patterns';
import { type UniversalRequest } from './types';
import { getHeaderValue, hasBridgeToNativeDataCookie } from './utils';

/**
 * На основе объекта запроса любого типа определяет, сделан ли запрос из вебвью.
 */
export function isWebviewEnv(request: UniversalRequest) {
    // Выставленная ранее кука — однозначный индикатор вебвью окружения.
    if (hasBridgeToNativeDataCookie(request)) {
        return true;
    }

    const appVersion = getHeaderValue(request, HEADER_KEY_NATIVE_APP_VERSION);

    // `app-version` в заголовках — основной индикатор запроса из вебвью.
    if (appVersion && versionPattern.test(appVersion)) {
        return true;
    }

    const userAgent = getHeaderValue(request, HEADER_KEY_USER_AGENT);

    // Проверка «на всякий случай» для iOS — нет уверенности,
    // что `app-version` стабильно и на всех версиях есть во всех запросах из вебвью.
    if (userAgent && webviewUaIOSPattern.test(userAgent)) {
        return true;
    }

    return false;
}
