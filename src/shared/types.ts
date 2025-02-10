export type NativeParams = {
    appVersion: string;
    // В ранних версиях iOS приложение не пробрасывет схему приложения в URL в прод окружении.
    // Для таких версий есть мэппинг `/src/client/constants.ts` → `versionToIosAppId`.
    iosAppId?: string;
    nextPageId: number | null;
    originalWebviewParams: string;
    theme: string;
    title?: string;
};
