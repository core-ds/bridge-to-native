import {
    COOKIE_KEY_BRIDGE_TO_NATIVE_DATA,
    COOKIE_KEY_BRIDGE_TO_NATIVE_RELOAD,
    HEADER_KEY_COOKIE,
    HEADER_KEY_NATIVE_APPVERSION,
    HEADER_KEY_WV_LAUNCH_TIME,
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
import {
    getHeaderValue,
    getQueryValues,
    parseHeaderTimestamp,
    readNativeParamsFromCookie,
} from './utils';

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
    // Поскольку вебвью модули имеют особенность сохранять сессионную куку подолгу,
    // даже после перезагрузки устройства или обновления приложения/ОС, ее значение
    // актуализируется при каждом запросе на сервер. Исключением является вызов `reload()`.
    // В этом случае функция возвращает объект с параметрами, полученными из
    // ранее сохраненной куки, но перезаписываться кука не будет, потому что:
    // 1) Данных NA в запросе с большой вероятностью не будет;
    // 2) клиентская сторона сохранит всё, что нужно в SessionStorage
    const cookieHeader = getHeaderValue(request, HEADER_KEY_COOKIE);
    const nativeParamsFromCookie = readNativeParamsFromCookie(cookieHeader);
    const hasReloadFlag = cookieHeader?.includes(`${COOKIE_KEY_BRIDGE_TO_NATIVE_RELOAD}=true`);

    if (hasReloadFlag) {
        setResponseHeader(
            'Set-Cookie',
            `${COOKIE_KEY_BRIDGE_TO_NATIVE_RELOAD}=false; Max-Age=0; Path=/`,
        );

        if (nativeParamsFromCookie) {
            return nativeParamsFromCookie;
        }

        return parseRequest(request);
    }

    const nativeParams = parseRequest(request, nativeParamsFromCookie);
    const serializedNativeParams = encodeURIComponent(JSON.stringify(nativeParams));

    setResponseHeader(
        'Set-Cookie',
        `${COOKIE_KEY_BRIDGE_TO_NATIVE_DATA}=${serializedNativeParams}; Path=/`,
    );

    return nativeParams;
}

function parseRequest(
    request: UniversalRequest,
    nativeParamsFromCookie?: Partial<NativeParams> | null,
) {
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
    const webviewLaunchTime = parseHeaderTimestamp(
        getHeaderValue(request, HEADER_KEY_WV_LAUNCH_TIME),
    );

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

    // Версия приложения может приехать прямо в текущем request (в query-параметре `device_app_version`
    // или заголовке `app-version`), а при server-side переходах / возврате назад может уже не приехать.
    // В таких сценариях берём `appVersion` фолбэком из куки `bridgeToNativeData`.
    if (iosAppVersionQuery && versionPattern.test(iosAppVersionQuery)) {
        nativeParams.appVersion = iosAppVersionQuery;
    } else if (appVersionFromHeaders && versionPattern.test(appVersionFromHeaders)) {
        const [, versionSubstring] = appVersionFromHeaders.match(versionPattern) as string[]; // кастинг ок — в условии блока регулярка проверена

        nativeParams.appVersion = versionSubstring;
    } else if (
        nativeParamsFromCookie?.appVersion &&
        versionPattern.test(nativeParamsFromCookie.appVersion)
    ) {
        const [, versionSubstring] = nativeParamsFromCookie.appVersion.match(
            versionPattern,
        ) as string[];

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

    if (webviewLaunchTime) {
        nativeParams.webviewLaunchTime = webviewLaunchTime;
    }

    return nativeParams;
}
