import {
    THEME_QUERY_KEY,
    TITLE_QUERY_KEY,
    IOS_APP_ID_QUERY_KEY,
    IOS_APP_VERSION_QUERY_KEY,
    NEXT_PAGE_ID_QUERY_KEY,
} from './constants';

import { extractAppVersion } from './utils';

import { extractAndJoinOriginalWebviewParams } from './extract-and-join-original-webview-params';
import { iosAppIdPattern, versionPattern } from './reg-exp-patterns';
import { UniversalRequest } from "./types";
import { isWebviewEnvironment } from "./is-webview-environment";
import {NativeParams} from "../shared/types";

/**
 * Вытаскивает из query и headers все детали для вебвью.
 *
 * @returns Примечание по `appVersion`: В вебвью окружении версия всегда имеет формат `x.x.x`.
 */

export const extractNativeParams = (
    request: UniversalRequest
): NativeParams | null => {

    if(!isWebviewEnvironment(request)) {
        return null;
    }

    const {
        [THEME_QUERY_KEY]: themeQuery,
        // При желании через диплинк на вебвью можно передать желаемый заголовок
        // По умолчанию нужна именно пустая строка.
        [TITLE_QUERY_KEY]: title = '',
        // Говорят, этого может и не быть в урле. Формат `com.xxxxxxxxx.app`.
        [IOS_APP_ID_QUERY_KEY]: iosAppIdQuery,
        [IOS_APP_VERSION_QUERY_KEY]: iosAppVersionQuery,
        [NEXT_PAGE_ID_QUERY_KEY]: nextPageId,
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
        title,
        iosAppId,
        theme: themeQuery === 'dark' ? 'dark' : 'light',
        nextPageId: nextPageId ? Number(nextPageId) : null,
        originalWebviewParams,
    };

    return nativeParams;
};
