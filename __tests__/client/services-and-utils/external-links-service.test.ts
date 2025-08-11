import { ExternalLinksService } from '../../../src/client/services-and-utils/external-links-service';
import { type NativeParamsService } from '../../../src/client/services-and-utils/native-params-service';

const mockedCloseWebviewUtil = jest.fn();

jest.mock('../../../src/client/services-and-utils/close-webview-util', () => ({
    __esModule: true,
    get closeWebviewUtil() {
        return mockedCloseWebviewUtil;
    },
}));

const mockedNativeParamsServiceInstance = {
    appId: 'alfabank',
    appVersion: '1.0.0',
    environment: 'android',
    nativeParamsReadErrorFlag: false,
    originalWebviewParams: 'theme=light',
    theme: 'light',
    canUseNativeFeature: jest.fn(),
    isCurrentVersionHigherOrEqual: jest.fn(),
} as unknown as NativeParamsService;

describe('ExternalLinksService', () => {
    const locationReplaceSpy = jest.spyOn(window.location, 'replace');
    const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(jest.fn());

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('method handleNativeDeeplink', () => {
        it.each([
            [
                'webFeature?type=recommendation&url=https%3A%2F%2Ftemplate.app',
                'alfabank://webFeature?type=recommendation&url=https%3A%2F%2Ftemplate.app',
            ],
            ['alfabank:///dashboard/deeplink_template', 'alfabank://deeplink_template'],
            ['alfabank:///deeplink_template', 'alfabank://deeplink_template'],
            ['alfabank://deeplink_template', 'alfabank://deeplink_template'],
            ['/deeplink_template', 'alfabank://deeplink_template'],
        ])(
            'should modify input deeplink `%s` and call locationReplace with `%s`',
            (deeplink, expectedValue) => {
                const inst = new ExternalLinksService(mockedNativeParamsServiceInstance);

                inst.handleNativeDeeplink(deeplink);

                expect(locationReplaceSpy).toHaveBeenCalledWith(expectedValue);
            },
        );

        it('should use closeWebviewBeforeCallNativeDeeplinkHandler argument', () => {
            const inst = new ExternalLinksService(mockedNativeParamsServiceInstance);
            const deeplink = 'webFeature?type=recommendation&url=https%3A%2F%2Ftemplate.app';

            // @ts-expect-error –– Мокаем приватный метод
            jest.spyOn(inst.nativeParamsService, 'canUseNativeFeature').mockImplementationOnce(
                () => true,
            );

            inst.handleNativeDeeplink(deeplink, true);

            expect(mockedCloseWebviewUtil).toHaveBeenCalled();
        });
    });

    describe('method getHrefToOpenInBrowser', () => {
        it('should modify URL to force opening it in browser for NA versions that support it', () => {
            const inst = new ExternalLinksService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватный метод
            jest.spyOn(inst.nativeParamsService, 'canUseNativeFeature').mockImplementation(
                () => true,
            );

            expect(inst.getHrefToOpenInBrowser('https://ya.ru')).toBe(
                'https://ya.ru/?openInBrowser=true',
            );

            expect(inst.getHrefToOpenInBrowser('https://ya.ru/?otherQuery=whyNot')).toStrictEqual(
                'https://ya.ru/?otherQuery=whyNot&openInBrowser=true',
            );
        });

        it('should modify URL to deplink which force opening it in new WV for old NA versions', () => {
            const inst = new ExternalLinksService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватный метод
            jest.spyOn(inst.nativeParamsService, 'canUseNativeFeature').mockImplementation(
                () => false,
            );

            expect(inst.getHrefToOpenInBrowser('https://ya.ru')).toBe(
                'alfabank://webFeature?type=recommendation&url=https%3A%2F%2Fya.ru',
            );

            expect(inst.getHrefToOpenInBrowser('https://ya.ru/?otherQuery=whyNot')).toStrictEqual(
                'alfabank://webFeature?type=recommendation&url=https%3A%2F%2Fya.ru%2F%3FotherQuery%3DwhyNot',
            );
        });
    });

    describe('method openInBrowser', () => {
        it('should open link in browser for NA versions that support it', () => {
            const inst = new ExternalLinksService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватный метод
            jest.spyOn(inst.nativeParamsService, 'canUseNativeFeature').mockImplementation(
                () => true,
            );

            const link = 'https://ya.ru';

            inst.openInBrowser(link);

            expect(locationReplaceSpy).toHaveBeenCalledWith(`${link}/?openInBrowser=true`);
        });

        it('should open link in new webview for old NA versions', () => {
            const inst = new ExternalLinksService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватный метод
            jest.spyOn(inst.nativeParamsService, 'canUseNativeFeature').mockImplementation(
                () => false,
            );

            const link = 'https://ya.ru';

            inst.openInBrowser(link);

            expect(locationReplaceSpy).toHaveBeenCalledWith(
                'alfabank://webFeature?type=recommendation&url=https%3A%2F%2Fya.ru%2F',
            );
        });
    });

    describe('method openInNewWebview', () => {
        it('should open link in new webview with default title', () => {
            const inst = new ExternalLinksService(mockedNativeParamsServiceInstance);

            const link = 'https://ya.ru';

            inst.openInNewWebview(link);

            expect(locationReplaceSpy).toHaveBeenCalledWith(
                'alfabank://webFeature?type=recommendation&url=https%3A%2F%2Fya.ru%2F',
            );
        });

        it('should open link in new webview with custom title', () => {
            const inst = new ExternalLinksService(mockedNativeParamsServiceInstance);

            const link = 'https://ya.ru';
            const title = 'Custom Title';

            inst.openInNewWebview(link, title);

            expect(locationReplaceSpy).toHaveBeenCalledWith(
                'alfabank://webFeature?type=recommendation&url=https%3A%2F%2Fya.ru%2F%3Fb2n-title%3DCustom%2BTitle',
            );
        });

        it('should close current webview before opening new one', () => {
            const inst = new ExternalLinksService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватный метод
            jest.spyOn(inst.nativeParamsService, 'canUseNativeFeature').mockImplementationOnce(
                () => true,
            );

            const link = 'https://ya.ru';

            inst.openInNewWebview(link, '', true);

            expect(mockedCloseWebviewUtil).toHaveBeenCalled();
        });
    });

    describe('method openPdf', () => {
        it('should call location.replace if window.open returns null', () => {
            const testUrl = 'https://example.com/file.pdf';
            const inst = new ExternalLinksService(mockedNativeParamsServiceInstance);

            windowOpenSpy.mockImplementationOnce(() => null);

            inst.openPdf(testUrl);
            expect(windowOpenSpy).toHaveBeenCalledWith(testUrl);
            expect(locationReplaceSpy).toHaveBeenCalledWith(testUrl);
        });

        describe('Android environment', () => {
            it('should work fine in general', () => {
                const testUrl = 'https://example.com/file.pdf';
                const inst = new ExternalLinksService(mockedNativeParamsServiceInstance);

                inst.openPdf(testUrl);
                expect(windowOpenSpy).toHaveBeenCalledWith(testUrl);

                inst.openPdf(testUrl, 'binary');
                expect(windowOpenSpy).toHaveBeenCalledWith(testUrl);
            });
        });

        describe('iOS environment', () => {
            const iOSMockedNativeParamsServiceInstance = {
                ...mockedNativeParamsServiceInstance,
                appId: 'kittycash',
                environment: 'ios',
            } as NativeParamsService;

            it.each(['alfabank', 'aconcierge', 'kittycash'])(
                'should work for %s scheme of NA',
                (appId) => {
                    const inst = new ExternalLinksService({
                        ...iOSMockedNativeParamsServiceInstance,
                        appId,
                    } as NativeParamsService);

                    inst.openPdf('https://example.com/file.pdf');
                    expect(windowOpenSpy).toHaveBeenCalledWith(
                        `${appId}:///dashboard/pdf_viewer?type=pdfFile&url=https%3A%2F%2Fexample.com%2Ffile.pdf`,
                    );
                },
            );

            it('should use type parameter', () => {
                const inst = new ExternalLinksService(iOSMockedNativeParamsServiceInstance);

                inst.openPdf('https://example.com/file.pdf', 'binary');
                expect(windowOpenSpy).toHaveBeenCalledWith(
                    'kittycash:///dashboard/pdf_viewer?type=binary&url=https%3A%2F%2Fexample.com%2Ffile.pdf',
                );
            });

            it('should use title parameter', () => {
                const inst = new ExternalLinksService(iOSMockedNativeParamsServiceInstance);

                inst.openPdf('https://example.com/file.pdf', 'pdfFile', 'Test Title');
                expect(windowOpenSpy).toHaveBeenCalledWith(
                    'kittycash:///dashboard/pdf_viewer?type=pdfFile&url=https%3A%2F%2Fexample.com%2Ffile.pdf&title=Test_Title',
                );
            });
        });
    });
});
