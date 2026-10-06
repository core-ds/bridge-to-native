import { type NativeBridgeMessage, type NativeBridgeResponse } from './types';

declare global {
    interface Window {
        webkit?: {
            messageHandlers?: {
                bridge?: { postMessage: (message: NativeBridgeMessage) => void };
            };
        };
        webBridge?: {
            callback?: (requestId: string, response: NativeBridgeResponse) => void;
            emit?: (action: string, requestId?: string | null, data?: unknown) => void;
        };
        Android?: {
            call?: (message: string) => void;
            send?: (message: string) => void;
            setPageSettings: (params: string) => void;
        };
    }
}

export {};
