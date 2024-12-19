import { extractAppVersion, extractUserAgent, extractNativeParams } from './utils';
import { UniversalRequest } from './types';
import { versionPattern, webviewUaIOSPattern } from './reg-exp-patterns';

// Определяет, был ли сделан запрос из вебвью окружения.
export const isWebviewEnvironment = (request: UniversalRequest) => {
    const nativeParams = extractNativeParams(request);

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
