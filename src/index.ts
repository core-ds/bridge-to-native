/* eslint-disable no-underscore-dangle */

import {
    CLOSE_WEBVIEW_SEARCH_KEY,
    CLOSE_WEBVIEW_SEARCH_VALUE,
    nativeFeaturesFromVersion,
    PREVIOUS_B2N_STATE_STORAGE_KEY,
    versionToIosAppId,
} from './constants';
import { NativeFallbacks } from './native-fallbacks';
import { HandleRedirect, NativeNavigationAndTitle } from './native-navigation-and-title';
import type {
    Environment,
    NativeFeatureKey,
    NativeFeaturesFts,
    NativeParams,
    WebViewWindow,
} from './types';
import { PreviousBridgeToNativeState } from './types';
import { isValidVersionFormat } from './utils';

type Theme = 'light' | 'dark';

/**
 * Этот класс - абстракция для связи веб приложения с нативом и предназначен ТОЛЬКО
 * для использования в вебвью окружении.
 */
export class BridgeToNative {
    // Webview, запущенное в Android окружении имеет объект `Android` в window.
    public readonly AndroidBridge = (window as WebViewWindow).Android;

    public readonly environment: Environment = this.AndroidBridge ? 'android' : 'ios';

    public readonly nativeFallbacks: NativeFallbacks;

    private nextPageId: number | null;

    private _nativeNavigationAndTitle: NativeNavigationAndTitle;

    private _originalWebviewParams: string;

    // В формате `x.x.x`.
    private _appVersion: string;

    // Необходимо для формирования диплинка.
    private _iosAppId?: string;

    private _theme: Theme;

    private _handleRedirect: HandleRedirect;

    constructor(
        public nativeFeaturesFts: NativeFeaturesFts = {'linksInBrowserAndroid': true, 'linksInBrowserIos': true},
        handleRedirect: HandleRedirect,
        nativeParams?: NativeParams,
    ) {
        const previousState = !!sessionStorage.getItem(PREVIOUS_B2N_STATE_STORAGE_KEY);

        if (previousState) {
            this.restorePreviousState();
            this.nativeFallbacks = new NativeFallbacks(this);

            return;
        }

        this._appVersion =
            nativeParams && isValidVersionFormat(nativeParams?.appVersion)
                ? nativeParams.appVersion
                : '0.0.0';
        this._iosAppId = this.getIosAppId(nativeParams?.iosAppId);
        this._theme = nativeParams?.theme === 'dark' ? 'dark' : 'light';
        this._originalWebviewParams = nativeParams?.originalWebviewParams || '';
        this._nativeNavigationAndTitle = new NativeNavigationAndTitle(
            this,
            nativeParams ? nativeParams.nextPageId : null,
            nativeParams?.title,
            handleRedirect,
        );
        this._handleRedirect = handleRedirect;

        this.nextPageId = nativeParams ? nativeParams.nextPageId : null;
        this.nativeFallbacks = new NativeFallbacks(this);
    }

    get theme() {
        return this._theme;
    }

    get appVersion() {
        return this._appVersion;
    }

    get iosAppId() {
        return this._iosAppId;
    }

    get nativeNavigationAndTitle() {
        return this._nativeNavigationAndTitle;
    }

    get originalWebviewParams() {
        return this._originalWebviewParams;
    }

    /**
     * Метод, проверяющий, можно ли использовать нативную функциональность в текущей версии приложения.
     *
     * @param feature Название функциональности, которую нужно проверить.
     */
    public canUseNativeFeature(feature: NativeFeatureKey) {
        const { nativeFeatureFtKey, fromVersion } =
            nativeFeaturesFromVersion[this.environment][feature];

        if (nativeFeatureFtKey && !this.nativeFeaturesFts[nativeFeatureFtKey]) {
            return false;
        }

        return this.isCurrentVersionHigherOrEqual(fromVersion);
    }

    /**
     * Метод, отправляющий сигнал нативу, что нужно закрыть текущее вебвью.
     */
    // eslint-disable-next-line class-methods-use-this
    public closeWebview() {
        const originalPageUrl = new URL(window.location.href);

        originalPageUrl.searchParams.set(CLOSE_WEBVIEW_SEARCH_KEY, CLOSE_WEBVIEW_SEARCH_VALUE);
        window.location.href = originalPageUrl.toString();
    }

    /**
     * Сравнивает текущую версию приложения с переданной.
     *
     * @param versionToCompare Версия, с которой нужно сравнить текущую.
     * @returns `true` – текущая версия больше или равняется переданной,
     *  `false` – текущая версия ниже.
     */
    public isCurrentVersionHigherOrEqual(versionToCompare: string) {
        if (!isValidVersionFormat(versionToCompare)) {
            return false;
        }

        const matchPattern = /(\d+)\.(\d+)\.(\d+)/;

        type ExpectedTupple = [string, string, string, string];

        const [, ...appVersionComponents] = this._appVersion.match(matchPattern) as ExpectedTupple; // Формат версии проверен в конструкторе, можно смело убирать `null` из типа.

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

    /**
     * Сохраняет текущее состояние BridgeToNative в sessionStorage.
     * Так же сохраняет текущее состояние nativeNavigationAndTitle.
     */
    private saveCurrentState() {
        // В nativeNavigationAndTitle этот метод отмечен модификатором доступа private дабы не торчал наружу, но тут его нужно вызвать
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this._nativeNavigationAndTitle.saveCurrentState();

        const currentState: PreviousBridgeToNativeState = {
            appVersion: this._appVersion,
            theme: this._theme,
            nextPageId: this.nextPageId,
            originalWebviewParams: this._originalWebviewParams || '',
            iosAppId: this._iosAppId,
        };

        sessionStorage.setItem(PREVIOUS_B2N_STATE_STORAGE_KEY, JSON.stringify(currentState));
    }

    /**
     * Возвращает схему приложения в iOS окружении, на основе версии.
     *
     * @param knownIosAppId Тип iOS приложения, если он известен.
     * @returns Тип приложения, `undefined` для Android окружения.
     */
    private getIosAppId(knownIosAppId?: string) {
        if (this.environment !== 'ios') {
            return undefined;
        }

        if (knownIosAppId) {
            return knownIosAppId;
        }

        const keys = Object.keys(versionToIosAppId);

        const rightKey =
            [...keys].reverse().find((version) => this.isCurrentVersionHigherOrEqual(version)) ||
            keys[0];

        return atob(versionToIosAppId[rightKey as keyof typeof versionToIosAppId]);
    }

    /**
     * Восстанавливает свое предыдущее состояние из sessionStorage
     */
    private restorePreviousState() {
        const previousState: PreviousBridgeToNativeState = JSON.parse(
            sessionStorage.getItem(PREVIOUS_B2N_STATE_STORAGE_KEY) || '',
        );

        this._appVersion = previousState.appVersion;
        this._iosAppId = previousState.iosAppId;
        this._theme = previousState.theme;
        this._originalWebviewParams = previousState.originalWebviewParams;
        this.nextPageId = previousState.nextPageId;
        this._nativeNavigationAndTitle = new NativeNavigationAndTitle(
            this,
            previousState.nextPageId,
            '',
            this._handleRedirect,
        );

        sessionStorage.removeItem(PREVIOUS_B2N_STATE_STORAGE_KEY);
    }
}
