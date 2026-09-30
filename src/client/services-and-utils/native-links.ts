import { QUERY_B2N_TITLE } from '../../query-and-headers-keys';
import { DEEP_LINK_PATTERN } from '../constants';
import { type NativeAppTarget, type PdfType } from '../types';

import { appendFromCurrentQueryParamForIos, validateUrl } from './utils';

const QUERY_OPEN_IN_BROWSER_KEY = 'openInBrowser';
const QUERY_OPEN_IN_BROWSER_VALUE = 'true';

/*
 * Чистые функции сборки URL, по которым NA открывает свои экраны.
 * Используются `ExternalLinksService` и экспортируются для окружений,
 * где экземпляр `BridgeToNative` не создаётся (например, миниаппы).
 */

const parseUrl = (link: string) => {
    const url = validateUrl(link);

    if (!url) {
        throw new Error(`invalid url: ${link}`);
    }

    return url;
};

/**
 * Собирает URL для открытия диплинка NA: `alfabank:///dashboard/x`, `/x`, `alfabank://x` → `<appId>://x`.
 * На iOS добавляет `fromCurrent=true`.
 */
export const prepareNativeDeeplinkUrl = (
    { platform, appId }: NativeAppTarget,
    deeplink: string,
) => {
    const nativeUrl = `${appId}://${deeplink.replace(DEEP_LINK_PATTERN, '')}`;

    return platform === 'ios' ? appendFromCurrentQueryParamForIos(nativeUrl) : nativeUrl;
};

/**
 * Собирает диплинк (без схемы) на открытие ссылки в новом WV.
 * Результат передаётся в `prepareNativeDeeplinkUrl` или `handleNativeDeeplink`.
 *
 * @throws Если `link` не абсолютный http(s) URL.
 */
export const prepareOpenInNewWebviewDeeplink = (link: string, nativeTitle = '') => {
    const url = parseUrl(link);

    if (nativeTitle) {
        url.searchParams.set(QUERY_B2N_TITLE, nativeTitle);
    }

    return `webFeature?type=recommendation&url=${encodeURIComponent(url.toString())}`;
};

/**
 * Собирает URL на открытие ссылки в браузере.
 * Если NA не умеет открывать ссылки в браузере — URL на открытие ссылки в новом WV.
 *
 * @param linksInBrowser Результат `canUseNativeFeature(platform, appVersion, 'linksInBrowser')`.
 * @throws Если `link` не абсолютный http(s) URL.
 */
export const prepareOpenInBrowserUrl = (
    target: NativeAppTarget,
    link: string,
    linksInBrowser: boolean,
) => {
    if (!linksInBrowser) {
        return prepareNativeDeeplinkUrl(target, prepareOpenInNewWebviewDeeplink(link));
    }

    const url = parseUrl(link);

    url.searchParams.append(QUERY_OPEN_IN_BROWSER_KEY, QUERY_OPEN_IN_BROWSER_VALUE);

    return url.href;
};

/**
 * Собирает URL на открытие PDF. На iOS — диплинк на нативный pdf_viewer,
 * на Android — исходный URL (его перехватывает NA).
 */
export const preparePdfUrl = (
    { platform, appId }: NativeAppTarget,
    url: string,
    type: PdfType = 'pdfFile',
    title?: string,
) => {
    if (platform !== 'ios') {
        return url;
    }

    const params = new URLSearchParams();

    params.append('type', type);
    params.append('url', decodeURIComponent(url));

    if (title) {
        params.append('title', title.replace(/\s/g, '_'));
    }

    return appendFromCurrentQueryParamForIos(
        `${appId}:///dashboard/pdf_viewer?${params.toString()}`,
    );
};
