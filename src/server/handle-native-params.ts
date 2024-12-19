import type { NativeParams } from '../shared/types';
import {extractNativeParams} from "./extract-native-params";
import {setNativeParamsCookie} from "./set-native-params-cookie";
import { UniversalRequest } from "./types";

export const handleNativeParams = (
    request: UniversalRequest,
    setCookie: (cookieKey: string, cookieValue: string) => void
): NativeParams | null => {
    const nativeParams = extractNativeParams(request);

    if(nativeParams && setCookie) {
        setNativeParamsCookie(nativeParams, setCookie)
    }

    return nativeParams;
}
