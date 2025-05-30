import { COOKIE_KEY_BRIDGE_TO_NATIVE_DATA } from '../constants';
import { NativeParams } from '../types';
import {
    QUERY_NATIVE_IOS_APPID,
    HEADER_KEY_NATIVE_APPVERSION,
    QUERY_NATIVE_IOS_APPVERSION,
    QUERY_B2N_TITLE,
    QUERY_B2N_TITLE_DEPRECATED,
    QUERY_NATIVE_THEME,
    QUERY_B2N_NEXT_PAGEID,
} from './constants';
import { extractNativeServiceQueries } from './extract-native-queries';
import { iosAppIdPattern, versionPattern } from './regexp-patterns';
import { UniversalRequest } from './types';
import { getHeaderValue, getQueryValues, hasBridgeToNativeDataCookie } from './utils';

/**
 * Парсит запрос, доставая из него данные о нативном приложении,
 * которое подмешивает их туда.
 * Собранные данные о нативном приложении помещаются в не-HttpOnly куку
 * для дальнейшего использования клиентским кодом bridge2native.
 *
 * @param request Объект запроса (Request или IncomingMessage).
 * @param setResponseHeader Функция для добавления заголовка ответа.
 *  Нужно передать функцию, которая средствами используемого веб-сервера добавит заголовок в ответ.
 *  b2native добавит `Set-Cookie` заголовок с некоторыми данными для своего клиентского кода.
 */
export function prepareNativeAppDetailsForClient(
    request: UniversalRequest,
    setResponseHeader: (headerKey: string, headerValue: string) => void,
) {
    // Если кука с данными о нативном приложении уже есть, информация уже собрана,
    // делать больше ничего не нужно.
    // Возможна смена темы нативного приложения (светлая/тёмная) во время вебвью-сессии.
    // Но веб об этом не узнает, т.к. нативное приложение сообщает об этом
    // только при старте нового вебвью.
    if (hasBridgeToNativeDataCookie(request)) {
        return;
    }

    const nativeParams = parseRequest(request);
    const serializedNativeParams = encodeURIComponent(JSON.stringify(nativeParams));

    setResponseHeader(
        'Set-Cookie',
        `${COOKIE_KEY_BRIDGE_TO_NATIVE_DATA}=${serializedNativeParams}`,
    );
}

function parseRequest(request: UniversalRequest) {
    // Прихраним «сервисные» query-параметры от нативного приложения,
    // чтобы подмешать их к URL при переходе в другое веб-приложение
    // в рамках одной вебвью-сессии.
    const originalWebviewParams = extractNativeServiceQueries(request);

    // Чтобы понять, как парсится запрос, см. описания констант в `src/server/constants.ts`
    const [nextPageId, iosAppIdQuery, iosAppVersionQuery, theme, title, deprecatedTitle] =
        getQueryValues(request, [
            QUERY_B2N_NEXT_PAGEID,
            QUERY_NATIVE_IOS_APPID,
            QUERY_NATIVE_IOS_APPVERSION,
            QUERY_NATIVE_THEME,
            QUERY_B2N_TITLE,
            QUERY_B2N_TITLE_DEPRECATED,
        ]);
    const appVersionFromHeaders = getHeaderValue(request, HEADER_KEY_NATIVE_APPVERSION);

    const nativeParams: Partial<NativeParams> = {
        originalWebviewParams,
        theme: theme || 'light',
    };

    if (Number(nextPageId) > 1) {
        nativeParams.nextPageId = Number(nextPageId);
    }

    if (iosAppIdQuery && iosAppIdPattern.test(iosAppIdQuery)) {
        const [, appIdSubsting] = iosAppIdQuery.match(iosAppIdPattern) as string[]; // кастинг ок — в условии блока регулярка проверена

        nativeParams.iosAppId = appIdSubsting;
    }

    if (iosAppVersionQuery && versionPattern.test(iosAppVersionQuery)) {
        nativeParams.appVersion = iosAppVersionQuery;
    } else if (appVersionFromHeaders && versionPattern.test(appVersionFromHeaders)) {
        const [, versionSubstring] = appVersionFromHeaders.match(versionPattern) as string[]; // кастинг ок — в условии блока регулярка проверена

        nativeParams.appVersion = versionSubstring;
    } else {
        nativeParams.appVersion = '0.0.0';
    }

    if (typeof title === 'string') {
        nativeParams.title = title;
    } else if (typeof deprecatedTitle === 'string') {
        nativeParams.title = deprecatedTitle;
    }

    return nativeParams;
}
