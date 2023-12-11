import {
    extractAppNameRouteAndQuery,
    getUrlInstance,
    isValidVersionFormat,
} from '../src/utils';

describe('extractAppNameRouteAndQuery', () => {
    it('should extract app-name without path and query', () => {
        expect(extractAppNameRouteAndQuery('app-name')).toEqual({
            appName: 'app-name',
            path: '',
            query: undefined,
        });
    });

    it('should extract app-name and path without query', () => {
        expect(extractAppNameRouteAndQuery('app-name/main-path/sub-path')).toEqual({
            appName: 'app-name',
            path: 'main-path/sub-path',
            query: undefined,
        });
    });

    it('should extract app-name and query without path', () => {
        expect(extractAppNameRouteAndQuery('/app-name?query=qwe&test=ddos')).toEqual({
            appName: 'app-name',
            path: '',
            query: {
                query: 'qwe',
                test: 'ddos',
            },
        });
    });

    it('should extract app-name and path and query', () => {
        expect(
            extractAppNameRouteAndQuery(
                '/app-name/main-path/sub-path/sup-path?query=qwe&test=ddos',
            ),
        ).toEqual({
            appName: 'app-name',
            path: 'main-path/sub-path/sup-path',
            query: {
                query: 'qwe',
                test: 'ddos',
            },
        });
    });
});

describe('getUrlInstance', () => {
    it('should convert relative links to absolute', () => {
        const url = getUrlInstance('ya.ru');

        expect(url.href).toBe('https://ya.ru/');
    });

    it('should not convert links with http protocol', () => {
        const url = getUrlInstance('http://ya.ru');

        expect(url.href).toBe('http://ya.ru/');
    });
});

describe('isValidVersionFormat', () => {
    it.each([
        ['0.1.2', true],
        ['0.1.2.', false],
        ['0.1.2.3', false],
        ['0.1.', false],
        ['0.1', false],
        ['1.2.3', true],
        ['11.12.13', true],
        ['12.1.12', true],
        ['111.22.3', true],
        ['3.44.555', true],
        ['6666.7777.8888', true],
        ['hello', false],
        ['10.infinity.1', false],
    ])('should check version `%s` and return `%s`', (version, result) => {
        expect(isValidVersionFormat(version)).toBe(result);
    });
});
