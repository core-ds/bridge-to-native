import { COOKIE_KEY_BRIDGE_TO_NATIVE_DATA } from '../constants';

// Проверка, согласно спецификации https://httpwg.org/specs/rfc6265.html#cookie
export const bridgeToNativeDataCookieExistencePattern = new RegExp(
    `^(.+;\\s?)?${COOKIE_KEY_BRIDGE_TO_NATIVE_DATA}=`,
);

export const iosAppIdPattern = /^com\.([a-z]+)\.app$/;

// Вебвью Android приписывает после версии тип билда, например `feature`. Нам эта информация не нужна.
export const versionPattern = /^(\d+\.\d+\.\d+)(\s.+)?$/;

export const webviewUaIOSPattern = /WebView|(iPhone|iPod|iPad)(?!.*Safari)/i;
