import { NATIVE_PARAMS_COOKIE_KEY } from './constants';
import { isWebviewEnvironment } from './is-webview-environment';
import { UniversalRequest } from './types';
import { extractNativeParamsFromRequest } from './utils/extract-native-params-from-request';

/**
 * В вебвью окружении парсит запрос, вытаскивает оттуда детали о нативном приложении,
 * сохраняет их в куке, чтобы можно было использовать в браузере.
 *  
 * @param request См. подробное описание здесь → src/server/types.ts
 * @param setCookie Фукнция, вызов которой должен привести к установке заголовка `SetCookie`
 *  * Важно, флаг `HttpOnly` не должен быть установлен, т.к. кука будет читаться клиентским JS
 *  * Max-Age можно поставить побольше.
 * @returns true – если вебвью-окружение и детали о нативном приложении были сохранены в cookie, false – если нет.
 */
export const storeNativeParamsForClientIfWebview = (
    request: UniversalRequest,
    setCookie: (cookieKey: string, cookieValue: string) => void,
) => {
    if (!isWebviewEnvironment(request)) {
        return false;
    }

    const nativeParams = extractNativeParamsFromRequest(request);

    if (nativeParams) {
        setCookie(NATIVE_PARAMS_COOKIE_KEY, nativeParams);
        return true;
    }

    return false;
};
