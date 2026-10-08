import { type LogError, type ModernAction, type WebFeaturesCallbackPayload } from '../types';

export const CALL_TIMEOUT_MS = 10_000;

type BridgeKind = 'call' | 'send';

const BRIDGE_KIND_SEND: BridgeKind = 'send';
const BRIDGE_KIND_CALL: BridgeKind = 'call';

type BridgeMessageBody = {
    kind: BridgeKind;
    action: ModernAction;
    requestId: string;
    data: unknown;
};

type PendingCall = {
    resolve: (data: unknown) => void;
    reject: (error: Error) => void;
    timeoutId: ReturnType<typeof setTimeout>;
};

let requestIdCounter = 0;

const generateRequestId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    requestIdCounter += 1;

    return String(requestIdCounter);
};

/**
 * Сервис-транспорт для взаимодействия WA с NA через WebFeatures-мост.
 */
export class NativeBridgeService {
    private pendingCalls = new Map<string, PendingCall>();

    private savedCallback?: (requestId: string, payload: WebFeaturesCallbackPayload) => void;

    constructor(private logError?: LogError) {
        this.handleCallback = this.handleCallback.bind(this);

        this.savedCallback = window.webBridge?.callback;

        window.webBridge = {
            ...window.webBridge,
            callback: this.handleCallback,
        };
    }

    /**
     * Отправляет fire-and-forget сообщение в NA (без ожидания ответа).
     */
    send(action: ModernAction, data: unknown) {
        const body: BridgeMessageBody = {
            kind: BRIDGE_KIND_SEND,
            action,
            requestId: generateRequestId(),
            data,
        };

        if (!this.dispatch(body)) {
            this.reportNoTransport('send', action);
        }
    }

    /**
     * Отправляет сообщение типа `call` и возвращает промис с ответом NA.
     *
     * @throws Если транспорт недоступен или ответ не пришёл за {@link CALL_TIMEOUT_MS}.
     */
    call<Data>(action: ModernAction, data: unknown): Promise<Data> {
        const requestId = generateRequestId();
        const body: BridgeMessageBody = {
            kind: BRIDGE_KIND_CALL,
            action,
            requestId,
            data,
        };

        if (!this.hasTransport()) {
            this.reportNoTransport('call', action);

            return Promise.reject(
                new Error(`NativeBridgeService: transport is not available for "${action}"`),
            );
        }

        return new Promise<Data>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.pendingCalls.delete(requestId);
                reject(new Error(`NativeBridgeService: request "${action}" timed out`));
            }, CALL_TIMEOUT_MS);

            this.pendingCalls.set(requestId, {
                resolve: resolve as (data: unknown) => void,
                reject,
                timeoutId,
            });

            this.dispatch(body);
        });
    }

    private handleCallback(requestId: string, payload: WebFeaturesCallbackPayload) {
        const pending = this.pendingCalls.get(requestId);

        if (!pending) {
            this.savedCallback?.(requestId, payload);

            return;
        }

        clearTimeout(pending.timeoutId);
        this.pendingCalls.delete(requestId);

        if (payload.error) {
            const error = new Error(payload.error.message) as Error & { code?: number };

            error.code = payload.error.code;
            pending.reject(error);

            return;
        }

        pending.resolve(payload.data);
    }

    /**
     * Проверяет доступность нативного webkit-моста iOS.
     */
    // eslint-disable-next-line class-methods-use-this -- единая точка доступа к глобалам window.
    private hasTransport() {
        return Boolean(window.webkit?.messageHandlers?.bridge?.postMessage);
    }

    /**
     * Отправляет тело сообщения доступным транспортом.
     *
     * @returns `true`, если сообщение удалось передать.
     */
    // eslint-disable-next-line class-methods-use-this -- единая точка доступа к глобалам window.
    private dispatch(body: BridgeMessageBody) {
        if (window.webkit?.messageHandlers?.bridge?.postMessage) {
            window.webkit.messageHandlers.bridge.postMessage(body);

            return true;
        }

        return false;
    }

    private reportNoTransport(kind: BridgeKind, action: ModernAction) {
        const message = `NativeBridgeService: native bridge is not available, "${action}" (${kind}) was not sent`;

        this.logError?.(message, { action, kind });
        // eslint-disable-next-line no-console -- сообщаем потребителю о недоступности моста.
        console.error(message);
    }
}
