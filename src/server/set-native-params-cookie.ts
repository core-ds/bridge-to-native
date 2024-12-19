import { NATIVE_PARAMS_COOKIE_KEY } from "./constants";
import { NativeParams } from "../shared/types";

export const setNativeParamsCookie = (params: NativeParams, setCookie: (name: string, value: string) => void): void => {
    setCookie(NATIVE_PARAMS_COOKIE_KEY, encodeURIComponent(JSON.stringify(params)))
}

