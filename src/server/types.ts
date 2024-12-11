import {IncomingHttpHeaders, IncomingMessage} from 'http';

export type RequestHeaderType = IncomingMessage & {
    headers: IncomingHttpHeaders & {
        'app-version'?: string,
        'user-agent': string,
    },
    params?: Record<string, string>;
    query?: Record<string, string | string[]>;
    body?: unknown;
    url?: string;
};
