import type { BridgeToNative } from '../src';
import { nativeFeaturesFromVersion } from '../src/constants';
import { NativeFallbacks } from '../src/native-fallbacks';
import { PdfType } from '../src/types';

let androidEnvFlag = false;
let iosAppId: string | undefined;
let linksInBrowserFeatureFlag = false;
let mockedHandleRedirect: any;
let mockedSetInitialView: any;

const mockedBridgeToAmInstance = {
    canUseNativeFeature() {
        return linksInBrowserFeatureFlag;
    },
    get environment() {
        return androidEnvFlag ? 'android' : 'ios';
    },
    get iosAppId() {
        return iosAppId;
    },
    get nativeNavigationAndTitle() {
        return { setInitialView: mockedSetInitialView, handleRedirect: mockedHandleRedirect };
    },
} as unknown as BridgeToNative;

jest.mock('../src', () => ({
    __esModule: true,
    BridgeToNative: function MockedBridgeToAmConstructor() {
        return mockedBridgeToAmInstance;
    },
}));

describe('AmFallbacks', () => {
    let mockedLocationReplace: any;
    let mockedWindowOpen: any;
    let windowSpy: any;

    beforeEach(() => {
        mockedLocationReplace = jest.fn();
        mockedWindowOpen = jest.fn();
        mockedSetInitialView = jest.fn();
        mockedHandleRedirect = jest.fn();
        windowSpy = jest.spyOn(window, 'window', 'get');

        windowSpy.mockImplementation(() => ({
            open: mockedWindowOpen,
            location: {
                replace: mockedLocationReplace,
            },
        }));
    });

    afterEach(() => {
        androidEnvFlag = false;
        iosAppId = undefined;
        linksInBrowserFeatureFlag = false;

        windowSpy.mockRestore();
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
                linksInBrowserFeatureFlag = true;

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

        it('should return href with link and onClick for android', () => {
            androidEnvFlag = true;

            const inst = new NativeFallbacks(mockedBridgeToAmInstance);

            expect(inst.getExternalLinkProps('https://ya.ru')).toHaveProperty(
                'href',
                'https://ya.ru/',
            );

            expect(typeof inst.getExternalLinkProps('https://ya.ru').onClick).toBe('function');
        });

        it.each([
            ['1.0.0', 'alfabank', 'https://ya.ru/'],
            ['12.0.0', 'alfabank', 'https://cats.ru/'],
            ['12.21.0', 'alfabank', 'http://downloadram.com/'],
            ['12.21.99', 'alfabank', 'https://cornhub.com/'],
            ['12.22.0', 'aconcierge', 'https://asino666.com/'],
            ['12.22.1', 'aconcierge', 'https://vk.ru/'],
            ['12.25.0', 'aconcierge', 'https://realcats.ru/'],
            ['12.25.99', 'aconcierge', 'https://anekdot.ru/'],
            ['12.26.0', 'kittycash', 'https://example.com/'],
            ['12.30.99', 'kittycash', 'https://kojima.genius/'],
            ['12.31.0', 'aweassist', 'https://kojima.genius/'],
            ['12.99.99', 'aweassist', 'http://naruto.ucoz.ru/'],
        ])(
            'should return right deeplink for version `%s`, app name `%s and url `%s`',
            (_, appId, url) => {
                iosAppId = appId;
                const inst = new NativeFallbacks(mockedBridgeToAmInstance);

                expect(inst.getExternalLinkProps(url)).toStrictEqual({
                    href: `${appId}://webFeature?type=recommendation&url=${encodeURIComponent(
                        url,
                    )}`,
                    onClick: undefined,
                });
            },
        );
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
            it.each(['alfabank', 'aconcierge', 'kittycash'])('%s-AM: with pdfUrl only', (appId) => {
                iosAppId = appId;
                const inst = new NativeFallbacks(mockedBridgeToAmInstance);

                inst.openPdf('https://my.pdf/location');
                expect(mockedWindowOpen).toBeCalledWith(
                    `${appId}:///dashboard/pdf_viewer?type=pdfFile&url=https%3A%2F%2Fmy.pdf%2Flocation`,
                );
            });

            it.each(['pdfFile', 'binary', 'base64'] as PdfType[])(
                'with pdfUrl, pdfType === `%s`',
                (pdfType) => {
                    const inst = new NativeFallbacks(mockedBridgeToAmInstance);

                    iosAppId = 'alfabank';

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
            linksInBrowserFeatureFlag = true;

            const inst = new NativeFallbacks(mockedBridgeToAmInstance);

            inst.visitExternalResource('https://ya.ru');
            expect(mockedLocationReplace).toBeCalledWith('https://ya.ru/?openInBrowser=true');

            inst.visitExternalResource('https://ya.ru/?otherQuery=whyNot');
            expect(mockedLocationReplace).toBeCalledWith(
                'https://ya.ru/?otherQuery=whyNot&openInBrowser=true',
            );
        });

        it('should visit link for android', () => {
            androidEnvFlag = true;

            const inst = new NativeFallbacks(mockedBridgeToAmInstance);

            inst.visitExternalResource('https://ya.ru/');
            expect(mockedLocationReplace).toBeCalledWith('https://ya.ru/');
            expect(mockedSetInitialView).toBeCalledWith('');
        });

        it.each([
            ['1.0.0', 'alfabank', 'https://ya.ru/'],
            ['12.0.0', 'alfabank', 'https://cats.ru/'],
            ['12.21.0', 'alfabank', 'http://downloadram.com/'],
            ['12.21.99', 'alfabank', 'https://cornhub.com/'],
            ['12.22.0', 'aconcierge', 'https://asino666.com/'],
            ['12.22.1', 'aconcierge', 'https://vk.ru/'],
            ['12.25.0', 'aconcierge', 'https://realcats.ru/'],
            ['12.25.99', 'aconcierge', 'https://anekdot.ru/'],
            ['12.26.0', 'kittycash', 'https://example.com/'],
            ['12.30.99', 'kittycash', 'https://kojima.genius/'],
            ['12.31.0', 'aweassist', 'https://kojima.genius/'],
            ['12.99.99', 'aweassist', 'http://naruto.ucoz.ru/'],
        ])(
            'should visit right deeplink for version `%s` while app name is `%s` and url is `%s`',
            (_, appId, url) => {
                iosAppId = appId;
                const inst = new NativeFallbacks(mockedBridgeToAmInstance);

                inst.visitExternalResource(url);
                expect(mockedLocationReplace).toBeCalledWith(
                    `${appId}://webFeature?type=recommendation&url=${encodeURIComponent(url)}`,
                );
            },
        );
    });
});
