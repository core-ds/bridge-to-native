import { COOKIE_KEY_BRIDGE_TO_NATIVE_DATA } from '../query-and-headers-keys';

// Проверка, согласно спецификации https://httpwg.org/specs/rfc6265.html#cookie
export const bridgeToNativeDataCookieExistencePattern = new RegExp(
    `^(.+;\\s?)?${COOKIE_KEY_BRIDGE_TO_NATIVE_DATA}=`,
);

/**
 * Схема опирается на стандарт RFC 3986
 *
 * @see https://datatracker.ietf.org/doc/html/rfc3986#section-3.1
 */
export const iosAppIdPattern = /^com\.([a-z0-9+.-]+)\.app$/i;

// Вебвью Android приписывает после версии тип билда, например `feature`. Нам эта информация не нужна.
export const versionPattern = /^(\d+\.\d+\.\d+)(\s.+)?$/;

export const webviewUaIOSPattern = /WebView|(iPhone|iPod|iPad)(?!.*Safari)/i;
