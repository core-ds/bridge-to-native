import { UniversalRequest } from './types';
import { getQueryValues } from './utils';

// Словарь всех известных на данный момент сервисных query-параметров,
// которые нативное приложение подмешивает в URL.
const nativeServiceQueryKeys = [
    'applicationId',
    'client_id',
    'device_app_id',
    'device_app_version',
    'device_boot_time',
    'device_id',
    'device_locale',
    'device_model',
    'device_name',
    'device_os_version',
    'device_timezone',
    'device_uuid',
    'paySupported',
    'scope',
    'theme',
];

/**
 * Извлекает из запроса все сервисные query-параметры, которые нативное приложение подмешивает в URL.
 * И возвращает query-строку, состоящую только их них.
 *
 * @param request Объект запроса (Request или IncomingMessage).
 * @return Строка, состоящая только из найденных сервисных query-параметров в формате: "title=Title&theme=dark...".
 */
export function extractNativeServiceQueries(request: UniversalRequest) {
    const serviceQueryValues = getQueryValues(request, nativeServiceQueryKeys);
    const foundQueries = new URLSearchParams();

    serviceQueryValues.forEach((value, i) => {
        const key = nativeServiceQueryKeys[i];

        if (value) {
            foundQueries.set(key, value);
        }
    });

    return foundQueries.toString();
}
