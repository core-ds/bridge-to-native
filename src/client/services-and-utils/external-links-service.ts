import { QUERY_B2N_TITLE } from '../../query-and-headers-keys';
import { DEEP_LINK_PATTERN, NATIVE_FEATURES_FROM_VERSION } from '../constants';
import { type NativeFeatureContext, type PdfType } from '../types';

import { type NativeLogService } from './native-log-service';
import { type NativeParamsService } from './native-params-service';
import { appendFromCurrentQueryParamForIos, closeWebviewUtil } from './utils';

const CANCEL_NEW_CALLS_TO_NA_TIME = 150;
const QUERY_OPEN_IN_BROWSER_KEY = 'openInBrowser';
const QUERY_OPEN_IN_BROWSER_VALUE = 'true';

/**
 * Сервис, предоставляющий методы для открытия внешних для текущего WA экранов
 * и связанных с этим действий.
 */
export class ExternalLinksService {
    private navigationByNativeAppInProgress = false;

    constructor(
        private nativeParamsService: NativeParamsService,
        private nativeLogService: NativeLogService,
    ) {}

    handleNativeDeeplink(deeplink: string, closeWebviewBeforeCallNativeDeeplinkHandler = false) {
        if (this.navigationByNativeAppInProgress) {
            return;
        }
        const clearedDeeplinkPath = deeplink.replace(DEEP_LINK_PATTERN, '');
        const originalNativeUrl = `${this.nativeParamsService.appId}://${clearedDeeplinkPath}`;
        const preparedNativeUrl =
            this.nativeParamsService.environment === 'ios'
                ? appendFromCurrentQueryParamForIos(originalNativeUrl)
                : originalNativeUrl;

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

        let featureContext: NativeFeatureContext | null = null;

        const { fromVersion } =
            NATIVE_FEATURES_FROM_VERSION[this.nativeParamsService.environment].savedBackStack;

        if (
            this.nativeParamsService.environment === 'android' &&
            !this.nativeParamsService.isCurrentVersionHigherOrEqual(fromVersion)
        ) {
            featureContext = {
                feature: 'savedBackStack',
                fallbackReason: 'Открытие нового webview в Android приведет к закрытию текущего',
            };
        }

        this.nativeLogService.execute(
            'navigateByNativeApp',
            () => this.navigateByNativeApp(preparedNativeUrl),
            {
                payload: { deeplink: preparedNativeUrl },
                featureContext: featureContext ?? null,
            },
        );
    }

    getHrefToOpenInBrowser(link: string) {
        if (!this.nativeParamsService.canUseNativeFeature('linksInBrowser')) {
            if ((this, this.nativeParamsService.environment === 'android')) {
                this.nativeLogService.logFeatureFallback({
                    feature: 'linksInBrowser',
                    fallbackReason:
                        'Открытие в браузере технически недоступно, будет открыто в новом webview',
                    payload: { link },
                });
            }

            return `${this.nativeParamsService.appId}://webFeature?type=recommendation&url=${encodeURIComponent(
                link,
            )}`;
        }

        const url = new URL(link);

        url.searchParams.append(QUERY_OPEN_IN_BROWSER_KEY, QUERY_OPEN_IN_BROWSER_VALUE);

        return url.href;
    }

    openInBrowser(link: string) {
        if (this.navigationByNativeAppInProgress) {
            return;
        }

        if (!this.nativeParamsService.canUseNativeFeature('linksInBrowser')) {
            if ((this, this.nativeParamsService.environment === 'android')) {
                this.nativeLogService.logFeatureFallback({
                    feature: 'linksInBrowser',
                    fallbackReason:
                        'Открытие в браузере технически недоступно, будет открыто в новом webview',
                    payload: { link },
                });
            }
            this.openInNewWebview(link);

            return;
        }

        const url = new URL(link);

        url.searchParams.append(QUERY_OPEN_IN_BROWSER_KEY, QUERY_OPEN_IN_BROWSER_VALUE);

        this.nativeLogService.execute('openInBrowser', () => this.navigateByNativeApp(url.href), {
            payload: { url: url.href },
        });
    }

    openInNewWebview(link: string, nativeTitle = '', closeCurrentWebview = false) {
        const url = new URL(link);

        if (nativeTitle) {
            url.searchParams.set(QUERY_B2N_TITLE, nativeTitle);
        }

        this.handleNativeDeeplink(
            `/webFeature?type=recommendation&url=${encodeURIComponent(url.toString())}`,
            closeCurrentWebview,
        );
    }

    openPdf(url: string, type: PdfType = 'pdfFile', title?: string) {
        if (this.navigationByNativeAppInProgress) {
            return;
        }

        let replaceUrl = url;

        if (this.nativeParamsService.environment === 'ios') {
            const params = new URLSearchParams();

            params.append('type', type);
            params.append('url', decodeURIComponent(url));

            if (title) {
                params.append('title', title.replace(/\s/g, '_'));
            }

            const paramsStr = params.toString();

            replaceUrl = `${this.nativeParamsService.appId}:///dashboard/pdf_viewer?${paramsStr}`;
        }

        replaceUrl =
            this.nativeParamsService.environment === 'ios'
                ? appendFromCurrentQueryParamForIos(replaceUrl)
                : replaceUrl;

        this.nativeLogService.execute('openPdf ', () => this.navigateByNativeApp(replaceUrl), {
            payload: { replaceUrl },
        });
    }

    private navigateByNativeApp(url: string) {
        this.navigationByNativeAppInProgress = true;
        window.location.replace(url);

        setTimeout(() => {
            this.navigationByNativeAppInProgress = false;
        }, CANCEL_NEW_CALLS_TO_NA_TIME);
    }
}
