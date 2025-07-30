import { QUERY_B2N_TITLE } from '../../constants';
import { DEEP_LINK_PATTERN } from '../constants';
import { type PdfType } from '../types';

import { closeWebviewUtil } from './close-webview-util';
import { type NativeParamsService } from './native-params-service';

const QUERY_OPEN_IN_BROWSER_KEY = 'openInBrowser';
const QUERY_OPEN_IN_BROWSER_VALUE = 'true';

/**
 * Сервис, предоставляющий методы для открытия внешних для текущего WA экранов
 * и связанных с этим действий.
 */
export class ExternalLinksService {
    constructor(private nativeParamsService: NativeParamsService) {}

    handleNativeDeeplink(deeplink: string, closeWebviewBeforeCallNativeDeeplinkHandler = false) {
        const clearedDeeplinkPath = deeplink.replace(DEEP_LINK_PATTERN, '');

        if (
            closeWebviewBeforeCallNativeDeeplinkHandler &&
            this.nativeParamsService.canUseNativeFeature('savedBackStack')
        ) {
            closeWebviewUtil();

            // Проверено, ОС получает диплинк и передаёт его NA, не смотря на то,
            // что это происходит в следующей макрозадаче после команды на закрытие WV.
            setTimeout(
                () =>
                    window.location.replace(
                        `${this.nativeParamsService.appId}://${clearedDeeplinkPath}`,
                    ),
                0,
            );

            return;
        }

        window.location.replace(`${this.nativeParamsService.appId}://${clearedDeeplinkPath}`);
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

        window.location.replace(url.href);
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
        const params = new URLSearchParams();

        params.append('type', type);
        params.append('url', decodeURIComponent(url));

        if (title) {
            params.append('title', title.replace(/\s/g, '_'));
        }

        let replaceUrl = url;
        const paramsStr = params.toString();

        if (this.nativeParamsService.environment === 'ios') {
            replaceUrl = `${this.nativeParamsService.appId}:///dashboard/pdf_viewer?${paramsStr}`;
        }

        const windowObjectReference = window.open(replaceUrl);

        if (windowObjectReference === null) {
            window.location.replace(replaceUrl);
        }
    }
}
