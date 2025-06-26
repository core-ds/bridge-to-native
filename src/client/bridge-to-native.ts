/* eslint-disable no-underscore-dangle */

import { type NativeParams } from '../types';

import {
    ANDROID_APP_ID,
    CLOSE_WEBVIEW_SEARCH_KEY,
    CLOSE_WEBVIEW_SEARCH_VALUE,
    nativeFeaturesFromVersion,
    PREVIOUS_B2N_STATE_STORAGE_KEY,
    versionToIosAppId,
} from './constants';
import { Mediator } from './mediator';
import { NativeFallbacks } from './native-fallbacks';
// eslint-disable-next-line import/no-cycle -- TODO следующим этапом, подумать, как устранить
import { NativeNavigationAndTitle } from './native-navigation-and-title';
import {
    type BrowserHistoryAbstractions,
    type Environment,
    type NativeFeatureKey,
    type PreviousBridgeToNativeState,
    type Theme,
} from './types';
import { isValidVersionFormat } from './utils';

/**
 * Этот класс — абстракция для связи веб приложения с нативом и предназначен ТОЛЬКО
 * для использования в вебвью окружении.
 */
export class BridgeToNative {
    // Webview, запущенное в Android окружении имеет объект `Android` в window.
    public readonly AndroidBridge = window.Android;

    public readonly environment: Environment = this.AndroidBridge ? 'android' : 'ios';

    public readonly nativeFallbacks: NativeFallbacks;

    private nextPageId: number | null;

    /**
     * @param browserHistoryAbstractions Методы, которые вызовут методы обертки (например из react-router)
     *  над [History](https://developer.mozilla.org/en-US/docs/Web/API/History), если ваше WA такие использует.
     *  Если аргумент не передать, будут использованы стандартные `History: pushState()` и `History: go()`.
     * @param nativeParams TODO: Удалить параметр, брать детали нативного приложения из куки.
     */
    constructor(
        private browserHistoryAbstractions?: BrowserHistoryAbstractions,
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
        this._appId = this.getAppId(nativeParams?.iosAppId);
        this._theme = nativeParams?.theme === 'dark' ? 'dark' : 'light';
        this._originalWebviewParams = nativeParams?.originalWebviewParams || '';
        this._nativeNavigationAndTitle = new NativeNavigationAndTitle(
            new Mediator(
                this.AndroidBridge,
                this.appId,
                browserHistoryAbstractions,
                this.canUseNativeFeature.bind(this),
                this.closeWebview.bind(this),
                this.environment,
                this.originalWebviewParams,
                this.restorePreviousState.bind(this),
            ),
            nativeParams ? nativeParams.nextPageId : null,
            nativeParams?.title,
        );

        this.nextPageId = nativeParams ? nativeParams.nextPageId : null;
        this.nativeFallbacks = new NativeFallbacks(this);
    }

    private _nativeNavigationAndTitle: NativeNavigationAndTitle;

    get nativeNavigationAndTitle() {
        return this._nativeNavigationAndTitle;
    }

    private _originalWebviewParams: string;

    get originalWebviewParams() {
        return this._originalWebviewParams;
    }

    // В формате `x.x.x`.
    private _appVersion: string;

    get appVersion() {
        return this._appVersion;
    }

    // Необходимо для формирования диплинка.
    private _appId: string;

    get appId() {
        return this._appId;
    }

    private _theme: Theme;

    get theme() {
        return this._theme;
    }

    /**
     * Метод, проверяющий, можно ли использовать нативную функциональность в текущей версии приложения.
     *
     * @param feature Название функциональности, которую нужно проверить.
     */
    public canUseNativeFeature(feature: NativeFeatureKey) {
        const { fromVersion } = nativeFeaturesFromVersion[this.environment][feature];

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
            iosAppId: this._appId,
        };

        sessionStorage.setItem(PREVIOUS_B2N_STATE_STORAGE_KEY, JSON.stringify(currentState));
    }

    /**
     * Возвращает схему приложения в iOS окружении, на основе версии.
     *
     * @param knownIosAppId Тип iOS приложения, если он известен.
     * @returns Тип приложения, `undefined` для Android окружения.
     */
    private getAppId(knownIosAppId?: string) {
        if (this.environment !== 'ios') {
            return ANDROID_APP_ID;
        }

        if (knownIosAppId) {
            return knownIosAppId;
        }

        const keys = Object.keys(versionToIosAppId);

        const rightKey =
            [...keys].reverse().find((version) => this.isCurrentVersionHigherOrEqual(version)) ||
            keys[0];

        return versionToIosAppId[rightKey as keyof typeof versionToIosAppId];
    }

    /**
     * Восстанавливает свое предыдущее состояние из sessionStorage
     */
    private restorePreviousState() {
        const previousState: PreviousBridgeToNativeState = JSON.parse(
            sessionStorage.getItem(PREVIOUS_B2N_STATE_STORAGE_KEY) || '',
        );

        this._appVersion = previousState.appVersion;
        this._appId = this.getAppId(previousState.iosAppId);
        this._theme = previousState.theme;
        this._originalWebviewParams = previousState.originalWebviewParams;
        this.nextPageId = previousState.nextPageId;
        this._nativeNavigationAndTitle = new NativeNavigationAndTitle(
            new Mediator(
                this.AndroidBridge,
                this.appId,
                this.browserHistoryAbstractions,
                this.canUseNativeFeature.bind(this),
                this.closeWebview.bind(this),
                this.environment,
                this.originalWebviewParams,
                this.restorePreviousState.bind(this),
            ),
            previousState.nextPageId,
            '',
        );

        sessionStorage.removeItem(PREVIOUS_B2N_STATE_STORAGE_KEY);
    }
}
