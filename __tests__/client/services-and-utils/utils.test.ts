import {
    appendFromCurrentQueryParamForIos,
    closeWebviewUtil,
} from '../../../src/client/services-and-utils/utils';

describe('closeWebviewUtil', () => {
    it('should modify URL correctly', () => {
        const originalWindow = window;
        const testUrl = 'http://example.com';

        // eslint-disable-next-line no-global-assign
        window = Object.create(window);
        Object.defineProperty(window, 'location', {
            value: {
                href: testUrl,
            },
            writable: true,
        });

        closeWebviewUtil();
        expect(window.location.href).toBe(`${testUrl}/?closeWebView=true`);

        // eslint-disable-next-line no-global-assign
        window = originalWindow;
    });
});

describe('appendFromCurrentQueryParamForIos', () => {
    it('should append `fromCurrent=true` when query is absent', () => {
        expect(appendFromCurrentQueryParamForIos('alfabank://deeplink_template')).toBe(
            'alfabank://deeplink_template?fromCurrent=true',
        );
    });

    it('should append `fromCurrent=true` when query exists', () => {
        expect(
            appendFromCurrentQueryParamForIos(
                'alfabank://webFeature?type=recommendation&url=https%3A%2F%2Ftemplate.app',
            ),
        ).toBe(
            'alfabank://webFeature?type=recommendation&url=https%3A%2F%2Ftemplate.app&fromCurrent=true',
        );
    });

    it('should overwrite existing `fromCurrent`', () => {
        expect(
            appendFromCurrentQueryParamForIos('alfabank://webFeature?type=x&fromCurrent=false'),
        ).toBe('alfabank://webFeature?type=x&fromCurrent=true');
    });
});
