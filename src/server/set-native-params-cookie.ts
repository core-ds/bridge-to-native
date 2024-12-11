import { NATIVE_PARAMS_COOKIE_NAME } from "./constants";
import { NativeParams } from "../shared/types";

export const setNativeParamsCookie = (params: NativeParams, setCookie: (name: string, value: string) => void): void => {
    setCookie(NATIVE_PARAMS_COOKIE_NAME, encodeURIComponent(JSON.stringify(params)))
}

