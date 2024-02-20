import { NativeFeaturesFromVersion } from './types';

export const START_VERSION_ANDROID_AM_ALLOW_OPEN_NEW_WEBVIEW = '10.35.0';

export const ANDROID_APP_ID = 'YWxmYWJhbms=';
export const CLOSE_WEBVIEW_SEARCH_KEY = 'closeWebView';
export const CLOSE_WEBVIEW_SEARCH_VALUE = 'true';
export const PREVIOUS_B2N_STATE_STORAGE_KEY = 'previousBridgeToNativeState';
export const PREVIOUS_NATIVE_NAVIGATION_AND_TITLE_STATE_STORAGE_KEY =
    'previousNativeNavigationAndTitleState';

export const versionToIosAppId = {
    '0.0.0': 'YWxmYWJhbms=',
    '12.22.0': 'YWNvbmNpZXJnZQ==',
    '12.26.0': 'a2l0dHljYXNo',
    '12.31.0': 'YXdlYXNzaXN0',
} as const;

export const nativeFeaturesFromVersion: NativeFeaturesFromVersion = {
    android: {
        linksInBrowser: {
            fromVersion: '11.71.0',
        },
        geolocation: { fromVersion: '11.71.0' },
    },
    ios: {
        linksInBrowser: {
            fromVersion: '13.3.0',
        },
        geolocation: { fromVersion: '0.0.0' },
    },
} as const;

export const DEEP_LINK_PATTERN =
    /^(\/|\x61\x6c\x66\x61\x62\x61\x6e\x6b:\/{3}dashboard\/|\x61\x6c\x66\x61\x62\x61\x6e\x6b:\/{3}|\x61\x6c\x66\x61\x62\x61\x6e\x6b:\/{2}|https:\/{2}\x6f\x6e\x6c\x69\x6e\x65\x2e\x61\x6c\x66\x61\x62\x61\x6e\x6b\x2e\x72\x75\/)/;
