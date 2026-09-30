import { ExternalLinksService } from '../../../src/client/services-and-utils/external-links-service';
import { NativeLogService } from '../../../src/client/services-and-utils/native-log-service';
import { type NativeParamsService } from '../../../src/client/services-and-utils/native-params-service';

const mockedCloseWebviewUtil = jest.fn();
const mockedValidateUrl = jest.fn();

jest.mock('../../../src/client/services-and-utils/utils', () => {
    const actual = jest.requireActual('../../../src/client/services-and-utils/utils');

    return {
        __esModule: true,
        appendFromCurrentQueryParamForIos: actual.appendFromCurrentQueryParamForIos,
        validateUrl: actual.validateUrl,
        get closeWebviewUtil() {
            return mockedCloseWebviewUtil;
        },
    };
});

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

const mockedNativeLogServiceInstance = {
    isNoop: true,
    environment: 'android',
    appVersion: '12.30.0',

    logFeatureFallback: jest.fn(),
    execute: jest.fn((_, fn) => fn()),
} as unknown as NativeLogService;

describe('ExternalLinksService', () => {
    const locationReplaceSpy = jest.spyOn(window.location, 'replace');

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('method `handleNativeDeeplink`', () => {
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
            'should modify input deeplink `%s` and call `location.replace` with `%s`',
            (deeplink, expectedValue) => {
                const inst = new ExternalLinksService(
                    mockedNativeParamsServiceInstance,
                    mockedNativeLogServiceInstance,
                );

                inst.handleNativeDeeplink(deeplink);
                expect(locationReplaceSpy).toHaveBeenCalledWith(expectedValue);
            },
        );

        it('should use `closeWebviewBeforeCallNativeDeeplinkHandler` argument', () => {
            const inst = new ExternalLinksService(
                mockedNativeParamsServiceInstance,
                mockedNativeLogServiceInstance,
            );
            const deeplink = 'webFeature?type=recommendation&url=https%3A%2F%2Ftemplate.app';

            // @ts-expect-error –– Мокаем приватный метод
            jest.spyOn(inst.nativeParamsService, 'canUseNativeFeature').mockImplementationOnce(
                () => true,
            );

            inst.handleNativeDeeplink(deeplink, true);
            expect(mockedCloseWebviewUtil).toHaveBeenCalled();
        });

        describe('iOS environment', () => {
            const iOSNativeParamsServiceInstance = {
                ...mockedNativeParamsServiceInstance,
                environment: 'ios',
            } as unknown as NativeParamsService;

            it.each([
                [
                    'webFeature?type=recommendation&url=https%3A%2F%2Ftemplate.app',
                    'alfabank://webFeature?type=recommendation&url=https%3A%2F%2Ftemplate.app&fromCurrent=true',
                ],
                [
                    'alfabank:///dashboard/deeplink_template',
                    'alfabank://deeplink_template?fromCurrent=true',
                ],
                ['alfabank:///deeplink_template', 'alfabank://deeplink_template?fromCurrent=true'],
                ['alfabank://deeplink_template', 'alfabank://deeplink_template?fromCurrent=true'],
                ['/deeplink_template', 'alfabank://deeplink_template?fromCurrent=true'],
            ])('should append `fromCurrent=true` for `%s`', (deeplink, expectedValue) => {
                const inst = new ExternalLinksService(
                    iOSNativeParamsServiceInstance,
                    mockedNativeLogServiceInstance,
                );

                inst.handleNativeDeeplink(deeplink);
                expect(locationReplaceSpy).toHaveBeenCalledWith(expectedValue);
            });

            it('should pass prepared URL when closing webview before deeplink', () => {
                jest.useFakeTimers();
                const inst = new ExternalLinksService(
                    iOSNativeParamsServiceInstance,
                    mockedNativeLogServiceInstance,
                );
                const deeplink = '/deeplink_template';

                // @ts-expect-error –– Мокаем приватный метод
                jest.spyOn(inst.nativeParamsService, 'canUseNativeFeature').mockImplementationOnce(
                    () => true,
                );

                inst.handleNativeDeeplink(deeplink, true);
                expect(mockedCloseWebviewUtil).toHaveBeenCalled();
                expect(locationReplaceSpy).not.toHaveBeenCalled();

                jest.runAllTimers();
                expect(locationReplaceSpy).toHaveBeenCalledWith(
                    'alfabank://deeplink_template?fromCurrent=true',
                );
                jest.useRealTimers();
            });
        });
    });

    describe('method `getHrefToOpenInBrowser`', () => {
        it('should modify URL to force opening it in browser for NA versions that support it', () => {
            const inst = new ExternalLinksService(
                mockedNativeParamsServiceInstance,
                mockedNativeLogServiceInstance,
            );

            // @ts-expect-error –– Мокаем приватный метод
            jest.spyOn(inst.nativeParamsService, 'canUseNativeFeature').mockImplementation(
                () => true,
            );

            expect(inst.getHrefToOpenInBrowser('https://ya.ru')).toBe(
                'https://ya.ru/?openInBrowser=true',
            );
            expect(inst.getHrefToOpenInBrowser('https://ya.ru/?otherQuery=whyNot')).toBe(
                'https://ya.ru/?otherQuery=whyNot&openInBrowser=true',
            );
        });

        it('should modify URL to deplink which force opening it in new WV for old NA versions', () => {
            const inst = new ExternalLinksService(
                mockedNativeParamsServiceInstance,
                mockedNativeLogServiceInstance,
            );

            // @ts-expect-error –– Мокаем приватный метод
            jest.spyOn(inst.nativeParamsService, 'canUseNativeFeature').mockImplementation(
                () => false,
            );

            expect(inst.getHrefToOpenInBrowser('https://ya.ru')).toBe(
                'alfabank://webFeature?type=recommendation&url=https%3A%2F%2Fya.ru',
            );
            expect(inst.getHrefToOpenInBrowser('https://ya.ru/?otherQuery=whyNot')).toBe(
                'alfabank://webFeature?type=recommendation&url=https%3A%2F%2Fya.ru%2F%3FotherQuery%3DwhyNot',
            );
        });
    });

    describe('method `openInBrowser`', () => {
        it('should open link in browser for NA versions that support it', () => {
            const inst = new ExternalLinksService(
                mockedNativeParamsServiceInstance,
                mockedNativeLogServiceInstance,
            );

            // @ts-expect-error –– Мокаем приватный метод
            jest.spyOn(inst.nativeParamsService, 'canUseNativeFeature').mockImplementation(
                () => true,
            );

            const link = 'https://ya.ru';

            inst.openInBrowser(link);
            expect(locationReplaceSpy).toHaveBeenCalledWith(`${link}/?openInBrowser=true`);
        });

        it('should open link in new WV for old NA versions', () => {
            const inst = new ExternalLinksService(
                mockedNativeParamsServiceInstance,
                mockedNativeLogServiceInstance,
            );

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

    describe('method `openInNewWebview`', () => {
        it('should open link in new WV with default title', () => {
            const inst = new ExternalLinksService(
                mockedNativeParamsServiceInstance,
                mockedNativeLogServiceInstance,
            );

            const link = 'https://ya.ru';

            inst.openInNewWebview(link);
            expect(locationReplaceSpy).toHaveBeenCalledWith(
                'alfabank://webFeature?type=recommendation&url=https%3A%2F%2Fya.ru%2F',
            );
        });

        it('should open link in new WV with custom title', () => {
            const inst = new ExternalLinksService(
                mockedNativeParamsServiceInstance,
                mockedNativeLogServiceInstance,
            );

            const link = 'https://ya.ru';
            const title = 'Custom Title';

            inst.openInNewWebview(link, title);
            expect(locationReplaceSpy).toHaveBeenCalledWith(
                'alfabank://webFeature?type=recommendation&url=https%3A%2F%2Fya.ru%2F%3Fb2n-title%3DCustom%2BTitle',
            );
        });

        it('should close current WV before opening a new one', () => {
            const inst = new ExternalLinksService(
                mockedNativeParamsServiceInstance,
                mockedNativeLogServiceInstance,
            );

            const featureSpy = jest
                .spyOn(mockedNativeParamsServiceInstance, 'canUseNativeFeature')
                .mockReturnValue(true);

            const link = 'https://ya.ru';

            try {
                inst.openInNewWebview(link, '', true);

                expect(mockedCloseWebviewUtil).toHaveBeenCalled();
            } finally {
                featureSpy.mockRestore();
            }
        });
    });

    describe('method `openPdf`', () => {
        describe('Android environment', () => {
            it('should call `location.replace`', () => {
                const testUrl = 'https://example.com/file.pdf';
                const inst = new ExternalLinksService(
                    mockedNativeParamsServiceInstance,
                    mockedNativeLogServiceInstance,
                );

                inst.openPdf(testUrl);
                expect(locationReplaceSpy).toHaveBeenCalledWith(testUrl);
            });

            it('should work fine in general', () => {
                const testUrl = 'https://example.com/file.pdf';
                const inst = new ExternalLinksService(
                    mockedNativeParamsServiceInstance,
                    mockedNativeLogServiceInstance,
                );

                inst.openPdf(testUrl);
                expect(locationReplaceSpy).toHaveBeenCalledWith(testUrl);

                inst.openPdf(testUrl, 'binary');
                expect(locationReplaceSpy).toHaveBeenCalledWith(testUrl);
            });
        });

        describe('iOS environment', () => {
            const iOSMockedNativeParamsServiceInstance = {
                ...mockedNativeParamsServiceInstance,
                appId: 'kittycash',
                environment: 'ios',
            } as NativeParamsService;

            it.each(['alfabank', 'aconcierge', 'kittycash'])(
                'should work for `%s` scheme of NA',
                (appId) => {
                    const inst = new ExternalLinksService(
                        {
                            ...iOSMockedNativeParamsServiceInstance,
                            appId,
                        } as NativeParamsService,
                        mockedNativeLogServiceInstance,
                    );

                    inst.openPdf('https://example.com/file.pdf');
                    expect(locationReplaceSpy).toHaveBeenCalledWith(
                        `${appId}:///dashboard/pdf_viewer?type=pdfFile&url=https%3A%2F%2Fexample.com%2Ffile.pdf&fromCurrent=true`,
                    );
                },
            );

            it('should use `type` parameter', () => {
                const inst = new ExternalLinksService(
                    iOSMockedNativeParamsServiceInstance,
                    mockedNativeLogServiceInstance,
                );

                inst.openPdf('https://example.com/file.pdf', 'binary');
                expect(locationReplaceSpy).toHaveBeenCalledWith(
                    'kittycash:///dashboard/pdf_viewer?type=binary&url=https%3A%2F%2Fexample.com%2Ffile.pdf&fromCurrent=true',
                );
            });

            it('should use `title` parameter', () => {
                const inst = new ExternalLinksService(
                    iOSMockedNativeParamsServiceInstance,
                    mockedNativeLogServiceInstance,
                );

                inst.openPdf('https://example.com/file.pdf', 'pdfFile', 'Test Title');
                expect(locationReplaceSpy).toHaveBeenCalledWith(
                    'kittycash:///dashboard/pdf_viewer?type=pdfFile&url=https%3A%2F%2Fexample.com%2Ffile.pdf&title=Test_Title&fromCurrent=true',
                );
            });
        });
    });

    describe('debounce behavior', () => {
        it('should ignore rapid calls to `handleNativeDeeplink`', () => {
            jest.useFakeTimers();
            const inst = new ExternalLinksService(
                mockedNativeParamsServiceInstance,
                mockedNativeLogServiceInstance,
            );

            inst.handleNativeDeeplink('/deeplink');
            inst.handleNativeDeeplink('/another_deeplink');

            expect(locationReplaceSpy).toHaveBeenCalledTimes(1);
            expect(locationReplaceSpy).toHaveBeenCalledWith('alfabank://deeplink');

            jest.runAllTimers();
            jest.useRealTimers();
        });

        it('should ignore rapid calls to `openInBrowser`', () => {
            jest.useFakeTimers();
            const inst = new ExternalLinksService(
                mockedNativeParamsServiceInstance,
                mockedNativeLogServiceInstance,
            );

            // @ts-expect-error –– Мокаем приватный метод
            jest.spyOn(inst.nativeParamsService, 'canUseNativeFeature').mockImplementation(
                () => true,
            );

            inst.openInBrowser('https://ya.ru');
            inst.openInBrowser('https://google.com');

            expect(locationReplaceSpy).toHaveBeenCalledTimes(1);
            expect(locationReplaceSpy).toHaveBeenCalledWith('https://ya.ru/?openInBrowser=true');

            jest.runAllTimers();
            jest.useRealTimers();
        });

        it('should ignore rapid calls to `openPdf`', () => {
            jest.useFakeTimers();
            const inst = new ExternalLinksService(
                mockedNativeParamsServiceInstance,
                mockedNativeLogServiceInstance,
            );

            inst.openPdf('https://example.com/file1.pdf');
            inst.openPdf('https://example.com/file2.pdf');

            expect(locationReplaceSpy).toHaveBeenCalledTimes(1);
            expect(locationReplaceSpy).toHaveBeenCalledWith('https://example.com/file1.pdf');

            jest.runAllTimers();
            jest.useRealTimers();
        });

        it('should allow new calls after 150ms timeout', () => {
            jest.useFakeTimers();
            const inst = new ExternalLinksService(
                mockedNativeParamsServiceInstance,
                mockedNativeLogServiceInstance,
            );

            inst.handleNativeDeeplink('/deeplink1');
            expect(locationReplaceSpy).toHaveBeenCalledTimes(1);

            jest.advanceTimersByTime(150);

            inst.handleNativeDeeplink('/deeplink2');
            expect(locationReplaceSpy).toHaveBeenCalledTimes(2);
            expect(locationReplaceSpy).toHaveBeenLastCalledWith('alfabank://deeplink2');

            jest.useRealTimers();
        });

        it('should allow new calls when called after timeout for `openInBrowser`', () => {
            jest.useFakeTimers();

            mockedValidateUrl.mockImplementation((link: string) => new URL(link));

            const inst = new ExternalLinksService(
                mockedNativeParamsServiceInstance,
                mockedNativeLogServiceInstance,
            );

            // @ts-expect-error –– Мокаем приватный метод
            jest.spyOn(inst.nativeParamsService, 'canUseNativeFeature').mockImplementation(
                () => true,
            );

            inst.openInBrowser('https://ya.ru');
            expect(locationReplaceSpy).toHaveBeenCalledTimes(1);

            jest.advanceTimersByTime(150);

            inst.openInBrowser('https://google.com');
            expect(locationReplaceSpy).toHaveBeenCalledTimes(2);
            expect(locationReplaceSpy).toHaveBeenLastCalledWith(
                'https://google.com/?openInBrowser=true',
            );

            jest.useRealTimers();
        });

        it('should allow new calls when called after timeout for `openPdf`', () => {
            jest.useFakeTimers();
            const inst = new ExternalLinksService(
                mockedNativeParamsServiceInstance,
                mockedNativeLogServiceInstance,
            );

            inst.openPdf('https://example.com/file1.pdf');
            expect(locationReplaceSpy).toHaveBeenCalledTimes(1);

            jest.advanceTimersByTime(150);

            inst.openPdf('https://example.com/file2.pdf');
            expect(locationReplaceSpy).toHaveBeenCalledTimes(2);
            expect(locationReplaceSpy).toHaveBeenLastCalledWith('https://example.com/file2.pdf');

            jest.useRealTimers();
        });
    });

    describe('noop', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            jest.useFakeTimers();
            jest.spyOn(console, 'info').mockImplementation(() => undefined);
        });

        afterEach(() => {
            jest.useRealTimers();
            jest.restoreAllMocks();
        });

        it.each(['ios', 'android'] as const)(
            'suppresses native effects on %s including delayed navigation',
            (environment) => {
                const params = {
                    ...mockedNativeParamsServiceInstance,
                    environment,
                    canUseNativeFeature: () => true,
                } as unknown as NativeParamsService;
                const replace = jest.spyOn(window.location, 'replace');
                const service = new ExternalLinksService(
                    params,
                    new NativeLogService(environment, '14.0.0', true),
                );

                service.handleNativeDeeplink('/deeplink');
                service.handleNativeDeeplink('/deeplink', true);
                service.openInBrowser('https://example.com');
                service.openInNewWebview('https://example.com', 'Title', true);
                service.openPdf('https://example.com/file.pdf');

                expect(jest.getTimerCount()).toBe(0);
                jest.runAllTimers();
                expect(replace).not.toHaveBeenCalled();
                expect(mockedCloseWebviewUtil).not.toHaveBeenCalled();
                expect(console.info).toHaveBeenCalled();
            },
        );

        it('logs version fallbacks and still returns href in noop', () => {
            const params = {
                ...mockedNativeParamsServiceInstance,
                environment: 'android',
                canUseNativeFeature: () => false,
            } as unknown as NativeParamsService;
            const service = new ExternalLinksService(
                params,
                new NativeLogService('android', '11.70.0', true),
            );
            const replace = jest.spyOn(window.location, 'replace');

            expect(service.getHrefToOpenInBrowser('https://example.com')).toContain(
                'alfabank://webFeature',
            );
            service.openInBrowser('https://example.com');
            service.openInNewWebview('https://example.com');

            expect(console.info).toHaveBeenCalledWith(
                expect.stringContaining('Feature: linksInBrowser'),
                expect.anything(),
            );
            expect(console.info).toHaveBeenCalledWith(
                expect.stringContaining('Feature: savedBackStack'),
                expect.anything(),
            );
            expect(replace).not.toHaveBeenCalled();
        });
    });
});
