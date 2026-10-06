export type BrowserHistoryApiWrappers = {
    push?: (url: HistoryPushStateParams[2], state: HistoryPushStateParams[0]) => void;
    go?: (delta: number) => void;
    replace?: (url: HistoryReplaceStateParams[2], state: HistoryReplaceStateParams[0]) => void;
};

export type Environment = 'android' | 'ios';

export type NativeAppTarget = {
    platform: Environment;
    appId: string;
};

export type HistoryPushStateParams = Parameters<typeof window.history.pushState>;
export type HistoryReplaceStateParams = Parameters<typeof window.history.replaceState>;

export type LocationAssignParam = Parameters<typeof window.location.assign>[0];

export type LogError = (b2nErrorMessage: string, originalError: unknown) => void;

export type NativeFeatureKey =
    // Возможность работы с геолокацией.
    | 'geolocation'
    // Возможность открыть ссылку в браузере.
    | 'linksInBrowser'
    // Возможность возврата к предыдущему webview для Android
    | 'savedBackStack';

type NativeFeaturesParams = Readonly<Record<NativeFeatureKey, { fromVersion: string }>>;
export type NativeFeaturesFromVersion = Readonly<{
    android: NativeFeaturesParams;
    ios: NativeFeaturesParams;
}>;

export type PdfType = 'pdfFile' | 'base64' | 'binary';

export type Theme = 'light' | 'dark';

export type NativeBridgeMessage = {
    kind: 'call' | 'send';
    action: string;
    requestId: string;
    data: object | null;
};

export type NativeBridgeResponse = {
    data: GeoConfiguration | null;
    error: { code: number; message?: string; details?: unknown } | null;
};

export type HapticsOptions = {
    type:
        | 'light'
        | 'medium'
        | 'heavy'
        | 'soft'
        | 'rigid'
        | 'success'
        | 'warning'
        | 'error'
        | 'selection';
    intensity?: number;
};

export type GeoConfiguration = {
    /**
     * allowed — доступ разрешён;
     * denied — доступ запрещён;
     * notDetermined — пользователь ещё не принял решение;
     * restricted — доступ ограничен
     */
    permission: 'allowed' | 'denied' | 'notDetermined' | 'restricted';
    userCoordinate: { latitude: number; longitude: number } | null;
};

export type SheetDragArea = 'wholeSheet' | 'navigationBar';
