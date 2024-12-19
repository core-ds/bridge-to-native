import {
    THEME_QUERY_KEY,
    TITLE_QUERY_KEY,
    IOS_APP_ID_QUERY_KEY,
    IOS_APP_VERSION_QUERY_KEY,
    NEXT_PAGE_ID_QUERY_KEY,
} from './constants';

import { extractAppVersion, extractNativeParamsFromCookie, getQueryParamValue } from './utils';

import { extractAndJoinOriginalWebviewParams } from './extract-and-join-original-webview-params';
import { iosAppIdPattern, versionPattern } from './reg-exp-patterns';
import { UniversalRequest } from './types';
import { NativeParams } from '../shared/types';

/**
 * Определяет, сделан ли запрос из вебвью, вытаскивает из него все детали о нативном приложении.
 *
 * @returns Примечание по `appVersion`: В вебвью окружении версия всегда имеет формат `x.x.x`.
 */

export const extractNativeParamsFromRequest = (request: UniversalRequest) => {
    const paramsFromCookie = extractNativeParamsFromCookie(request);

    if (paramsFromCookie) {
        return paramsFromCookie;
    }

    const themeQuery = getQueryParamValue(request, THEME_QUERY_KEY) || 'light';
    // При желании через диплинк на вебвью можно передать желаемый заголовок
    // По умолчанию нужна именно пустая строка.
    const title = getQueryParamValue(request, TITLE_QUERY_KEY) || '';
    // Говорят, этого может и не быть в урле. Формат `com.xxxxxxxxx.app`.
    const iosAppIdQuery = getQueryParamValue(request, IOS_APP_ID_QUERY_KEY);
    const iosAppVersionQuery = getQueryParamValue(request, IOS_APP_VERSION_QUERY_KEY);
    const nextPageId = getQueryParamValue(request, NEXT_PAGE_ID_QUERY_KEY);

    const originalWebviewParams = extractAndJoinOriginalWebviewParams(request);

    // Пробуем вытащить схему iOS приложения из query, если есть.
    let iosAppId: string | undefined = undefined;

    if (iosAppIdQuery && iosAppIdPattern.test(iosAppIdQuery)) {
        // Кастинг здесь ок, регулярка это гарантирует и совпадение с ней есть.
        const [, appIdSubsting] = iosAppIdQuery.match(iosAppIdPattern) as string[];

        iosAppId = appIdSubsting;
    }

    // Определяем версию приложения из query или заголовка.
    let appVersion = '0.0.0';

    const appVersionFromHeaders = extractAppVersion(request);

    if (iosAppVersionQuery && versionPattern.test(iosAppVersionQuery)) {
        appVersion = iosAppVersionQuery;
    } else if (appVersionFromHeaders && versionPattern.test(appVersionFromHeaders)) {
        // Кастинг здесь ок, регулярка это гарантирует и совпадение с ней есть.
        const [, versionSubstring] = appVersionFromHeaders.match(versionPattern) as string[];

        appVersion = versionSubstring;
    }

    const nativeParams: NativeParams = {
        appVersion,
        title,
        theme: themeQuery === 'dark' ? 'dark' : 'light',
        nextPageId: nextPageId ? Number(nextPageId) : null,
        originalWebviewParams,
    };

    if (iosAppId) {
        nativeParams.iosAppId = iosAppId;
    }

    return encodeURIComponent(JSON.stringify(nativeParams));
};
