import { type WebFeaturesCallbackPayload } from './types';

declare global {
    interface Window {
        Android?: {
            setPageSettings: (params: string) => void;
            send?: (body: string) => void;
        };
        /** Транспорт «веб → натив». Определяет WA. */
        nativeBridge?: {
            send: (action: string, requestId: string, data: unknown, kind: 'call' | 'send') => void;
        };
        /** Канал ответов «натив → веб». Обработчик устанавливает B2N. */
        webBridge?: {
            callback?: (requestId: string, payload: WebFeaturesCallbackPayload) => void;
        };
        /** Нативный webkit-мост iOS. */
        webkit?: {
            messageHandlers?: {
                bridge?: {
                    postMessage: (body: unknown) => void;
                };
            };
        };
    }
}

export {};
