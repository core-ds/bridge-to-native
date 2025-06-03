/**
 * Разделяет веб ссылку на компоненты
 * @param route внутренний путь для навигации
 * @return объект с appName, route, query
 */
export const extractAppNameRouteAndQuery = (route: string) => {
    let appName = '';
    let path = '';
    let query: Record<string, string> | undefined;

    const clearedPath = route.replace(/(?:^\/)|(?:\/$)/g, '');
    const segments = clearedPath.split('/');

    const queryByPath = clearedPath.split('?')[1];

    appName = segments.shift()?.split('?')[0] || '';

    if (queryByPath) {
        query = Array.from(new URLSearchParams(queryByPath).entries()).reduce(
            (acc, [key, value]) => ({ ...acc, [key]: value }),
            {},
        );
    }

    path = segments.join('/').replace(`?${queryByPath}`, '');

    return { appName, path, query };
};

/**
 * Возвращает экземпляр `URL` из ссылки, докидывая `https://` при отсутствии.
 */
export const getUrlInstance = (link: string) => {
    const protocolRequiredPattern = /^https?:\/\//;
    let url;

    if (protocolRequiredPattern.test(link)) {
        url = new URL(link);
    } else {
        try {
            // Пробуем докинуть `https://`, как правило, это помогает.
            url = new URL(`https://${link}`);
        } catch (e) {
            // Кажется, добавив протокол, сюда мы больше не сможем вывалиться, но на всякий случай...
            url = new URL('about:blank');
        }
    }

    return url;
};

/**
 * Проверяет, что переданная строка содержит версию приложения в правильном формате.
 *
 * @param version Строка с версией для проверки.
 * @returns Правильный формат или нет.
 */
export const isValidVersionFormat = (version?: string) => {
    if (!version) return false;
    const versionPattern = /^\d+\.\d+\.\d+$/;

    return versionPattern.test(version);
};
