import {NATIVE_PARAMS_COOKIE_NAME} from "./constants";

export const setNativeParamsCookie = (params: Record<string, string>, setCookie: (name: string, value: string) => void): void => {
    setCookie(NATIVE_PARAMS_COOKIE_NAME, encodeURIComponent(JSON.stringify(params)))
}

