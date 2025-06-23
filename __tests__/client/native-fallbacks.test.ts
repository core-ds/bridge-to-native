import type { BridgeToNative } from '../../src/client/bridge-to-native';
import { nativeFeaturesFromVersion } from '../../src/client/constants';
import { NativeFallbacks } from '../../src/client/native-fallbacks';
import { PdfType } from '../../src/client/types';

type JestFn = ReturnType<typeof jest.fn>;

let appVersion: string;
let androidEnvFlag: boolean;
let canOpenLinksInBrowser: boolean;
let appId: string;
let mockedLocationReplace: JestFn;
let mockedHandleRedirect: JestFn;
let mockedSetInitialView: JestFn;
let mockedWindowOpen: JestFn;

const locationReplaceSpy = jest.spyOn(window.location, 'replace');
const windowOpenSpy = jest.spyOn(window, 'open');

const mockedBridgeToAmInstance = {
    get appVersion() {
        return appVersion;
    },
    canUseNativeFeature() {
        return canOpenLinksInBrowser;
    },
    get environment() {
        return androidEnvFlag ? 'android' : 'ios';
    },
    get appId() {
        return appId;
    },
    get nativeNavigationAndTitle() {
        return { setInitialView: mockedSetInitialView, handleRedirect: mockedHandleRedirect };
    },
} as unknown as BridgeToNative;

jest.mock('../../src/client/bridge-to-native', () => ({
    __esModule: true,
    BridgeToNative: function MockedBridgeToAmConstructor() {
        return mockedBridgeToAmInstance;
    },
}));

describe('AmFallbacks', () => {
    beforeEach(() => {
        appVersion = '10.0.0';
        androidEnvFlag = false;
        canOpenLinksInBrowser = false;
        appId = 'alfabank';
        mockedLocationReplace = jest.fn();
        mockedHandleRedirect = jest.fn();
        mockedSetInitialView = jest.fn();
        mockedWindowOpen = jest.fn();

        locationReplaceSpy.mockImplementation(mockedLocationReplace);
        windowOpenSpy.mockImplementation(mockedWindowOpen as typeof window.open);
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('method `getExternalLinkProps`', () => {
        it.each([
            ['ios', nativeFeaturesFromVersion.ios.linksInBrowser.fromVersion],
            ['android', nativeFeaturesFromVersion.android.linksInBrowser.fromVersion],
        ])(
            "should return href with link with 'openInBrowser' query for '%s' app v. >= '%s'",
            (platform) => {
                androidEnvFlag = platform === 'android';
                canOpenLinksInBrowser = true;

                const inst = new NativeFallbacks(mockedBridgeToAmInstance);

                expect(inst.getExternalLinkProps('https://ya.ru')).toStrictEqual({
                    href: 'https://ya.ru/?openInBrowser=true',
                    onClick: undefined,
                });

                expect(inst.getExternalLinkProps('https://ya.ru/?otherQuery=whyNot')).toStrictEqual(
                    {
                        href: 'https://ya.ru/?otherQuery=whyNot&openInBrowser=true',
                        onClick: undefined,
                    },
                );
            },
        );

        it.each([
            ['https://ya.ru/', 'alfabank'],
            ['https://asino666.com/', 'aconcierge'],
            ['https://kojima.genius/', 'kittycash'],
            ['http://naruto.ucoz.ru/', 'aweassist'],
        ])(
            'should return correct new-webview deeplink for `%s` when app can not open in browser and its scheme is `%s`',
            (url, caseAppId) => {
                appId = caseAppId;
                const inst = new NativeFallbacks(mockedBridgeToAmInstance);

                expect(inst.getExternalLinkProps(url)).toStrictEqual({
                    href: `${appId}://webFeature?type=recommendation&url=${encodeURIComponent(
                        url,
                    )}`,
                    onClick: undefined,
                });
            },
        );

        it('should use onclick option', () => {
            const fn = () => {};
            const inst = new NativeFallbacks(mockedBridgeToAmInstance);

            expect(inst.getExternalLinkProps('https://ya.ru', { onClick: fn }).onClick).toBe(fn);
        });

        it('should use forceOpenInWebview option', () => {
            canOpenLinksInBrowser = true;

            const url = 'https://ya.ru/';
            const inst = new NativeFallbacks(mockedBridgeToAmInstance);

            expect(inst.getExternalLinkProps(url, { forceOpenInWebview: true })).toStrictEqual({
                href: 'alfabank://webFeature?type=recommendation&url=' + encodeURIComponent(url),
                onClick: undefined,
            });
        });
    });

    describe('method `openPdf`', () => {
        describe('Android AM', () => {
            it('should work fine in general', () => {
                androidEnvFlag = true;

                const inst = new NativeFallbacks(mockedBridgeToAmInstance);

                inst.openPdf('https://my.pdf/location');
                expect(mockedWindowOpen).toBeCalledWith('https://my.pdf/location');

                inst.openPdf('https://my.pdf/location', 'binary');
                expect(mockedWindowOpen).toBeCalledWith('https://my.pdf/location');
            });

            it('should work with pdfType=base64', () => {
                androidEnvFlag = true;

                const inst = new NativeFallbacks(mockedBridgeToAmInstance);

                inst.openPdf('v1/test-uil?asd=true', 'base64');
                expect(mockedWindowOpen).toBeCalledWith(
                    '/services/base64-to-pdf?type=base64&url=v1%2Ftest-uil%3Fasd%3Dtrue',
                );

                inst.openPdf('v1/test-uil?asd=false', 'base64', 'тайтл файла');
                expect(mockedWindowOpen).toBeCalledWith(
                    '/services/base64-to-pdf?type=base64&url=v1%2Ftest-uil%3Fasd%3Dfalse&title=%D1%82%D0%B0%D0%B9%D1%82%D0%BB_%D1%84%D0%B0%D0%B9%D0%BB%D0%B0',
                );
            });
        });

        describe('IOS AM', () => {
            it.each(['alfabank', 'aconcierge', 'kittycash'])(
                '%s-AM: with pdfUrl only',
                (caseAppId) => {
                    appId = caseAppId;

                    const inst = new NativeFallbacks(mockedBridgeToAmInstance);

                    inst.openPdf('https://my.pdf/location');
                    expect(mockedWindowOpen).toBeCalledWith(
                        `${appId}:///dashboard/pdf_viewer?type=pdfFile&url=https%3A%2F%2Fmy.pdf%2Flocation`,
                    );
                },
            );

            it.each(['pdfFile', 'binary', 'base64'] as PdfType[])(
                'with pdfUrl, pdfType === `%s`',
                (pdfType) => {
                    const inst = new NativeFallbacks(mockedBridgeToAmInstance);

                    inst.openPdf('https://my.pdf/location', pdfType);
                    expect(mockedWindowOpen).toBeCalledWith(
                        `alfabank:///dashboard/pdf_viewer?type=${pdfType}&url=https%3A%2F%2Fmy.pdf%2Flocation`,
                    );

                    inst.openPdf('v1/url', pdfType, 'тест тайтл');
                    expect(mockedWindowOpen).toBeCalledWith(
                        `alfabank:///dashboard/pdf_viewer?type=${pdfType}&url=v1%2Furl&title=%D1%82%D0%B5%D1%81%D1%82_%D1%82%D0%B0%D0%B9%D1%82%D0%BB`,
                    );
                },
            );
        });
    });

    describe('method `visitExternalResource`', () => {
        it.each([
            ['ios', nativeFeaturesFromVersion.ios.linksInBrowser.fromVersion],
            ['android', nativeFeaturesFromVersion.android.linksInBrowser.fromVersion],
        ])("should visit link with 'openInBrowser' query for '%s' app v. >= '%s'", (platform) => {
            androidEnvFlag = platform === 'android';
            canOpenLinksInBrowser = true;

            const inst = new NativeFallbacks(mockedBridgeToAmInstance);

            inst.visitExternalResource('https://ya.ru');
            expect(mockedLocationReplace).toBeCalledWith('https://ya.ru/?openInBrowser=true');

            inst.visitExternalResource('https://ya.ru/?otherQuery=whyNot');
            expect(mockedLocationReplace).toBeCalledWith(
                'https://ya.ru/?otherQuery=whyNot&openInBrowser=true',
            );
        });

        it.each([
            ['https://ya.ru/', 'alfabank'],
            ['https://asino666.com/', 'aconcierge'],
            ['https://kojima.genius/', 'kittycash'],
            ['http://naruto.ucoz.ru/', 'aweassist'],
        ])(
            'should visit correct new-webview deeplink for `%s` when app can not open in browser and its scheme is `%s`',
            (url, caseAppId) => {
                appId = caseAppId;
                const inst = new NativeFallbacks(mockedBridgeToAmInstance);

                inst.visitExternalResource(url);
                expect(mockedLocationReplace).toBeCalledWith(
                    `${appId}://webFeature?type=recommendation&url=${encodeURIComponent(url)}`,
                );
            },
        );

        it('should use forceOpenInWebview argument', () => {
            canOpenLinksInBrowser = true;

            const url = 'https://ya.ru/';
            const inst = new NativeFallbacks(mockedBridgeToAmInstance);

            inst.visitExternalResource(url, true);
            expect(mockedLocationReplace).toBeCalledWith(
                'alfabank://webFeature?type=recommendation&url=' + encodeURIComponent(url),
            );
        });
    });
});
