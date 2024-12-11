import type { NativeParams } from '../shared/types';
import {extractNativeParams} from "./extract-native-params";
import {setNativeParamsCookie} from "./set-native-params-cookie";
import { RequestHeaderType } from "./types";

export const handleNativeParams = (
    request: RequestHeaderType,
    setCookie: (cookieKey: string, cookieValue: string) => void
): NativeParams | null => {
    const nativeParams = extractNativeParams(request);

    if(nativeParams && setCookie) {
        setNativeParamsCookie(nativeParams, setCookie)
    }

    return nativeParams;
}
