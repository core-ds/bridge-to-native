import { NativeFeaturesFromVersion } from './types';

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
            nativeFeatureFtKey: 'linksInBrowserAndroid',
            fromVersion: '11.71.0',
        },
        geolocation: { fromVersion: '11.71.0' },
    },
    ios: {
        linksInBrowser: {
            nativeFeatureFtKey: 'linksInBrowserIos',
            fromVersion: '13.3.0',
        },
        geolocation: { fromVersion: '0.0.0' },
    },
} as const;
