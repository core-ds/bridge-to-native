import { BridgeToNative } from '../../src/client/bridge-to-native';
import { COOKIE_KEY_BRIDGE_TO_NATIVE_DATA } from '../../src/query-and-headers-keys';

const mockedCloseWebviewUtil = jest.fn();

jest.mock('../../src/client/services-and-utils/close-webview-util', () => ({
    __esModule: true,
    get closeWebviewUtil() {
        return mockedCloseWebviewUtil;
    },
}));

describe('BridgeToNative client-side navigation integration testing', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    const historyGoSpy = jest.spyOn(window.history, 'go');
    const locationReplaceSpy = jest.spyOn(window.location, 'replace');

    jest.spyOn(window.history, 'pushState');

    let emulateAmBackButtonTap: () => void;
    let emulatePopStateHandler: () => void;

    beforeAll(() => {
        addEventListenerSpy.mockImplementation((_, handler) => {
            // eslint-disable-next-line @typescript-eslint/ban-types -- это моки, каст к Function 👌
            const asyncHandler = () => process.nextTick(handler as Function);

            emulateAmBackButtonTap = asyncHandler;
            emulatePopStateHandler = asyncHandler;
        });

        historyGoSpy.mockImplementation(() => emulatePopStateHandler());
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Android environment', () => {
        const mockedSetPageSettings = jest.fn();
        const mockedNativeData = {
            appId: 'alfabank',
            appVersion: '1.0.0',
            environment: 'android',
            nativeParamsReadErrorFlag: false,
            originalWebviewParams: 'theme=light',
            theme: 'light',
            title: 'Title 1',
        };

        beforeAll(() => {
            document.cookie = `${COOKIE_KEY_BRIDGE_TO_NATIVE_DATA}=${encodeURIComponent(JSON.stringify(mockedNativeData))}`;
            // @ts-expect-error -- Специфика Андроид окружения
            window.Android = {
                setPageSettings: mockedSetPageSettings,
            };
        });

        afterAll(() => {
            document.cookie = `${COOKIE_KEY_BRIDGE_TO_NATIVE_DATA}=; max-age=-1`;
            // @ts-expect-error -- Специфика Андроид окружения
            delete window.Android;
        });

        it('should use AM interface correctly when moving forward and then backward', async () => {
            const inst = new BridgeToNative();

            expect(mockedSetPageSettings).toHaveBeenCalledTimes(1);
            expect(mockedSetPageSettings).toHaveBeenCalledWith(
                '{"pageId":1,"pageTitle":"Title 1"}',
            );

            inst.navigateClientSide('/page2', null, 'Title 2');
            expect(mockedSetPageSettings).toHaveBeenCalledTimes(2);
            expect(mockedSetPageSettings).toHaveBeenCalledWith(
                '{"pageId":2,"pageTitle":"Title 2"}',
            );

            inst.setTitle('Changed Title 2');
            expect(mockedSetPageSettings).toHaveBeenCalledTimes(3);
            expect(mockedSetPageSettings).toHaveBeenCalledWith(
                '{"pageId":2,"pageTitle":"Changed Title 2"}',
            );

            inst.navigateClientSide('/page3', null, '');
            expect(mockedSetPageSettings).toHaveBeenCalledTimes(4);
            expect(mockedSetPageSettings).toHaveBeenCalledWith('{"pageId":3,"pageTitle":""}');

            inst.navigateClientSide('/page4');
            expect(mockedSetPageSettings).toHaveBeenCalledTimes(5);
            expect(mockedSetPageSettings).toHaveBeenCalledWith('{"pageId":4,"pageTitle":""}');

            emulateAmBackButtonTap();
            await new Promise(process.nextTick);
            expect(mockedSetPageSettings).toHaveBeenCalledTimes(6);
            expect(mockedSetPageSettings).toHaveBeenCalledWith('{"pageId":3,"pageTitle":""}');

            emulateAmBackButtonTap();
            await new Promise(process.nextTick);
            expect(mockedSetPageSettings).toHaveBeenCalledTimes(7);
            expect(mockedSetPageSettings).toHaveBeenCalledWith(
                '{"pageId":2,"pageTitle":"Changed Title 2"}',
            );

            emulateAmBackButtonTap();
            await new Promise(process.nextTick);
            expect(mockedSetPageSettings).toHaveBeenCalledTimes(8);
            expect(mockedSetPageSettings).toHaveBeenCalledWith(
                '{"pageId":1,"pageTitle":"Title 1"}',
            );

            expect(mockedCloseWebviewUtil).not.toHaveBeenCalled();
            emulateAmBackButtonTap();
            await new Promise(process.nextTick);
            expect(mockedSetPageSettings).toHaveBeenCalledTimes(8);
            expect(mockedCloseWebviewUtil).toHaveBeenCalled();
        });

        it('should act and use AM interface correctly when using `goBackAFewStepsClientSide`', async () => {
            const inst = new BridgeToNative();

            inst.navigateClientSide('/page2', null, 'Title 2');
            inst.navigateClientSide('/page3', null, 'Title 3');
            inst.navigateClientSide('/page4', null, 'Title 4');
            inst.navigateClientSide('/page5', null, 'Title 5');
            expect(mockedSetPageSettings).toHaveBeenCalledTimes(5);

            inst.goBackAFewStepsClientSide(3);
            await new Promise(process.nextTick);

            expect(mockedSetPageSettings).toHaveBeenCalledTimes(6);
            expect(mockedSetPageSettings).toHaveBeenCalledWith(
                '{"pageId":2,"pageTitle":"Title 2"}',
            );

            emulateAmBackButtonTap();
            await new Promise(process.nextTick);
            expect(mockedSetPageSettings).toHaveBeenCalledTimes(7);
            expect(mockedSetPageSettings).toHaveBeenCalledWith(
                '{"pageId":1,"pageTitle":"Title 1"}',
            );

            expect(mockedCloseWebviewUtil).not.toHaveBeenCalled();
            emulateAmBackButtonTap();
            await new Promise(process.nextTick);
            expect(mockedSetPageSettings).toHaveBeenCalledTimes(7);
            expect(mockedCloseWebviewUtil).toHaveBeenCalled();
        });

        it('should act and use AM interface correctly when using `setInitialView`', async () => {
            const inst = new BridgeToNative();

            inst.navigateClientSide('/page2', null, 'Title 2');
            inst.navigateClientSide('/page3', null, 'Title 3');
            inst.navigateClientSide('/page4', null, 'Title 4');
            inst.navigateClientSide('/page5', null, 'Title 5');

            inst.setInitialView('New Title After Reset');
            expect(mockedSetPageSettings).toHaveBeenCalledTimes(6);
            expect(mockedSetPageSettings).toHaveBeenCalledWith(
                '{"pageId":1,"pageTitle":"New Title After Reset"}',
            );

            expect(mockedCloseWebviewUtil).not.toHaveBeenCalled();
            emulateAmBackButtonTap();
            await new Promise(process.nextTick);
            expect(mockedSetPageSettings).toHaveBeenCalledTimes(6);
            expect(mockedCloseWebviewUtil).toHaveBeenCalled();
        });
    });

    describe('iOS environment', () => {
        const mockedNativeData = {
            appId: 'alfabank',
            appVersion: '1.0.0',
            environment: 'ios',
            nativeParamsReadErrorFlag: false,
            originalWebviewParams: 'theme=light',
            theme: 'light',
            title: 'Title 1',
        };

        beforeAll(() => {
            document.cookie = `${COOKIE_KEY_BRIDGE_TO_NATIVE_DATA}=${encodeURIComponent(JSON.stringify(mockedNativeData))}`;
        });

        afterAll(() => {
            document.cookie = `${COOKIE_KEY_BRIDGE_TO_NATIVE_DATA}=; max-age=-1`;
        });

        it('should use AM interface correctly when moving forward and then backward', async () => {
            const inst = new BridgeToNative();

            expect(locationReplaceSpy).toHaveBeenCalledTimes(1);
            expect(locationReplaceSpy).toHaveBeenCalledWith(
                `ios:setPageSettings/?pageTitle=${encodeURIComponent('Title 1')}`,
            );

            inst.navigateClientSide('/page2', null, 'Title 2');
            expect(locationReplaceSpy).toHaveBeenCalledTimes(2);
            expect(locationReplaceSpy).toHaveBeenCalledWith(
                `ios:setPageSettings/?pageTitle=${encodeURIComponent('Title 2')}&pageId=2`,
            );

            inst.setTitle('Changed Title 2');
            expect(locationReplaceSpy).toHaveBeenCalledTimes(3);
            expect(locationReplaceSpy).toHaveBeenCalledWith(
                `ios:setPageSettings/?pageTitle=${encodeURIComponent('Changed Title 2')}&pageId=2`,
            );

            inst.navigateClientSide('/page3', null, '');
            expect(locationReplaceSpy).toHaveBeenCalledTimes(4);
            expect(locationReplaceSpy).toHaveBeenCalledWith(
                'ios:setPageSettings/?pageTitle=&pageId=3',
            );

            inst.navigateClientSide('/page4');
            expect(locationReplaceSpy).toHaveBeenCalledTimes(5);
            expect(locationReplaceSpy).toHaveBeenCalledWith(
                'ios:setPageSettings/?pageTitle=&pageId=4',
            );

            emulateAmBackButtonTap();
            await new Promise(process.nextTick);
            expect(locationReplaceSpy).toHaveBeenCalledTimes(6);
            expect(locationReplaceSpy).toHaveBeenCalledWith(
                'ios:setPageSettings/?pageTitle=&pageId=3',
            );

            emulateAmBackButtonTap();
            await new Promise(process.nextTick);
            expect(locationReplaceSpy).toHaveBeenCalledTimes(7);
            expect(locationReplaceSpy).toHaveBeenCalledWith(
                `ios:setPageSettings/?pageTitle=${encodeURIComponent('Changed Title 2')}&pageId=2`,
            );

            emulateAmBackButtonTap();
            await new Promise(process.nextTick);
            expect(locationReplaceSpy).toHaveBeenCalledTimes(8);
            expect(locationReplaceSpy).toHaveBeenCalledWith(
                `ios:setPageSettings/?pageTitle=${encodeURIComponent('Title 1')}`,
            );

            expect(mockedCloseWebviewUtil).not.toHaveBeenCalled();
            emulateAmBackButtonTap();
            await new Promise(process.nextTick);
            expect(locationReplaceSpy).toHaveBeenCalledTimes(8);
            expect(mockedCloseWebviewUtil).toHaveBeenCalled();
        });

        it('should act and use AM interface correctly when using `goBackAFewSteps`', async () => {
            const inst = new BridgeToNative();

            inst.navigateClientSide('/page2', null, 'Title 2');
            inst.navigateClientSide('/page3', null, 'Title 3');
            inst.navigateClientSide('/page4', null, 'Title 4');
            inst.navigateClientSide('/page5', null, 'Title 5');
            expect(locationReplaceSpy).toHaveBeenCalledTimes(5);

            inst.goBackAFewStepsClientSide(3);
            await new Promise(process.nextTick);

            expect(locationReplaceSpy).toHaveBeenCalledTimes(6);
            expect(locationReplaceSpy).toHaveBeenCalledWith(
                `ios:setPageSettings/?pageTitle=${encodeURIComponent('Title 2')}&pageId=2`,
            );

            emulateAmBackButtonTap();
            await new Promise(process.nextTick);
            expect(locationReplaceSpy).toHaveBeenCalledTimes(7);
            expect(locationReplaceSpy).toHaveBeenCalledWith(
                `ios:setPageSettings/?pageTitle=${encodeURIComponent('Title 1')}`,
            );

            expect(mockedCloseWebviewUtil).not.toHaveBeenCalled();
            emulateAmBackButtonTap();
            await new Promise(process.nextTick);
            expect(locationReplaceSpy).toHaveBeenCalledTimes(7);
            expect(mockedCloseWebviewUtil).toHaveBeenCalled();
        });

        it('should act and use AM interface correctly when using `setInitialView`', async () => {
            const inst = new BridgeToNative();

            inst.navigateClientSide('/page2', null, 'Title 2');
            inst.navigateClientSide('/page3', null, 'Title 3');
            inst.navigateClientSide('/page4', null, 'Title 4');
            inst.navigateClientSide('/page5', null, 'Title 5');

            inst.setInitialView('New Title After Reset');
            expect(locationReplaceSpy).toHaveBeenCalledTimes(6);
            expect(locationReplaceSpy).toHaveBeenCalledWith(
                `ios:setPageSettings/?pageTitle=${encodeURIComponent('New Title After Reset')}`,
            );

            expect(mockedCloseWebviewUtil).not.toHaveBeenCalled();
            emulateAmBackButtonTap();
            await new Promise(process.nextTick);
            expect(locationReplaceSpy).toHaveBeenCalledTimes(6);
            expect(mockedCloseWebviewUtil).toHaveBeenCalled();
        });
    });
});
