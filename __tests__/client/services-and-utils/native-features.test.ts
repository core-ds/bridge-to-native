import {
    canUseNativeFeature,
    isValidVersionFormat,
    isVersionHigherOrEqual,
} from '../../../src/client/services-and-utils/native-features';

describe('native-features', () => {
    describe('isValidVersionFormat', () => {
        it.each([
            ['1.2.3', true],
            ['12.30.0', true],
            ['1.2', false],
            ['1.2.3.4', false],
            ['v1.2.3', false],
            ['', false],
            [undefined, false],
        ])('should return for `%s` → `%s`', (version, expected) => {
            expect(isValidVersionFormat(version)).toBe(expected);
        });
    });

    describe('isVersionHigherOrEqual', () => {
        it.each([
            ['1.2.3', '1.2.3', true],
            ['1.2.4', '1.2.3', true],
            ['1.2.3', '1.2.4', false],
            ['2.0.0', '1.99.99', true],
            // Компоненты с разным числом цифр сравниваются как числа, а не как строки.
            ['12.4.0', '12.30.0', false],
            ['12.30.0', '12.4.0', true],
            ['9.0.0', '11.71.0', false],
            ['10.0.0', '9.9.9', true],
            ['13.10.0', '13.3.0', true],
            ['1.2.10', '1.2.9', true],
            // Невалидный формат.
            ['1.2', '0.0.0', false],
            ['1.2.3', 'unknown', false],
        ])('should compare `%s` with `%s` → `%s`', (version, versionToCompare, expected) => {
            expect(isVersionHigherOrEqual(version, versionToCompare)).toBe(expected);
        });
    });

    describe('canUseNativeFeature', () => {
        it.each([
            ['android', '11.70.99', 'linksInBrowser', false],
            ['android', '11.71.0', 'linksInBrowser', true],
            ['android', '9.0.0', 'linksInBrowser', false],
            ['android', '12.4.0', 'savedBackStack', false],
            ['android', '12.29.99', 'savedBackStack', false],
            ['android', '12.30.0', 'savedBackStack', true],
            ['android', '11.71.0', 'geolocation', true],
            ['android', 'unknown', 'linksInBrowser', false],
            ['ios', '13.2.99', 'linksInBrowser', false],
            ['ios', '13.3.0', 'linksInBrowser', true],
            ['ios', '13.10.0', 'linksInBrowser', true],
            ['ios', '0.0.0', 'savedBackStack', true],
            ['ios', 'unknown', 'savedBackStack', true],
            ['ios', 'unknown', 'linksInBrowser', false],
        ] as const)(
            'should return for %s `%s` feature `%s` → `%s`',
            (platform, appVersion, feature, expected) => {
                expect(canUseNativeFeature(platform, appVersion, feature)).toBe(expected);
            },
        );
    });
});
