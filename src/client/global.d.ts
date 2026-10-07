import { type WebFeaturesCallbackPayload } from './types';

declare global {
    interface Window {
        Android?: {
            setPageSettings: (params: string) => void;
            call?: (body: string) => void;
            send?: (body: string) => void;
        };
        /** Канал ответов «натив → веб». Обработчик устанавливает B2N. */
        webBridge?: {
            callback?: (requestId: string, payload: WebFeaturesCallbackPayload) => void;
            emit?: (action: string, requestId?: string | null, data?: unknown) => void;
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
