import { type NativeFeaturesFromVersion, type WebFeatureAction } from './types';

export const ANDROID_APP_ID = 'alfabank';

export const DEEP_LINK_PATTERN =
    /^(\/|alfabank:\/{3}dashboard\/|alfabank:\/{3}|alfabank:\/{2}|https:\/{2}online.alfabank.ru\/)/;

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

export const VERSION_TO_IOS_APP_ID = {
    '0.0.0': 'alfabank',
    '12.22.0': 'aconcierge',
    '12.26.0': 'kittycash',
    '13.2.0': 'triptally',
    '13.4.0': 'cashline',
    '13.5.0': 'assistmekz',
    '14.5.0': 'smartfinancementor',
} as const;

export const WEB_FEATURES_FROM_VERSION: Readonly<
    Record<WebFeatureAction, { fromVersion: string }>
> = {
    'geo.configuration': { fromVersion: '17.0.0' },
    'haptics.vibrate': { fromVersion: '17.0.0' },
    'sheet.setDragArea': { fromVersion: '17.0.0' },
    'tabbar.hide': { fromVersion: '17.0.0' },
    'tabbar.show': { fromVersion: '17.0.0' },
};
