/* eslint-disable @typescript-eslint/dot-notation -- отключено, чтобы можно было обращаться к приватным полям для их тестирования */

import { BridgeToNative } from '../src';

describe('BridgeToNative integration testing', () => {
    const defaultAmFeaturesFts = {
        linksInBrowserAndroid: true,
        linksInBrowserIos: true,
    };

    const defaultAmParams = {
        appVersion: '12.0.0',
        theme: 'light',
        originalWebviewParams: '',
        nextPageId: null,
    };

    const mockedHandleRedirect = jest.fn();
    const mockedLocationReplace = jest.fn();
    const mockedSetPageSettings = jest.fn();
    let androidEnvFlag = false;
    let emulateAmBackButtonTap: any;
    let windowSpy: any;

    beforeEach(() => {
        let emulatePopStateHandler: any;

        windowSpy = jest.spyOn(window, 'window', 'get');

        windowSpy.mockImplementation(() => ({
            addEventListener: jest.fn((_: 'popstate', handler: () => void) => {
                const asyncHandler = () => process.nextTick(handler);

                emulateAmBackButtonTap = asyncHandler;
                emulatePopStateHandler = asyncHandler;
            }),
            history: { go: emulatePopStateHandler },
            location: { replace: mockedLocationReplace },
            removeEventListener: jest.fn(),
            ...(androidEnvFlag && {
                Android: {
                    setPageSettings: mockedSetPageSettings,
                },
            }),
        }));
    });

    afterEach(() => {
        androidEnvFlag = false;
        windowSpy.mockRestore();
        jest.resetAllMocks();
    });

    describe('Android environment', () => {
        beforeEach(() => {
            androidEnvFlag = true;
        });

        it('should use AM interface correctly when moving forward and then backward', async () => {
            const inst = new BridgeToNative(defaultAmFeaturesFts, mockedHandleRedirect, {
                ...defaultAmParams,
                title: 'Initial Title',
            });
            const mockedCloseWebview = jest.fn();

            inst.closeWebview = mockedCloseWebview;

            expect(mockedSetPageSettings).toBeCalledTimes(1);
            expect(mockedSetPageSettings).toBeCalledWith(
                '{"pageTitle":"Initial Title","pageId":1}',
            );

            inst.nativeNavigationAndTitle.handleRedirect('Title 2', 'test-app');
            expect(mockedSetPageSettings).toBeCalledTimes(2);
            expect(mockedSetPageSettings).toBeCalledWith('{"pageTitle":"Title 2","pageId":2}');

            inst.nativeNavigationAndTitle.setTitle('Changed Title 2');
            expect(mockedSetPageSettings).toBeCalledTimes(3);
            expect(mockedSetPageSettings).toBeCalledWith(
                '{"pageTitle":"Changed Title 2","pageId":2}',
            );

            inst.nativeNavigationAndTitle.handleRedirect('', 'test-app', 'some-path');
            expect(mockedSetPageSettings).toBeCalledTimes(4);
            expect(mockedSetPageSettings).toBeCalledWith('{"pageTitle":"","pageId":3}');

            inst.nativeNavigationAndTitle.handleRedirect('/test-app/some-path');
            expect(mockedSetPageSettings).toBeCalledTimes(5);
            expect(mockedSetPageSettings).toBeCalledWith('{"pageTitle":"","pageId":4}');

            emulateAmBackButtonTap();
            await new Promise(process.nextTick);
            expect(mockedSetPageSettings).toBeCalledTimes(6);
            expect(mockedSetPageSettings).toBeCalledWith('{"pageTitle":"","pageId":3}');

            emulateAmBackButtonTap();
            await new Promise(process.nextTick);
            expect(mockedSetPageSettings).toBeCalledTimes(7);
            expect(mockedSetPageSettings).toBeCalledWith(
                '{"pageTitle":"Changed Title 2","pageId":2}',
            );

            emulateAmBackButtonTap();
            await new Promise(process.nextTick);
            expect(mockedSetPageSettings).toBeCalledTimes(8);
            expect(mockedSetPageSettings).toBeCalledWith(
                '{"pageTitle":"Initial Title","pageId":1}',
            );

            expect(mockedCloseWebview).not.toBeCalled();
            emulateAmBackButtonTap();
            await new Promise(process.nextTick);
            expect(mockedSetPageSettings).toBeCalledTimes(8);
            expect(mockedCloseWebview).toBeCalled();
        });

        it('should act and use AM interface correctly when using `goBackAFewSteps`', async () => {
            const inst = new BridgeToNative(
                defaultAmFeaturesFts,
                mockedHandleRedirect,
                defaultAmParams,
            );
            const mockedCloseWebview = jest.fn();

            inst.closeWebview = mockedCloseWebview;

            inst.nativeNavigationAndTitle.handleRedirect('Title 2', 'test-app');
            inst.nativeNavigationAndTitle.handleRedirect('Title 3', 'test-app');
            inst.nativeNavigationAndTitle.handleRedirect('Title 4', 'test-app');
            inst.nativeNavigationAndTitle.handleRedirect('Title 5', 'test-app');
            expect(mockedSetPageSettings).toBeCalledTimes(5);

            inst.nativeNavigationAndTitle.goBackAFewSteps(3);
            await new Promise(process.nextTick);

            expect(mockedSetPageSettings).toBeCalledTimes(6);
            expect(mockedSetPageSettings).toBeCalledWith('{"pageTitle":"Title 2","pageId":2}');

            emulateAmBackButtonTap();
            await new Promise(process.nextTick);
            expect(mockedSetPageSettings).toBeCalledTimes(7);
            expect(mockedSetPageSettings).toBeCalledWith('{"pageTitle":"","pageId":1}');

            expect(mockedCloseWebview).not.toBeCalled();
            emulateAmBackButtonTap();
            await new Promise(process.nextTick);
            expect(mockedSetPageSettings).toBeCalledTimes(7);
            expect(mockedCloseWebview).toBeCalled();
        });

        it('should act and use AM interface correctly when using `setInitialView`', async () => {
            const inst = new BridgeToNative(
                defaultAmFeaturesFts,
                mockedHandleRedirect,
                defaultAmParams,
            );
            const mockedCloseWebview = jest.fn();

            inst.closeWebview = mockedCloseWebview;

            inst.nativeNavigationAndTitle.handleRedirect('Title 2', 'test-app');
            inst.nativeNavigationAndTitle.handleRedirect('Title 3', 'test-app');
            inst.nativeNavigationAndTitle.handleRedirect('Title 4', 'test-app');
            inst.nativeNavigationAndTitle.handleRedirect('Title 5', 'test-app');

            inst.nativeNavigationAndTitle.setInitialView('New Title After Reset');
            expect(mockedSetPageSettings).toBeCalledTimes(6);
            expect(mockedSetPageSettings).toBeCalledWith(
                '{"pageTitle":"New Title After Reset","pageId":1}',
            );

            expect(mockedCloseWebview).not.toBeCalled();
            emulateAmBackButtonTap();
            await new Promise(process.nextTick);
            expect(mockedSetPageSettings).toBeCalledTimes(6);
            expect(mockedCloseWebview).toBeCalled();
        });
    });

    describe('iOS environment', () => {
        it('should use AM interface correctly when moving forward and then backward', async () => {
            const inst = new BridgeToNative(defaultAmFeaturesFts, mockedHandleRedirect, {
                ...defaultAmParams,
                title: 'Initial Title',
            });
            const mockedCloseWebview = jest.fn();

            inst.closeWebview = mockedCloseWebview;

            expect(mockedLocationReplace).toBeCalledTimes(1);
            expect(mockedLocationReplace).toBeCalledWith(
                `ios:setPageSettings/?pageTitle=${encodeURIComponent('Initial Title')}`,
            );

            inst.nativeNavigationAndTitle.handleRedirect('Title 2', 'test-app');
            expect(mockedLocationReplace).toBeCalledTimes(2);
            expect(mockedLocationReplace).toBeCalledWith(
                `ios:setPageSettings/?pageTitle=${encodeURIComponent('Title 2')}&pageId=2`,
            );

            inst.nativeNavigationAndTitle.setTitle('Changed Title 2');
            expect(mockedLocationReplace).toBeCalledTimes(3);
            expect(mockedLocationReplace).toBeCalledWith(
                `ios:setPageSettings/?pageTitle=${encodeURIComponent('Changed Title 2')}&pageId=2`,
            );

            inst.nativeNavigationAndTitle.handleRedirect('', 'test-app', 'some-path');
            expect(mockedLocationReplace).toBeCalledTimes(4);
            expect(mockedLocationReplace).toBeCalledWith(
                'ios:setPageSettings/?pageTitle=&pageId=3',
            );

            inst.nativeNavigationAndTitle.handleRedirect('/test-app/some-path');
            expect(mockedLocationReplace).toBeCalledTimes(5);
            expect(mockedLocationReplace).toBeCalledWith(
                'ios:setPageSettings/?pageTitle=&pageId=4',
            );

            emulateAmBackButtonTap();
            await new Promise(process.nextTick);
            expect(mockedLocationReplace).toBeCalledTimes(6);
            expect(mockedLocationReplace).toBeCalledWith(
                'ios:setPageSettings/?pageTitle=&pageId=3',
            );

            emulateAmBackButtonTap();
            await new Promise(process.nextTick);
            expect(mockedLocationReplace).toBeCalledTimes(7);
            expect(mockedLocationReplace).toBeCalledWith(
                `ios:setPageSettings/?pageTitle=${encodeURIComponent('Changed Title 2')}&pageId=2`,
            );

            emulateAmBackButtonTap();
            await new Promise(process.nextTick);
            expect(mockedLocationReplace).toBeCalledTimes(8);
            expect(mockedLocationReplace).toBeCalledWith(
                `ios:setPageSettings/?pageTitle=${encodeURIComponent('Initial Title')}`,
            );

            expect(mockedCloseWebview).not.toBeCalled();
            emulateAmBackButtonTap();
            await new Promise(process.nextTick);
            expect(mockedLocationReplace).toBeCalledTimes(8);
            expect(mockedCloseWebview).toBeCalled();
        });

        it('should act and use AM interface correctly when using `goBackAFewSteps`', async () => {
            const inst = new BridgeToNative(
                defaultAmFeaturesFts,
                mockedHandleRedirect,
                defaultAmParams,
            );
            const mockedCloseWebview = jest.fn();

            inst.closeWebview = mockedCloseWebview;

            inst.nativeNavigationAndTitle.handleRedirect('Title 2', 'test-app');
            inst.nativeNavigationAndTitle.handleRedirect('Title 3', 'test-app');
            inst.nativeNavigationAndTitle.handleRedirect('Title 4', 'test-app');
            inst.nativeNavigationAndTitle.handleRedirect('Title 5', 'test-app');
            expect(mockedLocationReplace).toBeCalledTimes(5);

            inst.nativeNavigationAndTitle.goBackAFewSteps(3);
            await new Promise(process.nextTick);

            expect(mockedLocationReplace).toBeCalledTimes(6);
            expect(mockedLocationReplace).toBeCalledWith(
                `ios:setPageSettings/?pageTitle=${encodeURIComponent('Title 2')}&pageId=2`,
            );

            emulateAmBackButtonTap();
            await new Promise(process.nextTick);
            expect(mockedLocationReplace).toBeCalledTimes(7);
            expect(mockedLocationReplace).toBeCalledWith('ios:setPageSettings/?pageTitle=');

            expect(mockedCloseWebview).not.toBeCalled();
            emulateAmBackButtonTap();
            await new Promise(process.nextTick);
            expect(mockedLocationReplace).toBeCalledTimes(7);
            expect(mockedCloseWebview).toBeCalled();
        });

        it('should act and use AM interface correctly when using `setInitialView`', async () => {
            const inst = new BridgeToNative(
                defaultAmFeaturesFts,
                mockedHandleRedirect,
                defaultAmParams,
            );
            const mockedCloseWebview = jest.fn();

            inst.closeWebview = mockedCloseWebview;

            inst.nativeNavigationAndTitle.handleRedirect('Title 2', 'test-app');
            inst.nativeNavigationAndTitle.handleRedirect('Title 3', 'test-app');
            inst.nativeNavigationAndTitle.handleRedirect('Title 4', 'test-app');
            inst.nativeNavigationAndTitle.handleRedirect('Title 5', 'test-app');

            inst.nativeNavigationAndTitle.setInitialView('New Title After Reset');
            expect(mockedLocationReplace).toBeCalledTimes(6);
            expect(mockedLocationReplace).toBeCalledWith(
                `ios:setPageSettings/?pageTitle=${encodeURIComponent('New Title After Reset')}`,
            );

            expect(mockedCloseWebview).not.toBeCalled();
            emulateAmBackButtonTap();
            await new Promise(process.nextTick);
            expect(mockedLocationReplace).toBeCalledTimes(6);
            expect(mockedCloseWebview).toBeCalled();
        });
    });
});
