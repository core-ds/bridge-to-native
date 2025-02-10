import { UniversalRequest } from '../types';

/**
 * Возвращает значение query-параметра по ключу.
 */
export function getQueryParamValue(request: UniversalRequest, queryKey: string) {
    if (!request.url) {
        return null;
    }

    return new URL(request.url).searchParams.get(queryKey);
}
