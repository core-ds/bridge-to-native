import {
    COOKIE_KEY_BRIDGE_TO_NATIVE_DATA,
    HEADER_KEY_COOKIE,
    HEADER_KEY_NATIVE_APPVERSION,
    QUERY_B2N_NEXT_PAGEID,
    QUERY_B2N_TITLE,
    QUERY_B2N_TITLE_DEPRECATED,
    QUERY_NATIVE_IOS_APPID,
    QUERY_NATIVE_IOS_APPVERSION,
    QUERY_NATIVE_THEME,
} from '../query-and-headers-keys';
import { type NativeParams } from '../types';

import { extractNativeServiceQueries } from './extract-native-service-queries';
import { iosAppIdPattern, versionPattern } from './regexp-patterns';
import { type UniversalRequest } from './types';
import { getHeaderValue, getQueryValues, hasBridgeToNativeDataCookie, parseCookies } from './utils';

/**
 * Парсит запрос, доставая из него данные о нативном приложении,
 * которое подмешивает их туда.
 * Собранные данные о нативном приложении помещаются в не-HttpOnly куку
 * для дальнейшего использования клиентским кодом bridge2native.
 *
 * @param request Объект запроса (Request или IncomingMessage).
 * @param setResponseHeader Функция для добавления заголовка ответа.
 *  Нужно передать функцию, которая средствами используемого веб-сервера добавит заголовок в ответ.
 *  b2native с её помощью добавит `Set-Cookie` заголовок с некоторыми данными для своего клиентского кода.
 */
export function prepareNativeAppDetailsForClient(
    request: UniversalRequest,
    setResponseHeader: (headerKey: string, headerValue: string) => void,
) {
    // Проверяем наличие куки bridgeToNativeData в запросе. Если куки нет — устанавливаем её.
    // Также сверяем тему из query-параметров с темой, сохранённой в куке, потому что
    // при повторном открытии WebView сессионная кука может сохраниться, и если тема приложения
    // изменилась между сессиями, WebView и нативное приложение будут не синхронизированы.
    // В таком случае обновляем куку актуальными данными из query-параметров
    const cookieHeader = getHeaderValue(request, HEADER_KEY_COOKIE);
    const nativeParams = parseRequest(request);

    const shouldUpdateCookie =
        !hasBridgeToNativeDataCookie(cookieHeader) || !isSameTheme(request, cookieHeader);

    if (shouldUpdateCookie) {
        const serializedNativeParams = encodeURIComponent(JSON.stringify(nativeParams));

        setResponseHeader(
            'Set-Cookie',
            `${COOKIE_KEY_BRIDGE_TO_NATIVE_DATA}=${serializedNativeParams}; Path=/`,
        );

        return nativeParams;
    }

    return nativeParams;
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

    // Здесь такая проверка сделана намеренно, чтобы можно было задать пустой заголовок с помощью пустой строки:
    // http://example.com?b2n-title=    →   title === ''
    // http://example.com               →   title === null
    if (typeof title === 'string') {
        nativeParams.title = title;
    } else if (typeof deprecatedTitle === 'string') {
        nativeParams.title = deprecatedTitle;
    }

    return nativeParams;
}

// Возвращает результат сравнения темы полученной, из query-параметров
// с темой, полученной из cookie
function isSameTheme(request: UniversalRequest, cookies: string | null) {
    if (!cookies) return false;

    const [themeFromQuery] = getQueryValues(request, [QUERY_NATIVE_THEME]);
    const parsedCookies = parseCookies(cookies);
    const bridgeCookie = parsedCookies[COOKIE_KEY_BRIDGE_TO_NATIVE_DATA];

    try {
        return JSON.parse(bridgeCookie || '{}').theme === themeFromQuery;
    } catch (_) {
        return false;
    }
}
