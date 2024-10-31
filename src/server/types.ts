export type RequestHeaderType = Record<string, any>;

export type EmptyNativeParams = {
    isWebview: false;
};

export type NativeParams = {
    appVersion: string;
    iosAppId?: string;
    isWebview: true;
    theme: 'dark' | 'light';
    title: string;
    withoutLayout: boolean;
    originalWebviewParams: string;
    nextPageId: number | null;
};
