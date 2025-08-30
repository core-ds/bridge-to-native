const QUERY_CLOSE_WEBVIEW_KEY = 'closeWebView';
const QUERY_CLOSE_WEBVIEW_VALUE = 'true';

export const closeWebviewUtil = () => {
    const originalPageUrl = new URL(window.location.href);

    originalPageUrl.searchParams.set(QUERY_CLOSE_WEBVIEW_KEY, QUERY_CLOSE_WEBVIEW_VALUE);
    window.location.href = originalPageUrl.toString();
};
