/* eslint-disable @typescript-eslint/dot-notation -- отключено, чтобы можно было обращаться к приватным полям для их тестирования */

import type { BridgeToNative } from '../src';
import { PREVIOUS_NATIVE_NAVIGATION_AND_TITLE_STATE_STORAGE_KEY } from '../src/constants';
import { mockSessionStorage } from '../src/mock/mock-session-storage';
import { NativeNavigationAndTitle } from '../src/native-navigation-and-title';

let androidEnvFlag = false;
let mockedSetPageSettings: unknown;

const mockedHandleRedirect = jest.fn();
const mockedBridgeToAmInstance = {
    get AndroidBridge() {
        return androidEnvFlag ? { setPageSettings: mockedSetPageSettings } : undefined;
    },
    get environment() {
        return androidEnvFlag ? 'android' : 'ios';
    },
    get originalWebviewParams() {
        return 'title=superTitle';
    },
    closeWebview: jest.fn(),
    saveCurrentState: jest.fn(),
    restorePreviousState: jest.fn(),
    nativeFallbacks: {
        visitExternalResource: jest.fn(),
    },
} as unknown as BridgeToNative;

Object.defineProperty(global, 'handleRedirect', {
    value: mockedHandleRedirect,
    configurable: true,
});

jest.mock('../src', () => ({
    __esModule: true,
    BridgeToNative: function MockedBridgeToAmConstructor() {
        return mockedBridgeToAmInstance;
    },
}));

describe('AmNavigationAndTitle', () => {
    describe('sessionStorage interaction', () => {
        // const mockedSessionStorage = mockSessionStorage({
        //     [PREVIOUS_NATIVE_NAVIGATION_AND_TITLE_STATE_STORAGE_KEY]: {
        //         nativeHistoryStack: ['page1', 'page2', 'lastPage'],
        //         title: 'lastPage',
        //     },
        // });
        const mockedSessionStorage = mockSessionStorage(
            PREVIOUS_NATIVE_NAVIGATION_AND_TITLE_STATE_STORAGE_KEY,
            {
                nativeHistoryStack: ['page1', 'page2', 'lastPage'],
                title: 'lastPage',
            },
        );

        describe('constructor', () => {
            it('should call `restorePreviousState` method if it has previous state into sessionStorage', () => {
                const originalRestorePreviousStateMethod =
                    NativeNavigationAndTitle.prototype['restorePreviousState'];

                NativeNavigationAndTitle.prototype['restorePreviousState'] = jest.fn();
                const inst = new NativeNavigationAndTitle(
                    mockedBridgeToAmInstance,
                    null,
                    '',
                    mockedHandleRedirect,
                );

                expect(mockedSessionStorage.getItem).toBeCalledWith(
                    PREVIOUS_NATIVE_NAVIGATION_AND_TITLE_STATE_STORAGE_KEY,
                );
                expect(inst['restorePreviousState']).toBeCalled();

                NativeNavigationAndTitle.prototype['restorePreviousState'] =
                    originalRestorePreviousStateMethod;
            });
        });

        describe('methods', () => {
            describe('method `handleBack`', () => {
                it('should restore previous state and unblock itself if property isPopstateListenerBlocked=true', () => {
                    const inst = new NativeNavigationAndTitle(
                        mockedBridgeToAmInstance,
                        1,
                        '',
                        mockedHandleRedirect,
                    );

                    inst['handleBack']();
                    expect(mockedSessionStorage.getItem).toBeCalledWith(
                        PREVIOUS_NATIVE_NAVIGATION_AND_TITLE_STATE_STORAGE_KEY,
                    );

                    expect(mockedBridgeToAmInstance['restorePreviousState']).toBeCalled();
                });
            });

            describe('method `restorePreviousState`', () => {
                it('should get previous state from sessionStorage and restore it and cleared storage', () => {
                    const titleExample = 'lastPage';
                    const stackExample = ['page1', 'page2', titleExample];
                    const mockedSyncHistoryWithAm = jest.fn();
                    const mockedReassignPopstateListener = jest.fn();

                    JSON.parse = jest.fn().mockImplementationOnce(() => ({
                        nativeHistoryStack: stackExample,
                        title: titleExample,
                    }));
                    const inst = new NativeNavigationAndTitle(
                        mockedBridgeToAmInstance,
                        1,
                        '',
                        mockedHandleRedirect,
                    );

                    inst['syncHistoryWithNative'] = mockedSyncHistoryWithAm;
                    inst['reassignPopstateListener'] = mockedReassignPopstateListener;

                    inst['restorePreviousState']();

                    expect(mockedSessionStorage.getItem).toBeCalledWith(
                        PREVIOUS_NATIVE_NAVIGATION_AND_TITLE_STATE_STORAGE_KEY,
                    );
                    expect(inst['nativeHistoryStack']).toStrictEqual(stackExample);
                    expect(mockedSyncHistoryWithAm).toBeCalledWith(titleExample, 'title-replacing');
                    expect(mockedReassignPopstateListener).toBeCalled();
                    expect(mockedSessionStorage.removeItem).toBeCalledWith(
                        PREVIOUS_NATIVE_NAVIGATION_AND_TITLE_STATE_STORAGE_KEY,
                    );
                });
            });

            describe('method `saveCurrentState`', () => {
                it('should save current state into sessionStorage', () => {
                    const stackExample = ['first', 'second', 'last'];

                    const currentStateExample = {
                        title: stackExample[stackExample.length - 1],
                        nativeHistoryStack: stackExample,
                    };

                    const inst = new NativeNavigationAndTitle(
                        mockedBridgeToAmInstance,
                        1,
                        '',
                        mockedHandleRedirect,
                    );

                    inst['nativeHistoryStack'] = stackExample;
                    inst['saveCurrentState']();

                    expect(mockedSessionStorage.setItem).toBeCalledWith(
                        PREVIOUS_NATIVE_NAVIGATION_AND_TITLE_STATE_STORAGE_KEY,
                        JSON.stringify(currentStateExample),
                    );
                });
            });
        });
    });

    describe('constructor and methods', () => {
        let mockedAddEventListener: any;
        let mockedLocationReplace: any;
        let mockedLocationReload: any;
        let mockedLocationAssign: any;
        let mockedRemoveEventListener: any;
        let windowSpy: any;

        const mockedHistoryGo = jest.fn();

        beforeEach(() => {
            mockedAddEventListener = jest.fn(() => performance.now());
            mockedLocationReplace = jest.fn();
            mockedLocationReload = jest.fn();
            mockedLocationAssign = jest.fn();
            mockedRemoveEventListener = jest.fn(() => performance.now());
            mockedSetPageSettings = jest.fn();

            windowSpy = jest.spyOn(window, 'window', 'get');

            windowSpy.mockImplementation(() => ({
                addEventListener: mockedAddEventListener,
                history: {
                    go: mockedHistoryGo,
                },
                location: {
                    replace: mockedLocationReplace,
                    reload: mockedLocationReload,
                    assign: mockedLocationAssign,
                },
                removeEventListener: mockedRemoveEventListener,
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

        describe('constructor', () => {
            const originalSetInitialView = NativeNavigationAndTitle.prototype.setInitialView;

            beforeEach(() => {
                NativeNavigationAndTitle.prototype.setInitialView = jest.fn();
            });

            afterEach(() => {
                NativeNavigationAndTitle.prototype.setInitialView = originalSetInitialView;
            });

            it('should call `supportSharedSession` method if it has pageId', () => {
                const originalSupportSharedSessionMethod =
                    NativeNavigationAndTitle.prototype['supportSharedSession'];

                NativeNavigationAndTitle.prototype['supportSharedSession'] = jest.fn();
                const inst = new NativeNavigationAndTitle(
                    mockedBridgeToAmInstance,
                    2,
                    'example',
                    mockedHandleRedirect,
                );

                expect(inst['supportSharedSession']).toBeCalledWith(2, 'example');

                NativeNavigationAndTitle.prototype['supportSharedSession'] =
                    originalSupportSharedSessionMethod;
            });

            it('should call `setInitialView` method', () => {
                const inst = new NativeNavigationAndTitle(
                    mockedBridgeToAmInstance,
                    null,
                    '',
                    mockedHandleRedirect,
                );

                expect(inst.setInitialView).toBeCalledWith('');
            });

            it('should set initial AM title', () => {
                const inst = new NativeNavigationAndTitle(
                    mockedBridgeToAmInstance,
                    null,
                    'My Title',
                    mockedHandleRedirect,
                );

                expect(inst.setInitialView).toBeCalledWith('My Title');
            });
        });

        describe('method `goBackAFewSteps`', () => {
            it.each([
                [1, -1],
                [-1, -1],
                [3, -3],
                [-3, -3],
                [5, -4],
                [-5, -4],
            ])('should work correctly with `%p` as argument', (stepsNumber, expected) => {
                const inst = new NativeNavigationAndTitle(
                    mockedBridgeToAmInstance,
                    null,
                    '',
                    mockedHandleRedirect,
                );

                inst['nativeHistoryStack'] = [
                    'Title 1',
                    'Title 2',
                    'Title 3',
                    'Title 4',
                    'Title 5',
                ];

                inst.goBackAFewSteps(stepsNumber);
                expect(mockedHistoryGo).toBeCalledWith(expected);
            });

            it('should work correctly with `0` as argument', () => {
                const inst = new NativeNavigationAndTitle(
                    mockedBridgeToAmInstance,
                    null,
                    '',
                    mockedHandleRedirect,
                );

                inst['nativeHistoryStack'] = [
                    'Title 1',
                    'Title 2',
                    'Title 3',
                    'Title 4',
                    'Title 5',
                ];

                inst.goBackAFewSteps(0);
                expect(mockedHistoryGo).not.toBeCalled();
            });
        });

        describe('method `handleRedirect`', () => {
            it('should pass 2th, 3th and 4th params to `handleRedirect`', () => {
                const inst = new NativeNavigationAndTitle(
                    mockedBridgeToAmInstance,
                    null,
                    '',
                    mockedHandleRedirect,
                );

                inst.handleRedirect('New Title', 'app-name', 'path', { test: 'test' });

                expect(mockedHandleRedirect).toBeCalledTimes(1);
                expect(mockedHandleRedirect).toHaveBeenCalledWith('app-name', 'path', {
                    test: 'test',
                });
            });

            it('should work with 1 parameter', () => {
                const inst = new NativeNavigationAndTitle(
                    mockedBridgeToAmInstance,
                    null,
                    '',
                    mockedHandleRedirect,
                );

                inst.handleRedirect('/app-name/main-path/sub-path?query=test&query1=test1');

                expect(mockedHandleRedirect).toBeCalledTimes(1);
                expect(mockedHandleRedirect).toHaveBeenCalledWith(
                    'app-name',
                    'main-path/sub-path',
                    {
                        query: 'test',
                        query1: 'test1',
                    },
                );

                inst.handleRedirect('app-name/main-path');
                expect(mockedHandleRedirect).toHaveBeenCalledWith(
                    'app-name',
                    'main-path',
                    undefined,
                );

                inst.handleRedirect('app-name');
                expect(mockedHandleRedirect).toHaveBeenCalledWith('app-name', '', undefined);
            });

            it('should modify inner history stack correctly', () => {
                const inst = new NativeNavigationAndTitle(
                    mockedBridgeToAmInstance,
                    null,
                    '',
                    mockedHandleRedirect,
                );

                inst['nativeHistoryStack'] = ['Title 1'];

                inst.handleRedirect('Title 2', 'app-name');
                expect(inst['nativeHistoryStack']).toEqual(['Title 1', 'Title 2']);

                inst.handleRedirect('Title 3', 'app-name');
                expect(inst['nativeHistoryStack']).toEqual(['Title 1', 'Title 2', 'Title 3']);
            });

            it('should call `syncHistoryWithNative` method correctly', () => {
                const inst = new NativeNavigationAndTitle(
                    mockedBridgeToAmInstance,
                    null,
                    '',
                    mockedHandleRedirect,
                );
                const mockedSyncHistoryWithAm = jest.fn();

                inst['syncHistoryWithNative'] = mockedSyncHistoryWithAm;
                inst['nativeHistoryStack'] = ['Title'];

                inst.handleRedirect('New Title', 'app-name');
                expect(mockedSyncHistoryWithAm).toBeCalledWith('New Title', 'navigation');
            });
        });

        describe('method `setInitialView`', () => {
            it('should reset inner history stack', () => {
                const inst = new NativeNavigationAndTitle(
                    mockedBridgeToAmInstance,
                    null,
                    '',
                    mockedHandleRedirect,
                );

                inst['nativeHistoryStack'] = ['Title', 'Title', 'Title'];
                inst.setInitialView('New Title');
                expect(inst['nativeHistoryStack']).toEqual(['New Title']);

                inst['nativeHistoryStack'] = ['Title', 'Title'];
                inst.setInitialView('New Title');
                expect(inst['nativeHistoryStack']).toEqual(['New Title']);
            });

            it('should call `syncHistoryWithNative` method correctly', () => {
                const inst = new NativeNavigationAndTitle(
                    mockedBridgeToAmInstance,
                    null,
                    '',
                    mockedHandleRedirect,
                );
                const mockedSyncHistoryWithAm = jest.fn();

                inst['syncHistoryWithNative'] = mockedSyncHistoryWithAm;
                inst.setInitialView('New Title');

                expect(mockedSyncHistoryWithAm).toBeCalledTimes(1);
                expect(mockedSyncHistoryWithAm).toBeCalledWith('New Title', 'initialization');
            });

            it('should refresh popstate event listener when method is called', () => {
                const inst = new NativeNavigationAndTitle(
                    mockedBridgeToAmInstance,
                    null,
                    '',
                    mockedHandleRedirect,
                );

                // `setInitialView` вызывается в конструкторе.
                // `removeEventListener` должен вызваться раньше `addEventListener`.
                expect(mockedRemoveEventListener.mock.results[0].value).toBeLessThan(
                    mockedAddEventListener.mock.results[0].value,
                );

                expect(mockedRemoveEventListener).toBeCalledWith('popstate', inst['handleBack']);
                expect(mockedAddEventListener).toBeCalledWith('popstate', inst['handleBack']);
            });
        });

        describe('method `setTitle`', () => {
            it('should modify inner history stack correctly', () => {
                const inst = new NativeNavigationAndTitle(
                    mockedBridgeToAmInstance,
                    null,
                    '',
                    mockedHandleRedirect,
                );

                inst.setTitle('New Title');
                expect(inst['nativeHistoryStack']).toEqual(['New Title']);

                inst['nativeHistoryStack'] = ['Title', 'Title'];
                inst.setTitle('New Title');
                expect(inst['nativeHistoryStack']).toEqual(['Title', 'New Title']);
            });

            it('should call `syncHistoryWithNative` method correctly', () => {
                const inst = new NativeNavigationAndTitle(
                    mockedBridgeToAmInstance,
                    null,
                    '',
                    mockedHandleRedirect,
                );
                const mockedSyncHistoryWithAm = jest.fn();

                inst['syncHistoryWithNative'] = mockedSyncHistoryWithAm;

                inst.setTitle('New Title');
                expect(mockedSyncHistoryWithAm).toBeCalledWith('New Title', 'title-replacing');
            });
        });

        describe('methods `getNativePageId`, а также `getAmPageIdForInitialization`, `getAmPageIdForNavigation`, `getAmPageIdForTitleReplacing`', () => {
            describe('Android environment', () => {
                beforeEach(() => {
                    androidEnvFlag = true;
                });

                it('should calculate pageId for `initialization` purpose correctly', () => {
                    const inst = new NativeNavigationAndTitle(
                        mockedBridgeToAmInstance,
                        null,
                        '',
                        mockedHandleRedirect,
                    );
                    const pageId = inst['getNativePageId']('initialization');

                    expect(pageId).toBe(1);
                });

                it('should calculate pageId for `navigation` purpose correctly', () => {
                    const inst = new NativeNavigationAndTitle(
                        mockedBridgeToAmInstance,
                        null,
                        '',
                        mockedHandleRedirect,
                    );
                    let pageId = inst['getNativePageId']('navigation');

                    expect(pageId).toBe(1);

                    inst['nativeHistoryStack'] = ['Title', 'Title'];
                    pageId = inst['getNativePageId']('navigation');
                    expect(pageId).toBe(2);

                    inst['nativeHistoryStack'] = ['Title', 'Title', 'Title'];
                    pageId = inst['getNativePageId']('navigation');
                    expect(pageId).toBe(3);
                });

                it('should calculate pageId for `title-replacing` purpose correctly', () => {
                    const inst = new NativeNavigationAndTitle(
                        mockedBridgeToAmInstance,
                        null,
                        '',
                        mockedHandleRedirect,
                    );
                    let pageId = inst['getNativePageId']('title-replacing');

                    expect(pageId).toBe(1);

                    inst['nativeHistoryStack'] = ['Title', 'Title'];
                    pageId = inst['getNativePageId']('title-replacing');
                    expect(pageId).toBe(2);
                });
            });

            describe('iOS environment', () => {
                it('should calculate pageId for `initialization` purpose correctly', () => {
                    const inst = new NativeNavigationAndTitle(
                        mockedBridgeToAmInstance,
                        null,
                        '',
                        mockedHandleRedirect,
                    );
                    const pageId = inst['getNativePageId']('initialization');

                    expect(pageId).toBeNull();
                });

                it('should calculate pageId for `navigation` purpose correctly', () => {
                    const inst = new NativeNavigationAndTitle(
                        mockedBridgeToAmInstance,
                        null,
                        '',
                        mockedHandleRedirect,
                    );
                    let pageId = inst['getNativePageId']('navigation');

                    expect(pageId).toBeNull();

                    inst['nativeHistoryStack'] = ['Title', 'Title'];
                    pageId = inst['getNativePageId']('navigation');
                    expect(pageId).toBe(2);

                    inst['nativeHistoryStack'] = ['Title', 'Title', 'Title'];
                    pageId = inst['getNativePageId']('navigation');
                    expect(pageId).toBe(3);
                });

                it('should calculate pageId for `title-replacing` purpose correctly', () => {
                    const inst = new NativeNavigationAndTitle(
                        mockedBridgeToAmInstance,
                        null,
                        '',
                        mockedHandleRedirect,
                    );
                    let pageId = inst['getNativePageId']('title-replacing');

                    expect(pageId).toBeNull();

                    inst['nativeHistoryStack'] = ['Title', 'Title'];
                    pageId = inst['getNativePageId']('title-replacing');
                    expect(pageId).toBe(2);

                    inst['nativeHistoryStack'] = ['Title', 'Title', 'Title'];
                    pageId = inst['getNativePageId']('title-replacing');
                    expect(pageId).toBe(3);
                });
            });
        });

        describe('method `handleBack`', () => {
            it('should close webview when its inner history stack is empty', () => {
                const inst = new NativeNavigationAndTitle(
                    mockedBridgeToAmInstance,
                    null,
                    '',
                    mockedHandleRedirect,
                );

                inst['handleBack']();
                expect(mockedBridgeToAmInstance.closeWebview).toBeCalledTimes(1);

                inst['nativeHistoryStack'] = ['Title 1', 'Title 2'];
                inst['handleBack']();
                expect(mockedBridgeToAmInstance.closeWebview).toBeCalledTimes(1);
            });

            it('should modify inner history stack correctly', () => {
                const inst = new NativeNavigationAndTitle(
                    mockedBridgeToAmInstance,
                    null,
                    '',
                    mockedHandleRedirect,
                );

                inst['nativeHistoryStack'] = ['Title 1', 'Title 2', 'Title 3'];

                inst['handleBack']();
                expect(inst['nativeHistoryStack']).toEqual(['Title 1', 'Title 2']);
                expect(mockedBridgeToAmInstance.closeWebview).not.toBeCalled();

                inst['handleBack']();
                expect(inst['nativeHistoryStack']).toEqual(['Title 1']);
                expect(mockedBridgeToAmInstance.closeWebview).not.toBeCalled();
            });

            it('should modify inner history stack after multiple steps back', () => {
                const inst = new NativeNavigationAndTitle(
                    mockedBridgeToAmInstance,
                    null,
                    '',
                    mockedHandleRedirect,
                );

                inst['nativeHistoryStack'] = ['Title 1', 'Title 2', 'Title 3', 'Title 4'];
                inst['numOfBackSteps'] = 3;
                inst['handleBack']();
                expect(inst['nativeHistoryStack']).toEqual(['Title 1']);
            });

            it('should call `syncHistoryWithNative` method correctly', () => {
                const inst = new NativeNavigationAndTitle(
                    mockedBridgeToAmInstance,
                    null,
                    '',
                    mockedHandleRedirect,
                );
                const mockedSyncHistoryWithAm = jest.fn();

                inst['syncHistoryWithNative'] = mockedSyncHistoryWithAm;
                inst['nativeHistoryStack'] = ['Title 1', 'Title 2', 'Title 3'];

                inst['handleBack']();
                expect(mockedSyncHistoryWithAm).toBeCalledTimes(1);
                expect(mockedSyncHistoryWithAm).toBeCalledWith('Title 2', 'navigation');

                inst['handleBack']();
                expect(mockedSyncHistoryWithAm).toBeCalledTimes(2);
                expect(mockedSyncHistoryWithAm).toBeCalledWith('Title 1', 'navigation');

                inst['handleBack']();
                expect(mockedSyncHistoryWithAm).toBeCalledTimes(2);
            });

            it('should reset `numOfBackSteps`', () => {
                const inst = new NativeNavigationAndTitle(
                    mockedBridgeToAmInstance,
                    null,
                    '',
                    mockedHandleRedirect,
                );

                inst['nativeHistoryStack'] = ['Title 1', 'Title 2', 'Title 3', 'Title 4'];
                inst['numOfBackSteps'] = 3;
                inst['handleBack']();
                expect(inst['numOfBackSteps']).toBe(1);
            });
        });

        describe('method `syncHistoryWithNative`', () => {
            it('should pass `purpose` argument to `getNativePageId` method', () => {
                const inst = new NativeNavigationAndTitle(
                    mockedBridgeToAmInstance,
                    null,
                    '',
                    mockedHandleRedirect,
                );
                const mockedGetAmPageId = jest.fn(() => null);

                inst['getNativePageId'] = mockedGetAmPageId;

                inst['syncHistoryWithNative']('Title', 'initialization');
                expect(mockedGetAmPageId).toHaveBeenCalledWith('initialization');

                inst['syncHistoryWithNative']('Title', 'navigation');
                expect(mockedGetAmPageId).toHaveBeenCalledWith('navigation');

                inst['syncHistoryWithNative']('Title', 'title-replacing');
                expect(mockedGetAmPageId).toHaveBeenCalledWith('title-replacing');
            });

            describe('Android environment', () => {
                beforeEach(() => {
                    androidEnvFlag = true;
                });

                it('should use AM interface with `pageId` correctly', () => {
                    const inst = new NativeNavigationAndTitle(
                        mockedBridgeToAmInstance,
                        null,
                        '',
                        mockedHandleRedirect,
                    );

                    inst['getNativePageId'] = jest.fn(() => 1);
                    inst['syncHistoryWithNative']('New Title', 'initialization');
                    expect(mockedSetPageSettings).toBeCalledWith(
                        '{"pageTitle":"New Title","pageId":1}',
                    );

                    inst['getNativePageId'] = jest.fn(() => 2);
                    inst['syncHistoryWithNative']('New Title', 'navigation');
                    expect(mockedSetPageSettings).toBeCalledWith(
                        '{"pageTitle":"New Title","pageId":2}',
                    );
                });

                it('should use AM interface without `pageId` correctly', () => {
                    const inst = new NativeNavigationAndTitle(
                        mockedBridgeToAmInstance,
                        null,
                        '',
                        mockedHandleRedirect,
                    );

                    inst['getNativePageId'] = jest.fn(() => null);
                    inst['syncHistoryWithNative']('New Title', 'initialization');
                    expect(mockedSetPageSettings).toBeCalledWith('{"pageTitle":"New Title"}');
                });

                it('should not send two identical signals in a row to AM', () => {
                    const inst = new NativeNavigationAndTitle(
                        mockedBridgeToAmInstance,
                        null,
                        '',
                        mockedHandleRedirect,
                    );

                    inst['setTitle']('New Title');
                    expect(mockedSetPageSettings).toBeCalledTimes(2);
                    inst['setTitle']('New Title');
                    expect(mockedSetPageSettings).toBeCalledTimes(2);
                });
            });

            describe('iOS environment', () => {
                it('should use correctly AM interface with `pageId`', () => {
                    const inst = new NativeNavigationAndTitle(
                        mockedBridgeToAmInstance,
                        null,
                        '',
                        mockedHandleRedirect,
                    );

                    inst['getNativePageId'] = jest.fn(() => 1);
                    inst['syncHistoryWithNative']('New Title', 'initialization');
                    expect(mockedLocationReplace).toBeCalledWith(
                        'ios:setPageSettings/?pageTitle=New%20Title&pageId=1',
                    );

                    inst['getNativePageId'] = jest.fn(() => 2);
                    inst['syncHistoryWithNative']('New Title', 'navigation');
                    expect(mockedLocationReplace).toBeCalledWith(
                        'ios:setPageSettings/?pageTitle=New%20Title&pageId=2',
                    );
                });

                it('should use correctly AM interface without `pageId`', () => {
                    const inst = new NativeNavigationAndTitle(
                        mockedBridgeToAmInstance,
                        null,
                        '',
                        mockedHandleRedirect,
                    );

                    inst['getNativePageId'] = jest.fn(() => null);
                    inst['syncHistoryWithNative']('New Title', 'initialization');
                    expect(mockedLocationReplace).toBeCalledWith(
                        'ios:setPageSettings/?pageTitle=New%20Title',
                    );
                });

                it('should not send two identical signals in a row to AM', () => {
                    const inst = new NativeNavigationAndTitle(
                        mockedBridgeToAmInstance,
                        null,
                        '',
                        mockedHandleRedirect,
                    );

                    inst['setTitle']('New Title');
                    expect(mockedLocationReplace).toBeCalledTimes(2);
                    inst['setTitle']('New Title');
                    expect(mockedLocationReplace).toBeCalledTimes(2);
                });
            });
        });

        describe('method `supportSharedSession`', () => {
            it('should fill nativeHistoryStack and call syncHistoryWithNative and reassignPopstateListener correctly', () => {
                const mockedSyncHistoryWithAm = jest.fn();
                const mockedReassignPopstateListener = jest.fn();

                const inst = new NativeNavigationAndTitle(
                    mockedBridgeToAmInstance,
                    null,
                    '',
                    mockedHandleRedirect,
                );

                inst['syncHistoryWithNative'] = mockedSyncHistoryWithAm;
                inst['reassignPopstateListener'] = mockedReassignPopstateListener;

                inst['supportSharedSession'](55, 'Example');

                expect(inst['nativeHistoryStack']).toStrictEqual(new Array(55).fill(''));
                expect(mockedSyncHistoryWithAm).toBeCalledWith('Example', 'title-replacing');
                expect(mockedReassignPopstateListener).toBeCalled();
            });
        });

        describe('method `reassignPopstateListener`', () => {
            it('should remove and add listener in correct priority', () => {
                const inst = new NativeNavigationAndTitle(
                    mockedBridgeToAmInstance,
                    null,
                    '',
                    mockedHandleRedirect,
                );

                inst['reassignPopstateListener']();

                expect(mockedRemoveEventListener.mock.results[0].value).toBeLessThan(
                    mockedAddEventListener.mock.results[0].value,
                );

                expect(mockedRemoveEventListener).toBeCalledWith('popstate', inst['handleBack']);
                expect(mockedAddEventListener).toBeCalledWith('popstate', inst['handleBack']);
            });
        });

        describe('method `prepareExternalLinkBeforeOpen`', () => {
            const inst = new NativeNavigationAndTitle(
                mockedBridgeToAmInstance,
                44,
                '',
                mockedHandleRedirect,
            );
            const externalUrl = 'https://yandex.ru/';
            const externalUrlWithOwnQuery = 'https://yandex.ru/?param=test&param2=test2';

            it('should add originalWebviewQueryParams correctly if url has no own params', () => {
                expect(inst['prepareExternalLinkBeforeOpen'](externalUrl)).toEqual(
                    `${externalUrl}?title=superTitle&nextPageId=45`,
                );
            });

            it('should add originalWebviewQueryParams correctly if url has own params', () => {
                expect(inst['prepareExternalLinkBeforeOpen'](externalUrlWithOwnQuery)).toEqual(
                    `${externalUrlWithOwnQuery}&title=superTitle&nextPageId=45`,
                );
            });
        });

        describe('method `navigateInsideASharedSession`', () => {
            describe('Android environment', () => {
                beforeEach(() => {
                    androidEnvFlag = true;
                });

                it('should call b2n.saveCurrentState and visit url', () => {
                    const externalUrlExample = 'https://ya.ru/';
                    const externalPreparedUrlExample =
                        'https://ya.ru/?title=superTitle&nextPageId=33';
                    const mockedPrepareExternalLinkBeforeOpen = jest.fn(
                        () => externalPreparedUrlExample,
                    );

                    const inst = new NativeNavigationAndTitle(
                        mockedBridgeToAmInstance,
                        1,
                        '',
                        mockedHandleRedirect,
                    );

                    inst['prepareExternalLinkBeforeOpen'] = mockedPrepareExternalLinkBeforeOpen;

                    inst['nativeHistoryStack'] = new Array(32).fill('');
                    inst.navigateInsideASharedSession(externalUrlExample);

                    expect(inst['b2n']['saveCurrentState']).toBeCalled();
                    expect(mockedPrepareExternalLinkBeforeOpen).toHaveBeenCalledWith(
                        externalUrlExample,
                    );
                    expect(mockedLocationAssign).toBeCalledWith(externalPreparedUrlExample);
                });
            });

            describe('iOS environment', () => {
                it('should call b2n.nativeFallbacks.visitExternalResource if current environment IOS', () => {
                    const externalUrlExample = 'https://ya.ru/';

                    const inst = new NativeNavigationAndTitle(
                        mockedBridgeToAmInstance,
                        1,
                        '',
                        mockedHandleRedirect,
                    );

                    inst.navigateInsideASharedSession(externalUrlExample);

                    expect(inst['b2n']['nativeFallbacks']['visitExternalResource']).toBeCalledWith(
                        externalUrlExample,
                    );
                });
            });
        });

        describe('method `reloadPage`', () => {
            it('should call `b2n.saveCurrentState` and location.reload', () => {
                const inst = new NativeNavigationAndTitle(
                    mockedBridgeToAmInstance,
                    44,
                    '',
                    mockedHandleRedirect,
                );

                inst.reloadPage();

                expect(inst['b2n']['saveCurrentState']).toBeCalled();
                expect(mockedLocationReload).toBeCalled();
            });
        });
    });
});
