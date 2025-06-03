/* @jest-environment node */

import { type IncomingMessage } from 'http';
import { getHeaderValue, getQueryValues, hasBridgeToNativeDataCookie } from '../utils';

describe('getHeaderValue', () => {
    describe('IncomingMessage requests', () => {
        it('should return header value', () => {
            const request = {
                headers: {
                    'content-type': 'application/json',
                },
            } as IncomingMessage;

            expect(getHeaderValue(request, 'content-type')).toBe('application/json');
        });

        it('should return null when header is not found', () => {
            const request = {
                headers: {},
            } as IncomingMessage;

            expect(getHeaderValue(request, 'non-existent')).toBeNull();
        });
    });

    describe('Web API requests', () => {
        it('should return header value', () => {
            const headers = new Headers({
                'content-type': 'application/json',
            });

            const request = {
                headers,
            } as Request;

            expect(getHeaderValue(request, 'content-type')).toBe('application/json');
        });

        it('should return null when header is not found', () => {
            const headers = new Headers();

            const request = {
                headers,
            } as Request;

            expect(getHeaderValue(request, 'non-existent')).toBeNull();
        });
    });
});

describe('getQueryValues', () => {
    it('should return existing parameters', () => {
        const mockRequest = { url: 'http://test.com/?name=John&age=25' } as Request;

        expect(getQueryValues(mockRequest, 'name')).toBe('John');
        expect(getQueryValues(mockRequest, 'age')).toBe('25');
    });

    it('should return null for non-existent parameter', () => {
        const mockRequest = { url: 'http://test.com/?name=John&age=25' } as Request;

        expect(getQueryValues(mockRequest, 'gender')).toBeNull();
    });

    it('should correctly handle encoded values', () => {
        const mockRequest = {
            url: 'http://test.com/?greet=%D0%94%D0%BE%D0%B1%D1%80%D0%B5%D0%B9%D1%88%D0%B5%D0%B3%D0%BE%20%D0%B2%D0%B5%D1%87%D0%B5%D1%80%D0%BE%D1%87%D0%BA%D0%B0',
        } as Request;

        expect(getQueryValues(mockRequest, 'greet')).toBe('Добрейшего вечерочка');
    });

    it('should return array of values for multiple keys', () => {
        const mockRequest = { url: 'http://test.com/?name=John&age=25' } as Request;
        expect(getQueryValues(mockRequest, ['name', 'age'])).toEqual(['John', '25']);
    });

    it('should return nulls for non-existent keys in array', () => {
        const mockRequest = { url: 'http://test.com/?a=1&c=3' } as Request;
        expect(getQueryValues(mockRequest, ['a', 'b', 'c'])).toEqual(['1', null, '3']);
    });

    it('should return null when no query params', () => {
        const mockRequest = { url: 'http://test.com/' } as Request;
        expect(getQueryValues(mockRequest, 'any')).toBeNull();
        expect(getQueryValues(mockRequest, ['any', 'some'])).toEqual([null, null]);
    });

    it('should handle encoded values in array query', () => {
        const mockRequest = {
            url: 'http://test.com/?greet=%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82&farewell=%D0%94%D0%BE%20%D1%81%D0%B2%D0%B8%D0%B4%D0%B0%D0%BD%D0%B8%D1%8F',
        } as Request;

        expect(getQueryValues(mockRequest, ['greet', 'farewell'])).toEqual([
            'Привет',
            'До свидания',
        ]);
    });

    it('should handle malformed URL', () => {
        const mockRequest = { url: 'invalid-url' } as Request;
        expect(getQueryValues(mockRequest, 'key')).toBeNull();
        expect(getQueryValues(mockRequest, ['key'])).toEqual([null]);
    });
});

describe('hasBridgeToNativeDataCookie', () => {
    it('should return false while there is no cookie', () => {
        const mockRequest = { headers: new Headers({}) } as Request;
        expect(hasBridgeToNativeDataCookie(mockRequest)).toBe(false);
    });

    it('should return false while there is no desired cookie', () => {
        const mockRequest = {
            headers: new Headers({ Cookie: 'anotherCookie=value' }),
        } as Request;
        expect(hasBridgeToNativeDataCookie(mockRequest)).toBe(false);
    });

    it('should return true while desired cookie is found', () => {
        const mockRequest = {
            headers: new Headers({ Cookie: `bridgeToNativeData=value` }),
        } as Request;
        expect(hasBridgeToNativeDataCookie(mockRequest)).toBe(true);
    });

    it('should return true while desired cookie is found among others', () => {
        const mockRequest = {
            headers: new Headers({
                Cookie: `anotherCookie=value; bridgeToNativeData=value`,
            }),
        } as Request;
        expect(hasBridgeToNativeDataCookie(mockRequest)).toBe(true);
    });
});
