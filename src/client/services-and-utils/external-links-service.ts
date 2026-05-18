import { QUERY_B2N_TITLE } from '../../query-and-headers-keys';
import { DEEP_LINK_PATTERN } from '../constants';
import { type PdfType } from '../types';

import { type NativeExecuteService } from './native-execute-service';
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
        private nativeExecuteService: NativeExecuteService,
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
            this.nativeExecuteService.execute('closeWebview', () => closeWebviewUtil());

            // Проверено, ОС получает диплинк и передаёт его NA, не смотря на то,
            // что это происходит в следующей макрозадаче после команды на закрытие WV.
            this.nativeExecuteService.execute(
                'nativeDeeplink',
                () => {
                    setTimeout(() => window.location.replace(preparedNativeUrl), 0);
                },
                { deeplink: preparedNativeUrl },
            );

            return;
        }

        this.nativeExecuteService.execute(
            'nativeDeeplink',
            () => this.navigateByNativeApp(preparedNativeUrl),
            { deeplink: preparedNativeUrl },
        );
    }

    getHrefToOpenInBrowser(link: string) {
        if (!this.nativeParamsService.canUseNativeFeature('linksInBrowser')) {
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
            this.openInNewWebview(link);

            return;
        }

        const url = new URL(link);

        url.searchParams.append(QUERY_OPEN_IN_BROWSER_KEY, QUERY_OPEN_IN_BROWSER_VALUE);

        this.nativeExecuteService.execute(
            'openInBrowser',
            () => this.navigateByNativeApp(url.href),
            { url: url.href },
        );
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

        this.nativeExecuteService.execute(
            'openPdf ',
            () => this.navigateByNativeApp(replaceUrl),
            { replaceUrl },
        );
    }

    private navigateByNativeApp(url: string) {
        this.navigationByNativeAppInProgress = true;
        window.location.replace(url);

        setTimeout(() => {
            this.navigationByNativeAppInProgress = false;
        }, CANCEL_NEW_CALLS_TO_NA_TIME);
    }
}
