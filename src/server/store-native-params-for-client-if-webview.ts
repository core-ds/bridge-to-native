import { NATIVE_PARAMS_COOKIE_KEY } from './constants';
import { extractNativeParamsFromRequest } from './extract-native-params';
import { isWebviewEnvironment } from './is-webview-environment';
import { UniversalRequest } from './types';

/**
 * В вебвью окружении парсит запрос, вытаскивает оттуда детали о нативном приложении,
 * сохраняет их в куке, чтобы можно было использовать в браузере.
 *  
 * @returns true – если вебвью-окружени и параметры были сохранены, false – если нет.
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
