import {
    extractAppVersion,
    extractUserAgent,
    isAkeyWebview,
    extractNativeParamsFromCookies
} from './utils';
import { RequestHeaderType } from './types';
import { versionPattern, webviewUaIOSPattern } from './reg-exp-patterns';

export const isWebviewByUserAgent = (
    userAgent: string,
    appVersion: string | undefined,
) => {
    if (userAgent && isAkeyWebview(userAgent)) {
        return false;
    }

    return (
        (appVersion && versionPattern.test(appVersion)) || !!userAgent?.match(webviewUaIOSPattern)
    );
};

export const isWebviewByCookies = (nativeParamsFromCookies: Record<string, any> | null) => {
    return !!(nativeParamsFromCookies && nativeParamsFromCookies.isWebview)
}
export const checkIsWebview = (
    request: RequestHeaderType,
): boolean => {
    const userAgent = extractUserAgent(request);

    // `app-version` в заголовках – индикатор вебвью. В iOS есть только в первом запросе от webview
    const appVersion = extractAppVersion(request);
    const nativeParamsFromCookies = extractNativeParamsFromCookies(request);

    return isWebviewByCookies(nativeParamsFromCookies) || isWebviewByUserAgent(userAgent, appVersion);
};
