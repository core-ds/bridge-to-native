import { NATIVE_PARAMS_COOKIE_KEY } from "../server/constants";

/**
 * Возвращает объект с `webview-параметрами` из cookies
 */
export function extractNativeParamsFromCookies(cookies?: string): Record<string, unknown> | null {

    if (!cookies) {
        return null;
    }

    const cookiesArray = cookies.split('; ');
    const cookieString = cookiesArray.find((cookie: string) => cookie.startsWith(`${NATIVE_PARAMS_COOKIE_KEY}=`));

    if (!cookieString) return null;

    const [, value] = cookieString.split('=');

    try {
        return JSON.parse(decodeURIComponent(value));
    } catch {
        return null;
    }
}
