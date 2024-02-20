export type NativeParams = {
    appVersion: string;
    title?: string;
    // В ранних версиях iOS приложение не пробрасывет схему приложения в URL в прод окружении.
    // Для таких версий есть мэппинг `./constants` → `versionToIosAppId`.
    iosAppId?: string;
    theme: string;
    nextPageId: number | null;
    originalWebviewParams: string;
};

export type NativeFeatureKey =
    // Возможность работы с геолокацией.
    | 'geolocation'
    // Возможность открыть ссылку в браузере.
    | 'linksInBrowser';

type NativeFeaturesParams = Readonly<Record<NativeFeatureKey, { fromVersion: string }>>;
export type NativeFeaturesFromVersion = Readonly<{
    android: NativeFeaturesParams;
    ios: NativeFeaturesParams;
}>;

export type Environment = 'android' | 'ios';

export type WebViewWindow = Window & {
    Android?: {
        setPageSettings: (params: string) => void;
    };
    handleRedirect?: (
        appName: string,
        path?: string,
        params?: Record<string, string>,
    ) => VoidFunction;
};

export type PdfType = 'pdfFile' | 'base64' | 'binary';

export type PreviousBridgeToNativeState = Omit<NativeParams, 'title' | 'theme'> & {
    theme: 'dark' | 'light';
};

export type PreviousNativeNavigationAndTitleState = {
    nativeHistoryStack: string[];
    title: string;
};

export type SyncPurpose = 'initialization' | 'navigation' | 'title-replacing';

export type HandleRedirect = (
    appName: string,
    path?: string,
    params?: Record<string, string>,
) => void;

export type Theme = 'light' | 'dark';
