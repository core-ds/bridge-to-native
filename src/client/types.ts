export type BrowserHistoryApiWrappers = {
    push?: (url: HistoryPushStateParams[2], state: HistoryPushStateParams[0]) => void;
    go?: (delta: number) => void;
};

export type Environment = 'android' | 'ios';

export type HistoryPushStateParams = Parameters<typeof window.history.pushState>;

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
