import { COOKIE_KEY_BRIDGE_TO_NATIVE_DATA } from '../../query-and-headers-keys';
import { type NativeParams } from '../../types';
import { ANDROID_APP_ID, VERSION_TO_IOS_APP_ID } from '../constants';
import { type Environment, type LogError, type NativeFeatureKey, type Theme } from '../types';

import {
    canUseNativeFeature,
    isValidVersionFormat,
    isVersionHigherOrEqual,
} from './native-features';

/**
 * Сервис, аккумулирующий детали о NA и предоставляющий методы, связанные с этим.
 */
export class NativeParamsService {
    AndroidBridge = window.Android;

    appId: string;

    appVersion: string;

    environment: Environment = window.Android ? 'android' : 'ios';

    nativeParamsReadErrorFlag = false;

    nextPageId: number | null;

    originalWebviewParams: string | null;

    theme: Theme;

    title: string;

    webviewLaunchTime: number | null;

    constructor(private logError?: LogError) {
        const nativeParams = this.readNativeParamsCookie();

        this.appVersion = NativeParamsService.isValidVersionFormat(nativeParams?.appVersion)
            ? nativeParams.appVersion
            : '0.0.0';

        this.appId = this.getAppId(nativeParams?.iosAppId);

        this.nextPageId = nativeParams?.nextPageId || null;

        this.originalWebviewParams = nativeParams?.originalWebviewParams || null;

        this.theme = nativeParams?.theme === 'dark' ? 'dark' : 'light';

        this.title = nativeParams?.title || '';

        this.webviewLaunchTime = nativeParams?.webviewLaunchTime || null;
    }

    canUseNativeFeature(feature: NativeFeatureKey) {
        return canUseNativeFeature(this.environment, this.appVersion, feature);
    }

    isCurrentVersionHigherOrEqual(versionToCompare: string) {
        return isVersionHigherOrEqual(this.appVersion, versionToCompare);
    }

    private static isValidVersionFormat(version?: string): version is string {
        return isValidVersionFormat(version);
    }

    private getAppId(knownIosAppId?: string) {
        if (this.environment !== 'ios') {
            return ANDROID_APP_ID;
        }

        if (knownIosAppId) {
            return knownIosAppId;
        }

        const keys = Object.keys(VERSION_TO_IOS_APP_ID);

        const rightKey =
            [...keys].reverse().find((version) => this.isCurrentVersionHigherOrEqual(version)) ||
            keys[0];

        return VERSION_TO_IOS_APP_ID[rightKey as keyof typeof VERSION_TO_IOS_APP_ID];
    }

    private readNativeParamsCookie() {
        const allCookies = document.cookie.split(';');

        const nativeParamsCookie = allCookies.find((c) =>
            c.trim().startsWith(COOKIE_KEY_BRIDGE_TO_NATIVE_DATA),
        );

        try {
            const deserializedNativeParams = decodeURIComponent(
                nativeParamsCookie?.split('=')[1] ?? '',
            );

            return JSON.parse(deserializedNativeParams) as Partial<NativeParams>;
        } catch (e) {
            this.nativeParamsReadErrorFlag = true;

            if (this.logError) {
                this.logError(
                    'Клиентский код B2N не смог получить информацию о NA из cookie. ' +
                        'Некоторые методы B2N могут работать некорректно',
                    e,
                );
            }

            return null;
        }
    }
}
