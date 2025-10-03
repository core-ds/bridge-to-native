import { bridgeToNativeDataCookieExistencePattern } from './regexp-patterns';
import { type UniversalRequest } from './types';

/**
 * На основе объекта запроса любого типа возвращает
 * значение заголовка по заданному ключу.
 *
 * @param request Объект запроса (Request или IncomingMessage).
 * @param headerKey Ключ заголовка, значение которого нужно получить.
 */
export function getHeaderValue(request: UniversalRequest, headerKey: string) {
    if (request.headers instanceof Headers) {
        return request.headers.get(headerKey);
    }

    const headerValue = request.headers[headerKey] || null;

    // Массив создается только для множественных `set-cookie` заголовков,
    // что не актуально в контексте запроса из браузера.
    // https://nodejs.org/api/http.html#messageheaders
    return Array.isArray(headerValue) ? headerValue[0] : headerValue;
}

/**
 * На основе объекта запроса любого типа возвращает
 * значение query-параметра(ов) по ключу(ам).
 *
 * @param request Объект запроса (Request или IncomingMessage).
 * @param queryKeys Ключ(и) query-параметра(ов), значение(я) которого(ых) нужно получить.
 */
export function getQueryValues(request: UniversalRequest, queryKeys: string): string | null;
export function getQueryValues(
    request: UniversalRequest,
    queryKeys: string[],
): Array<string | null>;
export function getQueryValues(request: UniversalRequest, queryKeys: string | string[]) {
    if (!request.url || request.url.indexOf('?') === -1) {
        return Array.isArray(queryKeys) ? queryKeys.map(() => null) : null;
    }

    const [, queryString] = request.url.split('?');

    const searchParams = new URLSearchParams(queryString);

    if (Array.isArray(queryKeys)) {
        return queryKeys.map((key) => searchParams.get(key));
    }

    return searchParams.get(queryKeys);
}

/**
 * Проверяет наличие в запросе bridgeToNativeData куки.
 *
 * @param request Объект запроса (Request или IncomingMessage).
 */
export function hasBridgeToNativeDataCookie(cookies: string | null) {
    return Boolean(cookies && bridgeToNativeDataCookieExistencePattern.test(cookies));
}

export function parseCookies(cookieHeader: string): Record<string, string> {
    return cookieHeader.split(';').reduce(
        (acc, part) => {
            const [key, ...rest] = part.split('=');

            const trimmedKey = key.trim();

            if (!trimmedKey) return acc;
            acc[trimmedKey] = decodeURIComponent(rest.join('=').trim());

            return acc;
        },
        {} as Record<string, string>,
    );
}
