import type { NativeParamsType } from '../shared/types';
export type RequestHeaderType = Record<string, any>;

export type EmptyWebViewParams = {
    isWebview: false;
};

export type WebViewParams = NativeParamsType & {
    isWebview: true;
    withoutLayout: boolean;
};
