import { UniversalRequest } from './types';

const webviewInitParamsDictionary = [
    'device_app_version',
    'device_os_version',
    'device_boot_time',
    'device_timezone',
    'applicationId',
    'device_app_id',
    'device_locale',
    'paySupported',
    'device_model',
    'device_uuid',
    'device_name',
    'device_id',
    'client_id',
    'theme',
    'scope',
];

/**
 * Данная утилита извлекает из запроса все известные сервисные query-параметры,
 * которые нативное приложение добавляет к URL веб-приложения, запускаемого в webview.
 * Возвращает строку, очищенную от прочих query-параметров.
 * */
export const extractAndJoinOriginalWebviewParams = (request: UniversalRequest): string => {
    const allQueryParams = request.url ? new URL(request.url).searchParams : new URLSearchParams();

    const filteredParams = new URLSearchParams();

    webviewInitParamsDictionary.forEach((key) => {
        const value = allQueryParams.get(key);

        if (value) {
            filteredParams.set(key, value);
        }
    });

    return filteredParams.toString();
};
