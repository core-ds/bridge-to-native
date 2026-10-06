import {
    type GeoConfiguration,
    type LogError,
    type NativeBridgeMessage,
    type NativeBridgeResponse,
} from '../types';

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

    const isAllowedProtocol = url.protocol === 'https:' || url.protocol === 'http:';
    const hasCredentials = Boolean(url.username || url.password);

    if (!isAllowedProtocol || !url.hostname || hasCredentials) {
        logError?.('validateUrl: URL validation error', {
            hostname: url.hostname,
            link,
            protocol: url.protocol,
        });

        return null;
    }

    return url;
};

/**
 * Map для сопоставления запросов посланных в натив и ответов от него.
 * Сопоставление происходит по requestId.
 * Сейчас запрос с типом call только один - это geo.configuration.
 */
export const pendingRequests = new Map<
    string,
    {
        resolve: (data: GeoConfiguration) => void;
        reject: (error: unknown) => void;
    }
>();

/**
 * Универсальная функция для отправки сообщений в нативное приложение
 * (Сигнатуры функций натива в iOS и Android отличаются)
 */
export const sendMessage = (message: NativeBridgeMessage) => {
    const android = window.Android;

    if (message.kind === 'call' && typeof android?.call === 'function') {
        android.call(JSON.stringify(message));
    } else if (message.kind === 'send' && typeof android?.send === 'function') {
        android.send(JSON.stringify(message));
    } else if (window.webkit?.messageHandlers?.bridge?.postMessage) {
        window.webkit.messageHandlers.bridge.postMessage(message);
    } else {
        throw new Error('Native bridge is not available');
    }
};

/**
 * Находит ожидающий запрос по requestId, удаляет его из pendingRequests и завершает Promise:
 * успешно с данными или с ошибкой. Если в ответе отсутствуют и данные, и ошибка, отклоняет Promise.
 *
 * Ответы с неизвестным requestId, включая повторные ответы и ответы после тайм-аута, игнорируются.
 *
 * @param requestId Уникальный uuid исходного call-запроса, возвращённый нативом.
 * @param response Ответ натива: data содержит конфигурацию геолокации
 * либо error содержит ошибку. По контракту одно из этих полей равно null.
 */
const callback = (requestId: string, response: NativeBridgeResponse) => {
    const pending = pendingRequests.get(requestId);

    if (!pending) return;

    pendingRequests.delete(requestId);

    if (response.error) {
        pending.reject(
            Object.assign(
                new Error(response.error.message ?? 'Native bridge Geolocation error'),
                response.error,
            ),
        );
    } else if (response.data) {
        pending.resolve(response.data);
    } else {
        pending.reject(new Error('Native bridge returned no Geolocation data'));
    }
};

/**
 * Добавляет обработчик webBridge.callback который будет вызываться нативом
 */
export const installCallback = () => {
    window.webBridge = window.webBridge || {};
    window.webBridge.callback = callback;
};
