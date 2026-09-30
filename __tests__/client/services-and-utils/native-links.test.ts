import {
    prepareNativeDeeplinkUrl,
    prepareOpenInBrowserUrl,
    prepareOpenInNewWebviewDeeplink,
    preparePdfUrl,
} from '../../../src/client/services-and-utils/native-links';
import { type NativeAppTarget } from '../../../src/client/types';

const ANDROID: NativeAppTarget = { platform: 'android', appId: 'alfabank' };
const IOS: NativeAppTarget = { platform: 'ios', appId: 'aweassist' };

const UNSAFE_LINKS = [
    // eslint-disable-next-line no-script-url -- проверяем, что javascript:-схема отклоняется
    'javascript:alert(1)',
    'data:text/html,hello',
    'alfabank://webFeature',
    '/relative/path',
    'bad-url',
];

describe('native-links', () => {
    describe('prepareNativeDeeplinkUrl', () => {
        it.each([
            // Префиксы, которые отрезаются.
            ['alfabank:///dashboard/pfm', 'alfabank://pfm', 'aweassist://pfm?fromCurrent=true'],
            ['alfabank:///pfm', 'alfabank://pfm', 'aweassist://pfm?fromCurrent=true'],
            ['alfabank://pfm', 'alfabank://pfm', 'aweassist://pfm?fromCurrent=true'],
            ['/pfm', 'alfabank://pfm', 'aweassist://pfm?fromCurrent=true'],
            [
                'https://online.alfabank.ru/pfm',
                'alfabank://pfm',
                'aweassist://pfm?fromCurrent=true',
            ],
            ['pfm', 'alfabank://pfm', 'aweassist://pfm?fromCurrent=true'],
            ['alfabank:///', 'alfabank://', 'aweassist://?fromCurrent=true'],
            [
                'alfabank://sdui_screen?endpoint=v1',
                'alfabank://sdui_screen?endpoint=v1',
                'aweassist://sdui_screen?endpoint=v1&fromCurrent=true',
            ],
            [
                '/webFeature?type=recommendation&url=https%3A%2F%2Fya.ru%2F',
                'alfabank://webFeature?type=recommendation&url=https%3A%2F%2Fya.ru%2F',
                'aweassist://webFeature?type=recommendation&url=https%3A%2F%2Fya.ru%2F&fromCurrent=true',
            ],
            [
                'alfabank://pfm?fromCurrent=false',
                'alfabank://pfm?fromCurrent=false',
                'aweassist://pfm?fromCurrent=true',
            ],
            // Отрезается только один префикс, `dashboard/` без `alfabank:///` остаётся.
            [
                'alfabank://dashboard/pfm',
                'alfabank://dashboard/pfm',
                'aweassist://dashboard/pfm?fromCurrent=true',
            ],
            [
                '/dashboard/pfm',
                'alfabank://dashboard/pfm',
                'aweassist://dashboard/pfm?fromCurrent=true',
            ],
            ['//pfm', 'alfabank:///pfm', 'aweassist:///pfm?fromCurrent=true'],
            // Чужие схемы и хосты не трогаются.
            [
                'https://example.com/pfm',
                'alfabank://https://example.com/pfm',
                'aweassist://https://example.com/pfm?fromCurrent=true',
            ],
        ])('should prepare `%s`', (deeplink, expectedAndroid, expectedIos) => {
            expect(prepareNativeDeeplinkUrl(ANDROID, deeplink)).toBe(expectedAndroid);
            expect(prepareNativeDeeplinkUrl(IOS, deeplink)).toBe(expectedIos);
        });
    });

    describe('prepareOpenInNewWebviewDeeplink', () => {
        it.each([
            [
                'https://ya.ru',
                undefined,
                'webFeature?type=recommendation&url=https%3A%2F%2Fya.ru%2F',
            ],
            ['https://ya.ru', '', 'webFeature?type=recommendation&url=https%3A%2F%2Fya.ru%2F'],
            [
                'https://ya.ru/?a=1',
                'Custom Title',
                'webFeature?type=recommendation&url=https%3A%2F%2Fya.ru%2F%3Fa%3D1%26b2n-title%3DCustom%2BTitle',
            ],
            [
                'https://ya.ru/?b2n-title=Old',
                'New',
                'webFeature?type=recommendation&url=https%3A%2F%2Fya.ru%2F%3Fb2n-title%3DNew',
            ],
        ])('should prepare `%s` with title `%s`', (link, nativeTitle, expected) => {
            expect(prepareOpenInNewWebviewDeeplink(link, nativeTitle)).toBe(expected);
        });

        it.each(UNSAFE_LINKS)('should throw for `%s`', (link) => {
            expect(() => prepareOpenInNewWebviewDeeplink(link)).toThrow(`invalid url: ${link}`);
        });
    });

    describe('prepareOpenInBrowserUrl', () => {
        it.each([
            [ANDROID, 'https://ya.ru', true, 'https://ya.ru/?openInBrowser=true'],
            [IOS, 'https://ya.ru', true, 'https://ya.ru/?openInBrowser=true'],
            [ANDROID, 'https://ya.ru/?q=1', true, 'https://ya.ru/?q=1&openInBrowser=true'],
            [IOS, 'http://ya.ru/path', true, 'http://ya.ru/path?openInBrowser=true'],
            [
                ANDROID,
                'https://ya.ru',
                false,
                'alfabank://webFeature?type=recommendation&url=https%3A%2F%2Fya.ru%2F',
            ],
            [
                IOS,
                'https://ya.ru',
                false,
                'aweassist://webFeature?type=recommendation&url=https%3A%2F%2Fya.ru%2F&fromCurrent=true',
            ],
            [
                ANDROID,
                'https://ya.ru/?q=1',
                false,
                'alfabank://webFeature?type=recommendation&url=https%3A%2F%2Fya.ru%2F%3Fq%3D1',
            ],
        ])(
            'should prepare for %o link `%s` with `linksInBrowser=%s`',
            (target, link, linksInBrowser, expected) => {
                expect(prepareOpenInBrowserUrl(target, link, linksInBrowser)).toBe(expected);
            },
        );

        it.each(UNSAFE_LINKS.flatMap((link) => [true, false].map((flag) => [link, flag] as const)))(
            'should throw for `%s` with `linksInBrowser=%s`',
            (link, linksInBrowser) => {
                expect(() => prepareOpenInBrowserUrl(ANDROID, link, linksInBrowser)).toThrow(
                    `invalid url: ${link}`,
                );
            },
        );
    });

    describe('preparePdfUrl', () => {
        it.each([
            [
                IOS,
                'https://example.com/file.pdf',
                undefined,
                undefined,
                'aweassist:///dashboard/pdf_viewer?type=pdfFile&url=https%3A%2F%2Fexample.com%2Ffile.pdf&fromCurrent=true',
            ],
            [
                IOS,
                'https%3A%2F%2Fexample.com%2Ffile.pdf',
                'pdfFile',
                undefined,
                'aweassist:///dashboard/pdf_viewer?type=pdfFile&url=https%3A%2F%2Fexample.com%2Ffile.pdf&fromCurrent=true',
            ],
            [
                IOS,
                '/file.pdf',
                'binary',
                'Test Title',
                'aweassist:///dashboard/pdf_viewer?type=binary&url=%2Ffile.pdf&title=Test_Title&fromCurrent=true',
            ],
            [
                ANDROID,
                'https://example.com/file.pdf',
                'binary',
                'Test Title',
                'https://example.com/file.pdf',
            ],
            [ANDROID, '/file.pdf', undefined, undefined, '/file.pdf'],
        ] as const)('should prepare for %o pdf `%s`', (target, url, type, title, expected) => {
            expect(preparePdfUrl(target, url, type, title)).toBe(expected);
        });
    });
});
