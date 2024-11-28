import type { NativeParamsType } from '../shared/types';
export type RequestHeaderType = Record<string, any>;

export type EmptyNativeParams = {
    isWebview: false;
};

export type NativeParams = NativeParamsType & {
    isWebview: true;
    withoutLayout: boolean;
};
