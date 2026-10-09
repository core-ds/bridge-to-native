import { type CallbackPayload } from './types';

declare global {
    interface Window {
        Android?: {
            setPageSettings: (params: string) => void;
        };
        /** Канал ответов «натив → веб». Обработчик устанавливает B2N. */
        webBridge?: {
            callback?: (requestId: string, payload: CallbackPayload) => void;
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
