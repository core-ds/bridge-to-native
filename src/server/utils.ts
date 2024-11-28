import { RequestHeaderType } from './types';
import { extractNativeParamsFromCookies } from "../shared/utils";

/**
 * Заголовок с версией приложения, который посылает вебвью из AM Android
 */
const AppVersion = 'app-version';

/**
 * Возвращает `app-version` из заголовков запроса
 */
export function extractAppVersion(request: RequestHeaderType): string | undefined {
    return request.headers[AppVersion];
}

/**
 * Возвращает `User-agent` из заголовков запроса
 */
export function extractUserAgent(request: RequestHeaderType): string {
    return request.headers['user-agent'];
}

/**
 * Возвращает объект с `webview-параметрами` из cookies
 */
export function extractNativeParamsFromCookieHeader(request: RequestHeaderType): Record<string, unknown> | null {
    return extractNativeParamsFromCookies(request.headers['cookie'])
}
