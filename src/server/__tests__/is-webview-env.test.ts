/* @jest-environment node */

import { IncomingMessage } from 'http';
import { isWebviewEnv } from '../is-webview-env';

describe('isWebviewEnv', () => {
    it('should return true when special cookie is present', () => {
        const mockRequest = {
            headers: {
                cookie: 'first-cookie=foo; second-cookie=baк; bridgeToNativeData=data-data-data; third-cookie=baz',
            },
        } as IncomingMessage;

        const result = isWebviewEnv(mockRequest);

        expect(result).toBe(true);
    });

    it('should return true when app-version header is present and matches version pattern', () => {
        const mockRequest = {
            headers: new Headers({
                'app-version': '10.10.10',
            }),
        } as Request;

        const result = isWebviewEnv(mockRequest);

        expect(result).toBe(true);
    });

    it('should return true when user-agent header matches iOS webview pattern', () => {
        const mockRequest = {
            headers: new Headers({
                'user-agent':
                    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
            }),
        } as Request;

        const result = isWebviewEnv(mockRequest);

        expect(result).toBe(true);
    });

    it('should return false when special cookie is missing', () => {
        const mockRequest = {
            headers: {
                cookie: 'first-cookie=foo; second-cookie=baк; third-cookie=baz',
            },
        } as IncomingMessage;

        const result = isWebviewEnv(mockRequest);

        expect(result).toBe(false);
    });

    it('should return false when app-version is present but does not match version pattern', () => {
        const mockRequest = {
            headers: new Headers({
                'app-version': '10.foo.10',
            }),
        } as Request;

        const result = isWebviewEnv(mockRequest);

        expect(result).toBe(false);
    });

    it('should return false when user-agent is present but does not match iOS pattern', () => {
        const mockRequest = {
            headers: new Headers({
                'user-agent':
                    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.2 Mobile/15E148 Safari/604.1',
            }),
        } as Request;

        const result = isWebviewEnv(mockRequest);

        expect(result).toBe(false);
    });

    it('should return false when all special headers are missing', () => {
        const mockRequest = { headers: {} } as Request;

        const result = isWebviewEnv(mockRequest);

        expect(result).toBe(false);
    });
});
