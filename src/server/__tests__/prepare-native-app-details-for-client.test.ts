/* @jest-environment node */

import { prepareNativeAppDetailsForClient } from '../prepare-native-app-details-for-client';

// Закодированные разделители в JSON между ключём и значением.
const ENCODED_PARTS = {
    '":': '%22%3A', //  для значений типа number, boolean и т.п.
    '":"': '%22%3A%22', // для значений типа string
};

describe('prepareNativeAppDetailsForClient', () => {
    it('should not do anything if b2native cookie exists in request', () => {
        const mockedRequest = {
            headers: new Headers({
                Cookie: 'bridgeToNativeData=foobarbaz',
            }),
        } as Request;
        const setResonseHeader = jest.fn();

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).not.toBeCalled();
    });

    it('should set default theme to light if theme is not provided', () => {
        const mockedRequest = {
            url: 'http://example.com',
            headers: new Headers(),
        } as Request;
        const setResonseHeader = jest.fn();

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining(`theme${ENCODED_PARTS['":"']}light`),
        );
    });

    it('should set theme from query parameter', () => {
        const mockedRequest = {
            url: 'http://example.com?theme=dark',
            headers: new Headers(),
        } as Request;
        const setResonseHeader = jest.fn();

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining(`theme${ENCODED_PARTS['":"']}dark`),
        );
    });

    it('should set nextPageId from query parameter when greater than 1', () => {
        const mockedRequest = {
            url: 'http://example.com?b2n-next-page-id=2',
            headers: new Headers(),
        } as Request;
        const setResonseHeader = jest.fn();

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining(`nextPageId${ENCODED_PARTS['":']}2`),
        );
    });

    it('should ignore nextPageId when less than 2', () => {
        const mockedRequest = {
            url: 'http://example.com?b2n-next-page-id=1',
            headers: new Headers(),
        } as Request;
        const setResonseHeader = jest.fn();

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).not.toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining(`nextPageId`),
        );
    });

    it('should ignore nextPageId when its value is incorrect', () => {
        const mockedRequest = {
            url: 'http://example.com?b2n-next-page-id=foo',
            headers: new Headers(),
        } as Request;
        const setResonseHeader = jest.fn();

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).not.toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining(`nextPageId`),
        );
    });

    it('should set iosAppId from query parameter', () => {
        const mockedRequest = {
            url: 'http://example.com?applicationId=com.example.app',
            headers: new Headers(),
        } as Request;
        const setResonseHeader = jest.fn();

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining(`iosAppId${ENCODED_PARTS['":"']}example`),
        );
    });

    it('should not set iosAppId if query parameter does not match pattern', () => {
        const mockedRequest = {
            url: 'http://example.com?applicationId=invalid',
            headers: new Headers(),
        } as Request;
        const setResonseHeader = jest.fn();

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).not.toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining(`iosAppId`),
        );
    });

    it('should set appVersion from query parameter', () => {
        const mockedRequest = {
            url: 'http://example.com?device_app_version=1.2.3',
            headers: new Headers(),
        } as Request;
        const setResonseHeader = jest.fn();

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining(`appVersion${ENCODED_PARTS['":"']}1.2.3`),
        );
    });

    it('should set appVersion from header if query parameter is not provided', () => {
        const mockedRequest = {
            url: 'http://example.com',
            headers: new Headers({
                'app-version': '1.2.3',
            }),
        } as Request;
        const setResonseHeader = jest.fn();

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining(`appVersion${ENCODED_PARTS['":"']}1.2.3`),
        );
    });

    it('should set default appVersion if neither query parameter nor header is provided', () => {
        const mockedRequest = {
            url: 'http://example.com',
            headers: new Headers(),
        } as Request;
        const setResonseHeader = jest.fn();

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining(`appVersion${ENCODED_PARTS['":"']}0.0.0`),
        );
    });

    it('should set title from query parameter', () => {
        const mockedRequest = {
            url: 'http://example.com?b2n-title=Example%20Title',
            headers: new Headers(),
        } as Request;
        const setResonseHeader = jest.fn();

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining(`title${ENCODED_PARTS['":"']}Example%20Title`),
        );
    });

    it('should set title from deprecated query parameter if b2n-title is not provided', () => {
        const mockedRequest = {
            url: 'http://example.com?title=Example%20Title',
            headers: new Headers(),
        } as Request;
        const setResonseHeader = jest.fn();

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining(`title${ENCODED_PARTS['":"']}Example%20Title`),
        );
    });

    it('should not set title by default', () => {
        const mockedRequest = {
            url: 'http://example.com',
            headers: new Headers(),
        } as Request;
        const setResonseHeader = jest.fn();

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).not.toBeCalledWith('Set-Cookie', expect.stringContaining(`title`));
    });
});
