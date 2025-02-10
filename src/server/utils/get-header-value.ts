import { APP_VERSION_HEADER_KEY } from '../constants';
import { UniversalRequest } from '../types';

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
