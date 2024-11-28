// Словарь всех известных на данный момент сервисных query параметров в webview
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
 * Данная утилита извлекает из запроса все известные
 * сервисные query параметры которые добавляются к url внутри
 * webview при первой инициализации и собирает их в query строку.
 *
 * @param query - Query в формате объекта
 * @return строка query параметров в формате: "title=Title&theme=dark..."
 * */
export const extractAndJoinOriginalWebviewParams = (
    query: Record<string, string>,
): string => {
    const params = new URLSearchParams();

    webviewInitParamsDictionary.forEach((key) => {
        const value = query[key];

        if (value) {
            params.set(key, value);
        }
    });

    return params.toString();
};
