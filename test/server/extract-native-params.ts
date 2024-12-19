import { extractNativeParamsFromRequest } from '../../src/server/extract-native-params';
import { isWebviewEnvironment } from '../../src/server';
import { IncomingMessage } from 'http';
import { Socket } from 'net';

const UA_IPHONE =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';
const UA_WEBVIEW =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';

let mockedUa = UA_WEBVIEW;

const mockSocket = {} as Socket;

const requestParams = { ...Object.create(new IncomingMessage(mockSocket)), headers: {} };

const originalUtils = jest.requireActual('../../src/server/utils');
let mockedExtractAppVersion = originalUtils.extractAppVersion;

jest.mock('../../src/server/utils', () => ({
    extractUserAgent: jest.fn(() => mockedUa),
    extractAppVersion: jest.fn((...args) => mockedExtractAppVersion(...args)),
}));

jest.mock('../../src/server/is-webview-environment');

describe('extractNativeParams', () => {
    const mockIsWebviewEnv = isWebviewEnvironment as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockedUa = UA_WEBVIEW;
        mockedExtractAppVersion = originalUtils.extractAppVersion;
        mockIsWebviewEnv.mockReturnValue(true);
    });

    describe('non-webview', () => {
        beforeEach(() => {
            mockedUa = UA_IPHONE;
            mockIsWebviewEnv.mockReturnValue(false);
        });

        it.each([
            [
                'appVersion from query',
                { ...requestParams, query: { device_app_version: '10.10.10' } },
            ],
            [
                'iosAppId from query',
                {
                    ...requestParams,
                    query: { applicationId: 'com.aconcierge.app' },
                },
            ],
            ['dark theme from query', { ...requestParams, query: { theme: 'dark' } }],
            ['light theme from query', { ...requestParams, query: { theme: 'light' } }],
            ['theme from query', { ...requestParams, query: { title: 'Title' } }],
            ['withoutLayout from query', { ...requestParams, query: { without_layout: 'true' } }],
        ])('should not pass `%s` in non-webview environment', (_, request) => {
            expect(extractNativeParamsFromRequest(request)).toEqual(null);
        });
    });

    describe('appVersion', () => {
        const restReturnValues = {
            theme: 'light',
            title: '',
            nextPageId: null,
            originalWebviewParams: '',
        };

        it('should pass default appVersion', () => {
            const request = { ...requestParams, query: { is_webview: 'true' } };

            expect(extractNativeParamsFromRequest(request)).toEqual({
                appVersion: '0.0.0',
                ...restReturnValues,
            });
        });

        it.each(['10.11.12', '10.1.2', '10.500.25'])(
            'should pass appVersion `%s` from headers',
            (version) => {
                const request = {
                    ...requestParams,
                    headers: { 'app-version': version },
                    query: { is_webview: 'true' },
                };

                expect(extractNativeParamsFromRequest(request)).toEqual({
                    appVersion: version,
                    ...restReturnValues,
                });
            },
        );

        it.each(['10.11', '10.11.12.13', 'some-version'])(
            'should not pass wrong format `%s` of appVersion from headers',
            (version) => {
                const request = {
                    ...requestParams,
                    headers: { 'app-version': version },
                    query: { is_webview: 'true' },
                };

                expect(extractNativeParamsFromRequest(request)).toEqual({
                    appVersion: '0.0.0',
                    ...restReturnValues,
                });
            },
        );

        it.each(['10.11.12', '10.1.2', '10.500.25'])(
            'should pass appVersion `%s` from query',
            (version) => {
                const request = {
                    ...requestParams,
                    query: { device_app_version: version, is_webview: 'true' },
                };

                expect(extractNativeParamsFromRequest(request)).toEqual({
                    appVersion: version,
                    ...restReturnValues,
                    originalWebviewParams: `device_app_version=${version}`,
                });
            },
        );

        it.each(['10.11', '10.11.12.13', 'some-version'])(
            'should not pass wrong format `%s` of appVersion from query',
            (version) => {
                const request = {
                    ...requestParams,
                    query: { device_app_version: version, is_webview: 'true' },
                };

                expect(extractNativeParamsFromRequest(request)).toEqual({
                    appVersion: '0.0.0',
                    ...restReturnValues,
                    originalWebviewParams: `device_app_version=${version}`,
                });
            },
        );

        it('should pass appVersion from query while appVersion exists both in query and in headers', () => {
            const request = {
                ...requestParams,
                headers: { 'app-version': '10.11.12' },
                query: { device_app_version: '13.14.15', is_webview: 'true' },
            };

            expect(extractNativeParamsFromRequest(request)).toEqual({
                appVersion: '13.14.15',
                ...restReturnValues,
                originalWebviewParams: 'device_app_version=13.14.15',
            });
        });

        it('should pass only version from full version-string on Android', () => {
            const request = {
                ...requestParams,
                headers: { 'app-version': '10.11.12 feature' },
                query: { is_webview: 'true' },
            };

            expect(extractNativeParamsFromRequest(request)).toEqual({
                appVersion: '10.11.12',
                ...restReturnValues,
            });
        });
    });

    describe('iosAppId', () => {
        const restReturnValues = {
            appVersion: '0.0.0',
            theme: 'light',
            title: '',
            nextPageId: null,
            originalWebviewParams: '',
        };

        it('should pass trimmed ios `applicationId`', () => {
            const request = {
                ...requestParams,
                query: { applicationId: 'com.aconcierge.app', is_webview: 'true' },
            };

            expect(extractNativeParamsFromRequest(request)).toEqual({
                ...restReturnValues,
                iosAppId: 'aconcierge',
                originalWebviewParams: `applicationId=${request.query.applicationId}`,
            });
        });

        it('should ignore unknown value of `applicationId`', () => {
            const request = {
                ...requestParams,
                query: { applicationId: 'something-strange', is_webview: 'true' },
            };

            expect(extractNativeParamsFromRequest(request)).toEqual({
                ...restReturnValues,
                originalWebviewParams: `applicationId=${request.query.applicationId}${restReturnValues.originalWebviewParams}`,
            });
        });
    });

    describe('isWebview', () => {
        const restReturnValues = {
            appVersion: '0.0.0',
            theme: 'light',
            title: '',
            nextPageId: null,
            originalWebviewParams: '',
        };

        it('should pass non webview env', () => {
            mockIsWebviewEnv.mockReturnValue(false);

            expect(extractNativeParamsFromRequest({ ...requestParams, query: {} })).toEqual(null);
        });

        it('should pass webview env', () => {
            mockIsWebviewEnv.mockReturnValue(true);

            expect(extractNativeParamsFromRequest({ ...requestParams, query: {} })).toEqual({
                ...restReturnValues,
            });
        });
    });

    describe('theme', () => {
        const restReturnValues = {
            appVersion: '0.0.0',
            title: '',
            nextPageId: null,
            originalWebviewParams: '',
        };

        it.each(['dark', 'light'])('should pass theme=%s', (theme) => {
            const request = { ...requestParams, query: { is_webview: 'true', theme } };

            expect(extractNativeParamsFromRequest(request)).toEqual({
                ...restReturnValues,
                theme,
                originalWebviewParams: `theme=${theme}`,
            });
        });

        it('should pass light theme while theme in query is unknown', () => {
            const request = { ...requestParams, query: { is_webview: 'true', theme: 'diamond' } };

            expect(extractNativeParamsFromRequest(request)).toEqual({
                ...restReturnValues,
                theme: 'light',
                originalWebviewParams: 'theme=diamond',
            });
        });
    });

    describe('title', () => {
        const restReturnValues = {
            appVersion: '0.0.0',
            theme: 'light',
            nextPageId: null,
            originalWebviewParams: '',
        };

        it('should default title', () => {
            const request = { ...requestParams, query: { is_webview: 'true' } };

            expect(extractNativeParamsFromRequest(request)).toEqual({
                ...restReturnValues,
                title: '',
            });
        });

        it('should pass title', () => {
            const request = { ...requestParams, query: { title: 'Title' } };

            expect(extractNativeParamsFromRequest(request)).toEqual({
                ...restReturnValues,
                title: 'Title',
                originalWebviewParams: '',
            });
        });
    });

    describe('originalWebviewParams', () => {
        const returnValues = {
            appVersion: '12.26.0',
            theme: 'light',
            title: 'Title',
            nextPageId: null,
            iosAppId: 'aconcierge',
            originalWebviewParams:
                'device_app_version=12.26.0&device_os_version=iOS+16.1&device_boot_time=38933&device_timezone=%2B0300&applicationId=com.aconcierge.app&device_app_id=8441576F&device_locale=ru-US&device_model=x86_64&device_uuid=2E32AFD5&device_name=iPhone+14&device_id=1842D0AA&client_id=mobile-app&theme=light&scope=openid+mobile-bank',
        };
        const request = {
            ...requestParams,
            query: {
                device_app_id: '8441576F',
                device_uuid: '2E32AFD5',
                device_id: '1842D0AA',
                applicationId: 'com.aconcierge.app',
                device_os_version: 'iOS 16.1',
                device_app_version: '12.26.0',
                scope: 'openid mobile-bank',
                device_boot_time: '38933',
                device_name: 'iPhone 14',
                device_timezone: '+0300',
                client_id: 'mobile-app',
                device_locale: 'ru-US',
                device_model: 'x86_64',
                is_webview: true,
                title: 'Title',
                theme: 'light',
            },
        };

        it('should add correct originalWebviewParams', () => {
            expect(extractNativeParamsFromRequest(request)).toEqual(returnValues);
        });
    });

    describe('withoutLayout', () => {
        const restReturnValues = {
            appVersion: '0.0.0',
            theme: 'light',
            title: '',
            nextPageId: null,
            originalWebviewParams: '',
        };

        it.each(['false', 'kekus', '1'])('should not pass withoutLayout=%s', (queryValue) => {
            const request = {
                ...requestParams,
                query: { is_webview: 'true', without_layout: queryValue },
            };

            expect(extractNativeParamsFromRequest(request)).toEqual({
                ...restReturnValues,
            });
        });
    });

    describe('nextPageId', () => {
        const request = {
            ...requestParams,
            query: {
                nextPageId: 4,
                is_webview: true,
            },
        };

        const returnValues = {
            appVersion: '0.0.0',
            iosAppId: undefined,
            nextPageId: 4,
            originalWebviewParams: '',
            theme: 'light',
            title: '',
        };

        it('should return correct nextPageId', () => {
            expect(extractNativeParamsFromRequest(request)).toEqual(returnValues);
        });
    });
});
