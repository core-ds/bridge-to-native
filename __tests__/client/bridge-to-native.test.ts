import { BridgeToNative } from '../../src/client';

const mockedExternalLinksServiceInstance = {
    getHrefToOpenInBrowser: jest.fn(),
    handleNativeDeeplink: jest.fn(),
    openInBrowser: jest.fn(),
    openInNewWebview: jest.fn(),
    openPdf: jest.fn(),
};

const MockedExternalLinksServiceConstructor = jest.fn(() => mockedExternalLinksServiceInstance);

const mockedNativeNavigationAndTitleServiceInstance = {
    closeWebview: jest.fn(),
    goBack: jest.fn(),
    goBackAFewStepsClientSide: jest.fn(),
    navigateClientSide: jest.fn(),
    navigateServerSide: jest.fn(),
    setTitle: jest.fn(),
};

const MockedNativeNavigationAndTitleServiceConstructor = jest.fn(
    () => mockedNativeNavigationAndTitleServiceInstance,
);

const mockedNativeParamsServiceInstance = {
    appId: 'alfabank',
    appVersion: '1.0.0',
    environment: 'android',
    nativeParamsReadErrorFlag: false,
    originalWebviewParams: 'theme=dark',
    theme: 'light',
    canUseNativeFeature: jest.fn(),
    isCurrentVersionHigherOrEqual: jest.fn(),
};

const MockedNativeParamsServiceConstructor = jest.fn(() => mockedNativeParamsServiceInstance);

jest.mock('../../src/client/services-and-utils/external-links-service', () => ({
    __esModule: true,
    get ExternalLinksService() {
        return MockedExternalLinksServiceConstructor;
    },
}));

jest.mock('../../src/client/services-and-utils/native-navigation-and-title-service', () => ({
    __esModule: true,
    get NativeNavigationAndTitleService() {
        return MockedNativeNavigationAndTitleServiceConstructor;
    },
}));

jest.mock('../../src/client/services-and-utils/native-params-service', () => ({
    __esModule: true,
    get NativeParamsService() {
        return MockedNativeParamsServiceConstructor;
    },
}));

describe('BridgeToNative', () => {
    let bridge: BridgeToNative;

    beforeEach(() => {
        jest.clearAllMocks();
        bridge = new BridgeToNative();
    });

    describe('Initialization', () => {
        it('should pass logError to NativeParamsService', () => {
            const logError = jest.fn();

            // eslint-disable-next-line no-new
            new BridgeToNative({ logError });

            expect(MockedNativeParamsServiceConstructor).toHaveBeenCalledWith(logError);
        });

        it('should pass nativeParamsService to ExternalLinksService', () => {
            expect(MockedExternalLinksServiceConstructor).toHaveBeenCalledWith(
                mockedNativeParamsServiceInstance,
            );
        });

        it('should pass nativeParamsService to NativeNavigationAndTitleService', () => {
            expect(MockedNativeNavigationAndTitleServiceConstructor).toHaveBeenCalledWith(
                mockedNativeParamsServiceInstance,
                undefined,
                undefined,
            );
        });

        it('should pass browserHistoryApiWrappers to NativeNavigationAndTitleService', () => {
            const browserHistoryApiWrappers = {};

            // eslint-disable-next-line no-new
            new BridgeToNative({ browserHistoryApiWrappers });

            expect(MockedNativeNavigationAndTitleServiceConstructor).toHaveBeenCalledWith(
                expect.anything(),
                browserHistoryApiWrappers,
                undefined,
            );
        });

        it('should pass logError to NativeNavigationAndTitleService', () => {
            const logError = jest.fn();

            // eslint-disable-next-line no-new
            new BridgeToNative({ logError });

            expect(MockedNativeNavigationAndTitleServiceConstructor).toHaveBeenCalledWith(
                expect.anything(),
                undefined,
                logError,
            );
        });
    });

    describe('Getters', () => {
        it('should return correct appId', () => {
            expect(bridge.appId).toBe(mockedNativeParamsServiceInstance.appId);
        });

        it('should return correct appVersion', () => {
            expect(bridge.appVersion).toBe(mockedNativeParamsServiceInstance.appVersion);
        });

        it('should return correct environment', () => {
            expect(bridge.environment).toBe(mockedNativeParamsServiceInstance.environment);
        });

        it('should return correct wasNativeParamsDataFailedToRead', () => {
            expect(bridge.wasNativeParamsDataFailedToRead).toBe(
                !mockedNativeParamsServiceInstance.nativeParamsReadErrorFlag,
            );
        });

        it('should return correct originalWebviewParams', () => {
            expect(bridge.originalWebviewParams).toBe(
                mockedNativeParamsServiceInstance.originalWebviewParams,
            );
        });

        it('should return correct theme', () => {
            expect(bridge.theme).toBe(mockedNativeParamsServiceInstance.theme);
        });
    });

    describe('Methods', () => {
        describe('canUseNativeFeature', () => {
            it('should call nativeParamsService.canUseNativeFeature', () => {
                const feature = 'geolocation';

                bridge.canUseNativeFeature(feature);
                expect(mockedNativeParamsServiceInstance.canUseNativeFeature).toHaveBeenCalledWith(
                    feature,
                );
            });

            it('should return value from nativeParamsService.canUseNativeFeature', () => {
                jest.spyOn(
                    mockedNativeParamsServiceInstance,
                    'canUseNativeFeature',
                ).mockImplementationOnce(() => true);

                expect(bridge.canUseNativeFeature('geolocation')).toBe(true);
            });
        });

        describe('closeWebview', () => {
            it('should call nativeNavigationAndTitleService.closeWebview', () => {
                bridge.closeWebview();
                expect(
                    mockedNativeNavigationAndTitleServiceInstance.closeWebview,
                ).toHaveBeenCalledTimes(1);
            });
        });

        describe('getHrefToOpenInBrowser', () => {
            it('should call externalLinksService.getHrefToOpenInBrowser', () => {
                const link = 'http://example.com';

                bridge.getHrefToOpenInBrowser(link);
                expect(
                    mockedExternalLinksServiceInstance.getHrefToOpenInBrowser,
                ).toHaveBeenCalledWith(link);
            });

            it('should return value from nativeParamsService.getHrefToOpenInBrowser', () => {
                const modifiedLink = 'http://example.com?openInBrowser=true';

                jest.spyOn(
                    mockedExternalLinksServiceInstance,
                    'getHrefToOpenInBrowser',
                ).mockImplementationOnce(() => modifiedLink);

                expect(bridge.getHrefToOpenInBrowser('http://example.com')).toBe(modifiedLink);
            });
        });

        describe('goBack', () => {
            it('should call nativeNavigationAndTitleService.goBack', () => {
                bridge.goBack();
                expect(mockedNativeNavigationAndTitleServiceInstance.goBack).toHaveBeenCalledTimes(
                    1,
                );
            });
        });

        describe('goBackAFewStepsClientSide', () => {
            it('should call nativeNavigationAndTitleService.goBackAFewStepsClientSide', () => {
                const steps = 3;

                bridge.goBackAFewStepsClientSide(steps);
                expect(
                    mockedNativeNavigationAndTitleServiceInstance.goBackAFewStepsClientSide,
                ).toHaveBeenCalledWith(steps, false);
            });

            it('should call nativeNavigationAndTitleService.goBackAFewStepsClientSide with autoCloseWebview flag', () => {
                const steps = 5;

                bridge.goBackAFewStepsClientSide(steps, true);
                expect(
                    mockedNativeNavigationAndTitleServiceInstance.goBackAFewStepsClientSide,
                ).toHaveBeenCalledWith(steps, true);
            });
        });

        describe('handleNativeDeeplink', () => {
            it('should call externalLinksService.handleNativeDeeplink', () => {
                const deeplink = 'test-deeplink';

                bridge.handleNativeDeeplink(deeplink);
                expect(
                    mockedExternalLinksServiceInstance.handleNativeDeeplink,
                ).toHaveBeenCalledWith(deeplink, false);
            });

            it('should call externalLinksService.handleNativeDeeplink with closeWebviewBeforeCallNativeDeeplinkHandler flag', () => {
                const deeplink = 'test-deeplink';

                bridge.handleNativeDeeplink(deeplink, true);
                expect(
                    mockedExternalLinksServiceInstance.handleNativeDeeplink,
                ).toHaveBeenCalledWith(deeplink, true);
            });
        });

        describe('isCurrentVersionHigherOrEqual', () => {
            it('should call nativeParamsService.isCurrentVersionHigherOrEqual', () => {
                const version = '2.0.0';

                bridge.isCurrentVersionHigherOrEqual(version);
                expect(
                    mockedNativeParamsServiceInstance.isCurrentVersionHigherOrEqual,
                ).toHaveBeenCalledWith(version);
            });

            it('should return value from nativeParamsService.isCurrentVersionHigherOrEqual', () => {
                jest.spyOn(
                    mockedNativeParamsServiceInstance,
                    'isCurrentVersionHigherOrEqual',
                ).mockImplementationOnce(() => true);

                expect(bridge.isCurrentVersionHigherOrEqual('2.0.0')).toBe(true);
            });
        });

        describe('navigateClientSide', () => {
            it('should call nativeNavigationAndTitleService.navigateClientSide', () => {
                const url = 'http://example.com';

                bridge.navigateClientSide(url);
                expect(
                    mockedNativeNavigationAndTitleServiceInstance.navigateClientSide,
                ).toHaveBeenCalledWith(url, undefined, '');
            });

            it('should call nativeNavigationAndTitleService.navigateClientSide with optional parameters', () => {
                const url = 'http://example.com';
                const state = { test: true };
                const nativeTitle = 'Test Title';

                bridge.navigateClientSide(url, state, nativeTitle);
                expect(
                    mockedNativeNavigationAndTitleServiceInstance.navigateClientSide,
                ).toHaveBeenCalledWith(url, state, nativeTitle);
            });
        });

        describe('navigateServerSide', () => {
            it('should call nativeNavigationAndTitleService.navigateServerSide', () => {
                const url = 'http://example.com';

                bridge.navigateServerSide(url);
                expect(
                    mockedNativeNavigationAndTitleServiceInstance.navigateServerSide,
                ).toHaveBeenCalledWith(url, '');
            });

            it('should call nativeNavigationAndTitleService.navigateServerSide with nativeTitle parameter', () => {
                const url = 'http://example.com';
                const nativeTitle = 'Test Title';

                bridge.navigateServerSide(url, nativeTitle);
                expect(
                    mockedNativeNavigationAndTitleServiceInstance.navigateServerSide,
                ).toHaveBeenCalledWith(url, nativeTitle);
            });
        });

        describe('openInBrowser', () => {
            it('should call externalLinksService.openInBrowser', () => {
                const link = 'https://example.com';

                bridge.openInBrowser(link);
                expect(mockedExternalLinksServiceInstance.openInBrowser).toHaveBeenCalledWith(link);
            });
        });

        describe('openInNewWebview', () => {
            it('should call externalLinksService.openInNewWebview', () => {
                const link = 'https://example.com';

                bridge.openInNewWebview(link);
                expect(mockedExternalLinksServiceInstance.openInNewWebview).toHaveBeenCalledWith(
                    link,
                    '',
                    false,
                );
            });

            it('should call externalLinksService.openInNewWebview with optional parameters', () => {
                const link = 'https://example.com';
                const nativeTitle = 'Test Title';
                const closeCurrentWebview = true;

                bridge.openInNewWebview(link, nativeTitle, closeCurrentWebview);
                expect(mockedExternalLinksServiceInstance.openInNewWebview).toHaveBeenCalledWith(
                    link,
                    nativeTitle,
                    closeCurrentWebview,
                );
            });
        });

        describe('openPdf', () => {
            it('should call externalLinksService.pdfType', () => {
                const url = 'https://example.com/file.pdf';

                bridge.openPdf(url);
                expect(mockedExternalLinksServiceInstance.openPdf).toHaveBeenCalledWith(
                    url,
                    'pdfFile',
                    undefined,
                );
            });

            it('should call externalLinksService.pdfType with optional parameters', () => {
                const url = 'https://example.com/file.pdf';
                const type = 'base64';
                const title = 'PDF Title';

                bridge.openPdf(url, type, title);
                expect(mockedExternalLinksServiceInstance.openPdf).toHaveBeenCalledWith(
                    url,
                    type,
                    title,
                );
            });
        });

        describe('setTitle', () => {
            it('should call nativeNavigationAndTitleService.setTitle', () => {
                const nativeTitle = 'New Title';

                bridge.setTitle(nativeTitle);
                expect(mockedNativeNavigationAndTitleServiceInstance.setTitle).toHaveBeenCalledWith(
                    nativeTitle,
                );
            });
        });
    });
});
