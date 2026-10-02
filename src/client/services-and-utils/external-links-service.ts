import { type LogError, type NativeAppTarget, type PdfType } from '../types';

import {
    prepareNativeDeeplinkUrl,
    prepareOpenInBrowserUrl,
    prepareOpenInNewWebviewDeeplink,
    preparePdfUrl,
} from './native-links';
import { type NativeLogService } from './native-log-service';
import { type NativeParamsService } from './native-params-service';
import { closeWebviewUtil, validateUrl } from './utils';

const CANCEL_NEW_CALLS_TO_NA_TIME = 150;

/**
 * Сервис, предоставляющий методы для открытия внешних для текущего WA экранов
 * и связанных с этим действий.
 */
export class ExternalLinksService {
    private navigationByNativeAppInProgress = false;

    constructor(
        private nativeParamsService: NativeParamsService,
        private nativeLogService: NativeLogService,
        private logError?: LogError,
    ) {}

    handleNativeDeeplink(deeplink: string, closeWebviewBeforeCallNativeDeeplinkHandler = false) {
        if (this.navigationByNativeAppInProgress) {
            return;
        }
        const preparedNativeUrl = prepareNativeDeeplinkUrl(this.nativeAppTarget, deeplink);

        if (
            closeWebviewBeforeCallNativeDeeplinkHandler &&
            this.nativeParamsService.canUseNativeFeature('savedBackStack')
        ) {
            this.nativeLogService.execute('closeWebview', () => closeWebviewUtil());

            // Проверено, ОС получает диплинк и передаёт его NA, не смотря на то,
            // что это происходит в следующей макрозадаче после команды на закрытие WV.
            this.nativeLogService.execute(
                'nativeDeeplink',
                () => {
                    setTimeout(() => window.location.replace(preparedNativeUrl), 0);
                },
                { payload: { deeplink: preparedNativeUrl } },
            );

            return;
        }

        this.navigateByNativeApp(preparedNativeUrl, 'nativeDeeplink');
    }

    getHrefToOpenInBrowser(link: string) {
        if (!this.nativeParamsService.canUseNativeFeature('linksInBrowser')) {
            this.logBrowserFallback(link);

            return `${this.nativeParamsService.appId}://webFeature?type=recommendation&url=${encodeURIComponent(
                link,
            )}`;
        }

        this.validateUrlOrThrow(link);

        return prepareOpenInBrowserUrl(this.nativeAppTarget, link, true);
    }

    openInBrowser(link: string) {
        if (this.navigationByNativeAppInProgress) {
            return;
        }

        this.validateUrlOrThrow(link);

        const linksInBrowser = this.nativeParamsService.canUseNativeFeature('linksInBrowser');

        if (!linksInBrowser) {
            this.logBrowserFallback(link);
        }

        this.navigateByNativeApp(
            prepareOpenInBrowserUrl(this.nativeAppTarget, link, linksInBrowser),
            'openInBrowser',
        );
    }

    openInNewWebview(link: string, nativeTitle = '', closeCurrentWebview = false) {
        this.validateUrlOrThrow(link);

        if (
            this.nativeParamsService.environment === 'android' &&
            !this.nativeParamsService.canUseNativeFeature('savedBackStack')
        ) {
            this.nativeLogService.logFeatureFallback({
                feature: 'savedBackStack',
                fallbackReason: 'Открытие нового webview в Android приведет к закрытию текущего',
                payload: { link },
            });
        }

        this.handleNativeDeeplink(
            prepareOpenInNewWebviewDeeplink(link, nativeTitle),
            closeCurrentWebview,
        );
    }

    openPdf(url: string, type: PdfType = 'pdfFile', title?: string) {
        if (this.navigationByNativeAppInProgress) {
            return;
        }

        this.navigateByNativeApp(preparePdfUrl(this.nativeAppTarget, url, type, title), 'openPdf');
    }

    private get nativeAppTarget(): NativeAppTarget {
        return {
            platform: this.nativeParamsService.environment,
            appId: this.nativeParamsService.appId,
        };
    }

    /**
     * Логирует невалидный URL через `logError` и бросает ошибку.
     * Чистые функции сборки URL бросают ту же ошибку, но без логирования.
     */
    private validateUrlOrThrow(link: string) {
        if (!validateUrl(link, this.logError)) {
            throw new Error(`invalid url: ${link}`);
        }
    }

    private logBrowserFallback(link: string) {
        this.nativeLogService.logFeatureFallback({
            feature: 'linksInBrowser',
            fallbackReason:
                'Открытие в браузере технически недоступно, будет открыто в новом webview',
            payload: { link },
        });
    }

    private navigateByNativeApp(url: string, action: string) {
        this.nativeLogService.execute(
            action,
            () => {
                this.navigationByNativeAppInProgress = true;
                window.location.replace(url);

                setTimeout(() => {
                    this.navigationByNativeAppInProgress = false;
                }, CANCEL_NEW_CALLS_TO_NA_TIME);
            },
            { payload: { url } },
        );
    }
}
