export type NativeParams = {
    appVersion: string;
    title?: string;
    // В ранних версиях iOS приложение не пробрасывет схему приложения в URL в прод окружении.
    // Для таких версий есть мэппинг `./constants` → `versionToIosAppId`.
    iosAppId?: string;
    theme: string;
    nextPageId: number | null;
    originalWebviewParams: string;
    webviewLaunchTime?: number;
};




// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Test = 'Test';
