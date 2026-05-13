const QUERY_CLOSE_WEBVIEW_KEY = 'closeWebView';
const QUERY_CLOSE_WEBVIEW_VALUE = 'true';

const QUERY_FROM_CURRENT_KEY = 'fromCurrent';
const QUERY_FROM_CURRENT_VALUE = 'true';

export function appendFromCurrentQueryParamForIos(nativeUrl: string): string {
    const qIndex = nativeUrl.indexOf('?');

    if (qIndex === -1) {
        return `${nativeUrl}?${QUERY_FROM_CURRENT_KEY}=${QUERY_FROM_CURRENT_VALUE}`;
    }

    const base = nativeUrl.slice(0, qIndex);
    const query = nativeUrl.slice(qIndex + 1);
    const params = new URLSearchParams(query);

    params.set(QUERY_FROM_CURRENT_KEY, QUERY_FROM_CURRENT_VALUE);

    return `${base}?${params.toString()}`;
}

export const closeWebviewUtil = () => {
    const originalPageUrl = new URL(window.location.href);

    originalPageUrl.searchParams.set(QUERY_CLOSE_WEBVIEW_KEY, QUERY_CLOSE_WEBVIEW_VALUE);
    window.location.href = originalPageUrl.toString();
};
