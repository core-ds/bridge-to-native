import { QUERY_B2N_TITLE } from '../../query-and-headers-keys';
import { DEEP_LINK_PATTERN } from '../constants';
import { type PdfType } from '../types';

import { closeWebviewUtil } from './close-webview-util';
import { type NativeExecuteService } from './native-execute-service';
import { type NativeParamsService } from './native-params-service';

const QUERY_OPEN_IN_BROWSER_KEY = 'openInBrowser';
const QUERY_OPEN_IN_BROWSER_VALUE = 'true';

/**
 * Сервис, предоставляющий методы для открытия внешних для текущего WA экранов
 * и связанных с этим действий.
 */
export class ExternalLinksService {
    constructor(
        private nativeParamsService: NativeParamsService,
        private nativeExecuteService: NativeExecuteService,
    ) {}

    handleNativeDeeplink(deeplink: string, closeWebviewBeforeCallNativeDeeplinkHandler = false) {
        const clearedDeeplinkPath = deeplink.replace(DEEP_LINK_PATTERN, '');

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
                    setTimeout(() => {
                        window.location.replace(
                            `${this.nativeParamsService.appId}://${clearedDeeplinkPath}`,
                        );
                    }, 0);
                },
                { deeplink: `${this.nativeParamsService.appId}://${clearedDeeplinkPath}` },
            );

            return;
        }

        this.nativeExecuteService.execute(
            'nativeDeeplink',
            () =>
                window.location.replace(
                    `${this.nativeParamsService.appId}://${clearedDeeplinkPath}`,
                ),
            { deeplink: `${this.nativeParamsService.appId}://${clearedDeeplinkPath}` },
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
        if (!this.nativeParamsService.canUseNativeFeature('linksInBrowser')) {
            this.openInNewWebview(link);

            return;
        }

        const url = new URL(link);

        url.searchParams.append(QUERY_OPEN_IN_BROWSER_KEY, QUERY_OPEN_IN_BROWSER_VALUE);

        this.nativeExecuteService.execute(
            'openInBrowser',
            () => window.location.replace(url.href),
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

        this.nativeExecuteService.execute(
            'openPdf ',
            () => {
                const windowObjectReference = window.open(replaceUrl);

                if (windowObjectReference === null) {
                    window.location.replace(replaceUrl);
                }
            },
            { replaceUrl },
        );
    }
}
