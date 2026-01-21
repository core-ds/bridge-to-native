import { prepareNativeAppDetailsForClient } from '../../src/server/prepare-native-app-details-for-client';

// Закодированные разделители в JSON между ключём и значением.
const ENCODED_PARTS = {
    '":': '%22%3A', // для значений типа number, boolean и т.п.
    '":"': '%22%3A%22', // для значений типа string
    '":""': '%22%3A%22', // для значений === пустая строка
};

describe('prepareNativeAppDetailsForClient', () => {
    let setResonseHeader: ReturnType<typeof jest.fn>;

    beforeEach(() => {
        setResonseHeader = jest.fn();
    });

    it('should not do anything if b2native cookie exists in request and themes are the same', () => {
        const mockedRequest = {
            headers: new Headers({
                Cookie: 'bridgeToNativeData={"theme":"light"}',
            }),
            url: 'http://example.com?theme=light',
        } as Request;

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).not.toBeCalled();
    });

    it('should overwrite cookie if b2native cookie exists in request but themes are different', () => {
        const mockedRequest = {
            headers: new Headers({
                Cookie: 'bridgeToNativeData={"theme":"dark"}',
            }),
            url: 'http://example.com?theme=light',
        } as Request;

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).toBeCalled();
    });

    it('should set default theme to light if theme is not provided', () => {
        const mockedRequest = {
            url: 'http://example.com',
            headers: new Headers(),
        } as Request;

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

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).not.toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining('nextPageId'),
        );
    });

    it('should ignore nextPageId when its value is incorrect', () => {
        const mockedRequest = {
            url: 'http://example.com?b2n-next-page-id=foo',
            headers: new Headers(),
        } as Request;

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).not.toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining('nextPageId'),
        );
    });

    it('should set iosAppId from query parameter', () => {
        const mockedRequest = {
            url: 'http://example.com?applicationId=com.example.app',
            headers: new Headers(),
        } as Request;

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

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).not.toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining('iosAppId'),
        );
    });

    it('should set appVersion from query parameter', () => {
        const mockedRequest = {
            url: 'http://example.com?device_app_version=1.2.3',
            headers: new Headers(),
        } as Request;

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining(`appVersion${ENCODED_PARTS['":"']}1.2.3`),
        );
    });

    it('should not set appVersion from query parameter while value is invalid', () => {
        const mockedRequest = {
            url: 'http://example.com?device_app_version=1.foo.3',
            headers: new Headers(),
        } as Request;

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).not.toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining(`appVersion${ENCODED_PARTS['":"']}1.foo.3`),
        );
    });

    it('should set appVersion from header if query parameter is not provided', () => {
        const mockedRequest = {
            url: 'http://example.com',
            headers: new Headers({
                'app-version': '1.2.3',
            }),
        } as Request;

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining(`appVersion${ENCODED_PARTS['":"']}1.2.3`),
        );
    });

    it('should not set appVersion from header if its value is invalid', () => {
        const mockedRequest = {
            url: 'http://example.com',
            headers: new Headers({
                'app-version': '1.foo.3',
            }),
        } as Request;

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).not.toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining(`appVersion${ENCODED_PARTS['":"']}1.foo.3`),
        );
    });

    it('should set default appVersion if neither query parameter nor header is provided', () => {
        const mockedRequest = {
            url: 'http://example.com',
            headers: new Headers(),
        } as Request;

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

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining(`title${ENCODED_PARTS['":"']}Example%20Title`),
        );
    });

    it('should set empty title from query parameter', () => {
        const mockedRequest = {
            url: 'http://example.com?b2n-title=',
            headers: new Headers(),
        } as Request;

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining(`title${ENCODED_PARTS['":""']}`),
        );

        const mockedRequest2 = {
            url: 'http://example.com?b2n-title=&another-param=foo',
            headers: new Headers(),
        } as Request;

        prepareNativeAppDetailsForClient(mockedRequest2, setResonseHeader);

        expect(setResonseHeader).toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining(`title${ENCODED_PARTS['":""']}`),
        );
    });

    it('should set title from deprecated query parameter if b2n-title is not provided', () => {
        const mockedRequest = {
            url: 'http://example.com?title=Example%20Title',
            headers: new Headers(),
        } as Request;

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining(`title${ENCODED_PARTS['":"']}Example%20Title`),
        );
    });

    it('should set empty title from deprecated query parameter if b2n-title is not provided', () => {
        const mockedRequest = {
            url: 'http://example.com?title=',
            headers: new Headers(),
        } as Request;

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining(`title${ENCODED_PARTS['":""']}`),
        );

        const mockedRequest2 = {
            url: 'http://example.com?title=&another-param=foo',
            headers: new Headers(),
        } as Request;

        prepareNativeAppDetailsForClient(mockedRequest2, setResonseHeader);

        expect(setResonseHeader).toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining(`title${ENCODED_PARTS['":""']}`),
        );
    });

    it('should not set title by default', () => {
        const mockedRequest = {
            url: 'http://example.com',
            headers: new Headers(),
        } as Request;

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).not.toBeCalledWith('Set-Cookie', expect.stringContaining('title'));
    });

    it('should set webviewLaunchTime from header', () => {
        const mockedRequest = {
            url: 'http://example.com',
            headers: new Headers({
                'webview-launch-time': '1764597923000',
            }),
        } as Request;

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining(`webviewLaunchTime${ENCODED_PARTS['":']}1764597923000`),
        );
    });

    it('should not set webviewLaunchTime from header if its value is invalid', () => {
        const mockedRequest = {
            url: 'http://example.com',
            headers: new Headers({
                'webview-launch-time': 'null',
            }),
        } as Request;

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).not.toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining('webviewLaunchTime'),
        );
    });

    it('should not set webviewLaunchTime if this header is not set', () => {
        const mockedRequest = {
            url: 'http://example.com',
            headers: new Headers(),
        } as Request;

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).not.toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining('webviewLaunchTime'),
        );
    });

    it('should set originalWebviewParams', () => {
        const webviewParams =
            'client_id=mobile-app&device_uuid=2E32AFD5-F50B-4B2F-B758-CAE59DF2BF6C';

        const mockedRequest = {
            url: `http://example.com?${webviewParams}`,
            headers: new Headers(),
        } as Request;

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        const encodedWebviewParams = encodeURIComponent(webviewParams);

        expect(setResonseHeader).toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining(
                `originalWebviewParams${ENCODED_PARTS['":"'] + encodedWebviewParams}`,
            ),
        );
    });

    it("should skip updating bridgeToNativeData cookie and remove bridgeToNativeReload cookie if it's provided", () => {
        const mockedRequest = {
            url: 'http://example.com?theme=dark',
            headers: new Headers({
                Cookie: 'bridgeToNativeReload=true; bridgeToNativeData={"theme":"light"}',
            }),
        } as Request;

        prepareNativeAppDetailsForClient(mockedRequest, setResonseHeader);

        expect(setResonseHeader).not.toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining('bridgeToNativeData='),
        );

        expect(setResonseHeader).toBeCalledWith(
            'Set-Cookie',
            expect.stringContaining('bridgeToNativeReload=false; Max-Age=0; Path=/'),
        );
    });
});
