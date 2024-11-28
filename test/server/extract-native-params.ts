import { extractNativeParams } from '../../src/server/extract-native-params';
import {isWebviewEnvironment} from "../../src/server";

const UA_IPHONE =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';
const UA_WEBVIEW =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';

let mockedUa = UA_WEBVIEW;


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
            ['appVersion from query', { headers: {}, query: { device_app_version: '10.10.10' } }],
            [
                'iosAppId from query',
                {
                    headers: {},
                    query: { applicationId: 'com.aconcierge.app' },
                },
            ],
            ['dark theme from query', { headers: {}, query: { theme: 'dark' } }],
            ['light theme from query', { headers: {}, query: { theme: 'light' } }],
            ['theme from query', { headers: {}, query: { title: 'Title' } }],
            ['withoutLayout from query', { headers: {}, query: { without_layout: 'true' } }],
        ])('should not pass `%s` in non-webview environment', (_, request) => {
            expect(extractNativeParams(request)).toEqual(null);
        });
    });

    describe('appVersion', () => {
        const restReturnValues = {
            isWebview: true,
            theme: 'light',
            title: '',
            withoutLayout: false,
            nextPageId: null,
            originalWebviewParams: '',
        };

        it('should pass default appVersion', () => {
            const request = { headers: {}, query: { is_webview: 'true' } };

            expect(extractNativeParams(request)).toEqual({
                appVersion: '0.0.0',
                ...restReturnValues,
            });
        });

        it.each(['10.11.12', '10.1.2', '10.500.25'])(
            'should pass appVersion `%s` from headers',
            (version) => {
                const request = {
                    headers: { 'app-version': version },
                    query: { is_webview: 'true' },
                };

                expect(extractNativeParams(request)).toEqual({
                    appVersion: version,
                    ...restReturnValues,
                });
            },
        );

        it.each(['10.11', '10.11.12.13', 'some-version'])(
            'should not pass wrong format `%s` of appVersion from headers',
            (version) => {
                const request = {
                    headers: { 'app-version': version },
                    query: { is_webview: 'true' },
                };

                expect(extractNativeParams(request)).toEqual({
                    appVersion: '0.0.0',
                    ...restReturnValues,
                });
            },
        );

        it.each(['10.11.12', '10.1.2', '10.500.25'])(
            'should pass appVersion `%s` from query',
            (version) => {
                const request = {
                    headers: {},
                    query: { device_app_version: version, is_webview: 'true' },
                };

                expect(extractNativeParams(request)).toEqual({
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
                    headers: {},
                    query: { device_app_version: version, is_webview: 'true' },
                };

                expect(extractNativeParams(request)).toEqual({
                    appVersion: '0.0.0',
                    ...restReturnValues,
                    originalWebviewParams: `device_app_version=${version}`,
                });
            },
        );

        it('should pass appVersion from query while appVersion exists both in query and in headers', () => {
            const request = {
                headers: { 'app-version': '10.11.12' },
                query: { device_app_version: '13.14.15', is_webview: 'true' },
            };

            expect(extractNativeParams(request)).toEqual({
                appVersion: '13.14.15',
                ...restReturnValues,
                originalWebviewParams: 'device_app_version=13.14.15',
            });
        });

        it('should pass only version from full version-string on Android', () => {
            const request = {
                headers: { 'app-version': '10.11.12 feature' },
                query: { is_webview: 'true' },
            };

            expect(extractNativeParams(request)).toEqual({
                appVersion: '10.11.12',
                ...restReturnValues,
            });
        });
    });

    describe('iosAppId', () => {
        const restReturnValues = {
            appVersion: '0.0.0',
            isWebview: true,
            theme: 'light',
            title: '',
            withoutLayout: false,
            nextPageId: null,
            originalWebviewParams: '',
        };

        it('should pass trimmed ios `applicationId`', () => {
            const request = {
                headers: {},
                query: { applicationId: 'com.aconcierge.app', is_webview: 'true' },
            };

            expect(extractNativeParams(request)).toEqual({
                ...restReturnValues,
                iosAppId: 'aconcierge',
                originalWebviewParams: `applicationId=${request.query.applicationId}`,
            });
        });

        it('should ignore unknown value of `applicationId`', () => {
            const request = {
                headers: {},
                query: { applicationId: 'something-strange', is_webview: 'true' },
            };

            expect(extractNativeParams(request)).toEqual({
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
            withoutLayout: false,
            nextPageId: null,
            originalWebviewParams: '',
        };

        it('should pass non webview env', () => {
            mockIsWebviewEnv.mockReturnValue(false);

            expect(extractNativeParams({ headers: {}, query: {} })).toEqual(null);
        });

            it('should pass webview env', () => {
                mockIsWebviewEnv.mockReturnValue(true);

                expect(extractNativeParams({headers: {}, query: {}})).toEqual({
                    ...restReturnValues,
                    isWebview: true,
                });
            });
        });

        describe('theme', () => {
            const restReturnValues = {
                appVersion: '0.0.0',
                isWebview: true,
                title: '',
                withoutLayout: false,
                nextPageId: null,
                originalWebviewParams: '',
            };

            it.each(['dark', 'light'])('should pass theme=%s', (theme) => {
                const request = {headers: {}, query: {is_webview: 'true', theme}};

                expect(extractNativeParams(request)).toEqual({
                    ...restReturnValues,
                    theme,
                    originalWebviewParams: `theme=${theme}`,
                });
            });

            it('should pass light theme while theme in query is unknown', () => {
                const request = {headers: {}, query: {is_webview: 'true', theme: 'diamond'}};

                expect(extractNativeParams(request)).toEqual({
                    ...restReturnValues,
                    theme: 'light',
                    originalWebviewParams: 'theme=diamond',
                });
            });
        });

        describe('title', () => {
            const restReturnValues = {
                appVersion: '0.0.0',
                isWebview: true,
                theme: 'light',
                withoutLayout: false,
                nextPageId: null,
                originalWebviewParams: '',
            };

            it('should default title', () => {
                const request = {headers: {}, query: {is_webview: 'true'}};

                expect(extractNativeParams(request)).toEqual({
                    ...restReturnValues,
                    title: '',
                });
            });

            it('should pass title', () => {
                const request = {headers: {}, query: {is_webview: 'true', title: 'Title'}};

                expect(extractNativeParams(request)).toEqual({
                    ...restReturnValues,
                    title: 'Title',
                    originalWebviewParams: '',
                });
            });
        });

        describe('originalWebviewParams', () => {
            const returnValues = {
                appVersion: '12.26.0',
                isWebview: true,
                theme: 'light',
                title: 'Title',
                withoutLayout: false,
                nextPageId: null,
                iosAppId: 'aconcierge',
                originalWebviewParams:
                    'device_app_version=12.26.0&device_os_version=iOS+16.1&device_boot_time=38933&device_timezone=%2B0300&applicationId=com.aconcierge.app&device_app_id=8441576F&device_locale=ru-US&device_model=x86_64&device_uuid=2E32AFD5&device_name=iPhone+14&device_id=1842D0AA&client_id=mobile-app&theme=light&scope=openid+mobile-bank',
            };
            const request = {
                headers: {},
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
                expect(extractNativeParams(request)).toEqual(returnValues);
            });
        });

        describe('withoutLayout', () => {
            const restReturnValues = {
                appVersion: '0.0.0',
                isWebview: true,
                theme: 'light',
                title: '',
                nextPageId: null,
                originalWebviewParams: '',
            };

            it('should pass withoutLayout=true', () => {
                const request = {headers: {}, query: {is_webview: 'true', without_layout: 'true'}};

                expect(extractNativeParams(request)).toEqual({
                    ...restReturnValues,
                    withoutLayout: true,
                });
            });

            it.each(['false', 'kekus', '1'])('should not pass withoutLayout=%s', (queryValue) => {
                const request = {
                    headers: {},
                    query: {is_webview: 'true', without_layout: queryValue},
                };

                expect(extractNativeParams(request)).toEqual({
                    ...restReturnValues,
                    withoutLayout: false,
                });
            });
        });

        describe('nextPageId', () => {
            const request = {
                headers: {},
                query: {
                    nextPageId: 4,
                    is_webview: true,
                },
            };

            const returnValues = {
                appVersion: '0.0.0',
                iosAppId: undefined,
                isWebview: true,
                nextPageId: 4,
                originalWebviewParams: '',
                theme: 'light',
                title: '',
                withoutLayout: false,
            };

            it('should return correct nextPageId', () => {
                expect(extractNativeParams(request)).toEqual(returnValues);
            });
        });
});
