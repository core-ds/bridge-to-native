import { versionPattern, webviewUaIOSPattern } from './reg-exp-patterns';
import { UniversalRequest } from './types';
import { extractNativeParamsFromCookie } from './utils/extract-native-params-from-cookie';
import { extractAppVersion, extractUserAgent } from './utils/get-header-value';

/**
 * Определяет, был ли сделан запрос из вебвью окружения.
 */
export const isWebviewEnvironment = (request: UniversalRequest) => {
    const nativeParams = extractNativeParamsFromCookie(request);

    if (nativeParams) {
        return true;
    }

    // `app-version` в заголовках – индикатор вебвью. В iOS есть только в первом запросе от webview.
    const appVersion = extractAppVersion(request);
    const userAgent = extractUserAgent(request);

    return !!(
        (appVersion && versionPattern.test(appVersion)) ||
        (userAgent && webviewUaIOSPattern.test(userAgent))
    );
};
