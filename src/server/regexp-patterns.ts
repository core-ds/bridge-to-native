import { COOKIE_KEY_BRIDGE_TO_NATIVE_DATA } from '../constants';

// Проверка, согласно спецификации https://httpwg.org/specs/rfc6265.html#cookie
export const bridgeToNativeDataCookieExistencePattern = new RegExp(
    `^(.+;\\s?)?${COOKIE_KEY_BRIDGE_TO_NATIVE_DATA}=`,
);
