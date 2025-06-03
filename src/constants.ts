import { NativeFeaturesFromVersion } from './types';

export const START_VERSION_ANDROID_ALLOW_OPEN_NEW_WEBVIEW = '10.35.0';

export const ANDROID_APP_ID = 'alfabank';
export const CLOSE_WEBVIEW_SEARCH_KEY = 'closeWebView';
export const CLOSE_WEBVIEW_SEARCH_VALUE = 'true';
export const COOKIE_KEY_BRIDGE_TO_NATIVE_DATA = 'bridgeToNativeData';
export const PREVIOUS_B2N_STATE_STORAGE_KEY = 'previousBridgeToNativeState';
export const PREVIOUS_NATIVE_NAVIGATION_AND_TITLE_STATE_STORAGE_KEY =
    'previousNativeNavigationAndTitleState';

export const versionToIosAppId = {
    '0.0.0': 'alfabank',
    '12.22.0': 'aconcierge',
    '12.26.0': 'kittycash',
    '13.2.0': 'triptally',
    '13.4.0': 'cashline',
    '13.5.0': 'assistmekz',
    '14.5.0': 'smartfinancementor',
} as const;

export const nativeFeaturesFromVersion: NativeFeaturesFromVersion = {
    android: {
        linksInBrowser: {
            fromVersion: '11.71.0',
        },
        geolocation: { fromVersion: '11.71.0' },
        savedBackStack: { fromVersion: '12.30.0' },
    },
    ios: {
        linksInBrowser: {
            fromVersion: '13.3.0',
        },
        geolocation: { fromVersion: '0.0.0' },
        savedBackStack: { fromVersion: '0.0.0' },
    },
} as const;

export const DEEP_LINK_PATTERN =
    /^(\/|alfabank:\/{3}dashboard\/|alfabank:\/{3}|alfabank:\/{2}|https:\/{2}online.alfabank.ru\/)/;
