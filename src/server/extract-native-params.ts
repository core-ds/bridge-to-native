import {
    THEME_QUERY,
    TITLE,
    WEBVIEW_IOS_APP_ID_QUERY,
    WEBVIEW_IOS_APP_VERSION_QUERY,
    WEBVIEW_NEXT_PAGE_ID_QUERY,
    WEBVIEW_WITHOUT_LAYOUT_QUERY,
} from './constants';

import { extractAppVersion } from './utils';

import { extractAndJoinOriginalWebviewParams } from './extract-and-join-original-webview-params';
import { iosAppIdPattern, versionPattern } from './reg-exp-patterns';
import { WebviewParams, RequestHeaderType } from "./types";
import { isWebviewEnvironment } from "./is-webview-environment";

/**
 * Вытаскивает из query и headers все детали для вебвью.
 *
 * @returns Примечание по `appVersion`: В вебвью окружении версия всегда имеет формат `x.x.x`.
 */

export const extractNativeParams = (
    request: RequestHeaderType
): WebviewParams | null => {

    if(!isWebviewEnvironment(request)) {
        return null;
    }

    const {
        [THEME_QUERY]: themeQuery,
        // При желании через диплинк на вебвью можно передать желаемый заголовок
        // По умолчанию нужна именно пустая строка.
        [TITLE]: title = '',
        // Говорят, этого может и не быть в урле. Формат `com.xxxxxxxxx.app`.
        [WEBVIEW_IOS_APP_ID_QUERY]: iosAppIdQuery,
        [WEBVIEW_IOS_APP_VERSION_QUERY]: iosAppVersionQuery,
        [WEBVIEW_WITHOUT_LAYOUT_QUERY]: withoutLayoutQuery,
        [WEBVIEW_NEXT_PAGE_ID_QUERY]: nextPageId,
    } = request.query as Record<string, string>;

    const originalWebviewParams = extractAndJoinOriginalWebviewParams(
        request.query as Record<string, string>,
    );

    // Пробуем вытащить схему iOS приложения из query, если есть.
    let iosAppId;

    if (iosAppIdPattern.test(iosAppIdQuery)) {
        const [, appIdSubsting] = iosAppIdQuery.match(iosAppIdPattern) as string[];

        iosAppId = appIdSubsting;
    }

    // Определяем версию приложения из query или заголовка.
    let appVersion = '0.0.0';

    const appVersionFromHeaders = extractAppVersion(request);

    if (typeof iosAppVersionQuery === 'string' && versionPattern.test(iosAppVersionQuery)) {
        appVersion = iosAppVersionQuery;
    } else if (
        typeof appVersionFromHeaders === 'string' &&
        versionPattern.test(appVersionFromHeaders)
    ) {
        const [, versionSubstring] = appVersionFromHeaders.match(versionPattern) || [];

        appVersion = versionSubstring;
    }

    const nativeParams = {
        appVersion,
        iosAppId,
        isWebview: true,
        theme: themeQuery === 'dark' ? 'dark' : 'light',
        title,
        withoutLayout: withoutLayoutQuery === 'true',
        originalWebviewParams,
        nextPageId: nextPageId ? Number(nextPageId) : null,
    } as WebviewParams;

    return nativeParams;
};
