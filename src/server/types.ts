import type { NativeParamsType } from '../shared/types';
export type RequestHeaderType = Record<string, any>;

export type EmptyWebviewParams = {
    isWebview: false;
};

export type WebviewParams = NativeParamsType & {
    isWebview: true;
    withoutLayout: boolean;
};
