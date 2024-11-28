import { NATIVE_PARAMS_COOKIE_NAME } from "./constants";
import { WebviewParams } from "./types";

export const setNativeParamsCookie = (params: WebviewParams, setCookie: (name: string, value: string) => void): void => {
    setCookie(NATIVE_PARAMS_COOKIE_NAME, encodeURIComponent(JSON.stringify(params)))
}

