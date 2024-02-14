import {Environment} from './types';
import {ANDROID_APP_ID, START_VERSION_ANDROID_AM_ALLOW_OPEN_NEW_WEBVIEW} from './constants';

/**
 * Разделяет веб ссылку на компоненты
 * @param route внутренний путь для навигации
 * @return объект с appName, route, query
 */
export const extractAppNameRouteAndQuery = (route: string) => {
    let appName = '';
    let path = '';
    let query: Record<string, string> | undefined;

    const clearedPath = route.replace(/(?:^\/)|(?:\/$)/g, '');
    const segments = clearedPath.split('/');

    const queryByPath = clearedPath.split('?')[1];

    appName = segments.shift()?.split('?')[0] || '';

    if (queryByPath) {
        query = Array.from(new URLSearchParams(queryByPath).entries()).reduce(
            (acc, [key, value]) => ({ ...acc, [key]: value }),
            {},
        );
    }

    path = segments.join('/').replace(`?${queryByPath}`, '');

    return { appName, path, query };
};

/**
 * Возвращает экземпляр `URL` из ссылки, докидывая `https://` при отсутствии.
 */
export const getUrlInstance = (link: string) => {
    const protocolRequiredPattern = /^https?:\/\//;
    let url;

    if (protocolRequiredPattern.test(link)) {
        url = new URL(link);
    } else {
        try {
            // Пробуем докинуть `https://`, как правило, это помогает.
            url = new URL(`https://${link}`);
        } catch (e) {
            // Кажется, добавив протокол, сюда мы больше не сможем вывалиться, но на всякий случай...
            url = new URL('about:blank');
        }
    }

    return url;
};

/**
 * Проверяет, что переданная строка содержит версию приложения в правильном формате.
 *
 * @param version Строка с версией для проверки.
 * @returns Правильный формат или нет.
 */
export const isValidVersionFormat = (version?: string) => {
    if (!version) return false;
    const versionPattern = /^\d+\.\d+\.\d+$/;

    return versionPattern.test(version);
};

/**
 *  Сравнивает version1 больше меньше или равно version2.
 *
 * @param version1 Строка с версией для проверки.
 * @param version2 Строка с версией для проверки.
 * @returns version1 больше (1) меньше(-1) или равно(0) version2.
 */
export const compareVersions = (version1: string, version2: string) => {
    const v1 = version1.split('.').map(Number);
    const v2 = version2.split('.').map(Number);

    const maxLength = Math.max(v1.length, v2.length);

    for (let i = 0; i < maxLength; i++) {
        const num1 = i < v1.length ? v1[i] : 0;
        const num2 = i < v2.length ? v2[i] : 0;

        if (num1 < num2) {
            return -1;
        }
        if (num1 > num2) {
            return 1;
        }
    }

    return 0;
};

export const checkAndroidAllowOpenInNewWebview = (
    environment: Environment,
    appVersion?: string,
) => {
    if (appVersion) {
        const comparisonResult = compareVersions(
            appVersion,
            START_VERSION_ANDROID_AM_ALLOW_OPEN_NEW_WEBVIEW,
        );

        return (
            environment === 'android' &&
            appVersion &&
            (comparisonResult === 0 || comparisonResult === 1)
        );
    }

    return false;
};

export const getAppId = (environment: Environment, iosAppId?: string) => {
    if (environment === 'android') {
        return ANDROID_APP_ID;
    }

    if (environment === 'ios' && iosAppId && typeof iosAppId === 'string') {
        return iosAppId;
    }

    return null;
};
