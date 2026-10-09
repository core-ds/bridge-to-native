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

export type ModernAction =
    | 'geo.configuration'
    | 'haptics.vibrate'
    | 'sheet.setDragArea'
    | 'tabbar.hide'
    | 'tabbar.show';

export type GeoPermission = 'allowed' | 'denied' | 'notDetermined' | 'restricted';

export type UserCoordinate = {
    latitude: number;
    longitude: number;
};

export type GeoConfiguration = {
    permission: GeoPermission;
    userCoordinate: UserCoordinate | null;
};

export type HapticsType =
    | 'light'
    | 'medium'
    | 'heavy'
    | 'soft'
    | 'rigid'
    | 'success'
    | 'warning'
    | 'error'
    | 'selection';

export type HapticsOptions = {
    type: HapticsType;
    intensity?: number;
};

export type SheetDragArea = 'wholeSheet' | 'navigationBar';

export type CallbackPayload = {
    data: unknown;
    error: { code: number; message: string } | null;
};
