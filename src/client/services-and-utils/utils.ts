import { type LogError } from '../types';

const QUERY_CLOSE_WEBVIEW_KEY = 'closeWebView';
const QUERY_CLOSE_WEBVIEW_VALUE = 'true';

const QUERY_FROM_CURRENT_KEY = 'fromCurrent';
const QUERY_FROM_CURRENT_VALUE = 'true';

/**
 * Схемы, которые могут привести к выполнению кода или доступу к локальным файлам.
 * Остальные схемы считаем безопасными: NA использует собственные (`alfabank:`, `aweassist:`, …).
 */
const UNSAFE_PROTOCOLS = new Set([
    // eslint-disable-next-line no-script-url -- это значение блок-листа, а не URL для перехода
    'javascript:',
    'data:',
    'file:',
    'blob:',
    'vbscript:',
    'ftp:',
]);

export function appendFromCurrentQueryParamForIos(nativeUrl: string): string {
    const qIndex = nativeUrl.indexOf('?');

    if (qIndex === -1) {
        return `${nativeUrl}?${QUERY_FROM_CURRENT_KEY}=${QUERY_FROM_CURRENT_VALUE}`;
    }

    const base = nativeUrl.slice(0, qIndex);
    const query = nativeUrl.slice(qIndex + 1);
    const params = new URLSearchParams(query);

    params.set(QUERY_FROM_CURRENT_KEY, QUERY_FROM_CURRENT_VALUE);

    return `${base}?${params.toString().replace(/\+/g, '%20')}`;
}

export const closeWebviewUtil = () => {
    const originalPageUrl = new URL(window.location.href);

    originalPageUrl.searchParams.set(QUERY_CLOSE_WEBVIEW_KEY, QUERY_CLOSE_WEBVIEW_VALUE);
    window.location.href = originalPageUrl.toString();
};

export const validateUrl = (link: URL | string, logError?: LogError): URL | null => {
    let url: URL;

    try {
        url = new URL(link);
    } catch (error) {
        logError?.('validateUrl: URL parsing error', {
            error,
            link,
        });

        return null;
    }

    const isHttpProtocol = url.protocol === 'https:' || url.protocol === 'http:';
    const isUnsafeProtocol = UNSAFE_PROTOCOLS.has(url.protocol);
    const hasRequiredHostname = !isHttpProtocol || Boolean(url.hostname);
    const hasCredentials = Boolean(url.username || url.password);

    if (isUnsafeProtocol || !hasRequiredHostname || hasCredentials) {
        logError?.('validateUrl: URL validation error', {
            hostname: url.hostname,
            link,
            protocol: url.protocol,
        });

        return null;
    }

    return url;
};
