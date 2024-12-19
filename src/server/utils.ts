import { APP_VERSION_HEADER_KEY, NATIVE_PARAMS_COOKIE_KEY } from './constants';
import { UniversalRequest } from './types';

/**
 * Возвращает значение HTTP-заголовка запроса по ключу.
 */
export function getHeaderValue(request: UniversalRequest, headerKey: string) {
    if (!(request.headers instanceof Headers)) {
        return request.headers[headerKey] || null;
    }

    // Если есть несколько заголовком с одним ключем, они разделяются запятой с пробелом,
    // см. примеры тут → https://developer.mozilla.org/en-US/docs/Web/API/Headers/get#examples
    const sameKeyHeadersSeparator = ', ';

    const headerValue = request.headers.get(headerKey);
    const severalValues = headerValue?.split(sameKeyHeadersSeparator);

    if (!Array.isArray(severalValues)) {
        return null;
    }

    return severalValues.length > 1 ? severalValues : severalValues[0];
}

/**
 * Возвращает значение query-параметра по ключу.
 */
export function getQueryParamValue(request: UniversalRequest, queryKey: string) {
    if (!request.url) {
        return null;
    }

    return new URL(request.url).searchParams.get(queryKey);
}

/**
 * Возвращает `app-version` из заголовков запроса.
 */
export function extractAppVersion(request: UniversalRequest) {
    const appVersionValue = getHeaderValue(request, APP_VERSION_HEADER_KEY);

    // Не должно быть несколько таких заголовков, но если так почему-то случилось, работаем с первым.
    return Array.isArray(appVersionValue) ? appVersionValue[0] : appVersionValue;
}

/**
 * Возвращает `user-agent` из заголовков запроса.
 */
export function extractUserAgent(request: UniversalRequest) {
    const uaValue = getHeaderValue(request, 'user-agent');

    // Не должно быть несколько таких заголовков, но если так почему-то случилось, работаем с первым.
    return Array.isArray(uaValue) ? uaValue[0] : uaValue;
}

/**
 * Возвращает объект с параметрами нативного приложения из cookie, если они были сохранены ранее.
 */
export function extractNativeParamsFromCookie(request: UniversalRequest) {
    const cookies = getHeaderValue(request, 'cookie');

    if (!cookies) {
        return null;
    }

    const cookiesArray = typeof cookies === 'string' ? [cookies] : cookies;
    const nativeParamsCookie = cookiesArray.find((cookie) =>
        cookie.startsWith(NATIVE_PARAMS_COOKIE_KEY),
    );

    if (!nativeParamsCookie) {
        return null;
    }

    const [, value] = nativeParamsCookie.split('=');

    return value;
}
