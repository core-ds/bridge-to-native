export type NativeParams = {
    appVersion: string;
    title?: string;
    // Схема iOS из query `applicationId`. Если отсутствует — точный ключ
    // в `VERSION_TO_IOS_APP_ID`, иначе `FALLBACK_IOS_APP_ID`.
    iosAppId?: string;
    // Активная тема NA из query `theme`. Если параметра нет в текущем запросе —
    // серверная часть берёт ранее сохранённое значение из cookie `bridgeToNativeData`.
    theme: string;
    nextPageId: number | null;
    originalWebviewParams: string;
    webviewLaunchTime?: number;
};
