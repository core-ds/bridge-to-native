import {
    appendFromCurrentQueryParamForIos,
    closeWebviewUtil,
    validateUrl,
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

describe('validateUrl', () => {
    it.each(['https://example.com/path', 'http://example.com/path'])(
        'should return URL for valid link `%s`',
        (link) => {
            expect(validateUrl(link)).toEqual(new URL(link));
        },
    );

    it('should return URL for valid URL instance', () => {
        const link = new URL('https://example.com/path');

        expect(validateUrl(link)).toEqual(link);
        expect(validateUrl(link)).not.toBe(link);
    });

    it('should return null and call logError for invalid link', () => {
        const logError = jest.fn();
        const result = validateUrl('bad-url111', logError);

        expect(result).toBeNull();
        expect(logError).toHaveBeenCalled();
    });

    it.each([
        // eslint-disable-next-line no-script-url -- проверяем, что javascript:-схема отклоняется
        'javascript:alert(1)',
        'data:text/html,hello',
        'file:///etc/passwd',
        'vbscript:msgbox(1)',
        'blob:https://example.com/uuid',
        'ftp://example.com/file',
        'http://user:pass@example.com',
        'https://user@example.com',
        // eslint-disable-next-line no-script-url -- проверяем, что javascript:-схема отклоняется
        new URL('javascript:void(0)'),
    ])('should return null and call logError for unsafe link `%s`', (link) => {
        const logError = jest.fn();
        const result = validateUrl(link, logError);

        expect(result).toBeNull();
        expect(logError).toHaveBeenCalled();
    });
});
