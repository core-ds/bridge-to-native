import { COOKIE_KEY_BRIDGE_TO_NATIVE_DATA } from '../../query-and-headers-keys';
import { type NativeParams } from '../../types';
import { ANDROID_APP_ID, NATIVE_FEATURES_FROM_VERSION, VERSION_TO_IOS_APP_ID } from '../constants';
import { type Environment, type LogError, type NativeFeatureKey, type Theme } from '../types';

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
    }

    canUseNativeFeature(feature: NativeFeatureKey) {
        const { fromVersion } = NATIVE_FEATURES_FROM_VERSION[this.environment][feature];

        return this.isCurrentVersionHigherOrEqual(fromVersion);
    }

    isCurrentVersionHigherOrEqual(versionToCompare: string) {
        type ExpectedTupple = [string, string, string, string];

        if (!NativeParamsService.isValidVersionFormat(versionToCompare)) {
            return false;
        }

        const matchPattern = /(\d+)\.(\d+)\.(\d+)/;

        const [, ...appVersionComponents] = this.appVersion.match(matchPattern) as ExpectedTupple; // Формат версии проверен в конструкторе, можно смело убирать `null` из типа.

        const [, ...versionToCompareComponents] = versionToCompare.match(
            matchPattern,
        ) as ExpectedTupple;

        for (let i = 0; i < appVersionComponents.length; i++) {
            if (appVersionComponents[i] !== versionToCompareComponents[i]) {
                return appVersionComponents[i] >= versionToCompareComponents[i];
            }
        }

        return true;
    }

    private static isValidVersionFormat(version?: string): version is string {
        if (!version) return false;
        const versionPattern = /^\d+\.\d+\.\d+$/;

        return versionPattern.test(version);
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
