import { type NativeFeaturesFromVersion } from './types';

export const ANDROID_APP_ID = 'alfabank';

export const COOKIE_KEY_BRIDGE_TO_NATIVE_NATIVE_HISTORY_STACK = 'bridgeToNativeData';

export const DEEP_LINK_PATTERN =
    /^(\/|alfabank:\/{3}dashboard\/|alfabank:\/{3}|alfabank:\/{2}|https:\/{2}online.alfabank.ru\/)/;

export const QUERY_CLOSE_WEBVIEW_KEY = 'closeWebView';
export const QUERY_CLOSE_WEBVIEW_VALUE = 'true';

export const NATIVE_FEATURES_FROM_VERSION: NativeFeaturesFromVersion = {
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

export const PREVIOUS_B2N_STATE_STORAGE_KEY = 'previousBridgeToNativeState';
export const PREVIOUS_NATIVE_NAVIGATION_AND_TITLE_STATE_STORAGE_KEY =
    'previousNativeNavigationAndTitleState';

export const VERSION_TO_IOS_APP_ID = {
    '0.0.0': 'alfabank',
    '12.22.0': 'aconcierge',
    '12.26.0': 'kittycash',
    '13.2.0': 'triptally',
    '13.4.0': 'cashline',
    '13.5.0': 'assistmekz',
    '14.5.0': 'smartfinancementor',
} as const;
