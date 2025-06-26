/* eslint-disable @typescript-eslint/dot-notation -- отключено, чтобы можно было обращаться к приватным полям для их тестирования */

import { Mediator } from '../../src/client/mediator';
import { NativeNavigationAndTitle } from '../../src/client/native-navigation-and-title';

declare let window: Window & typeof globalThis & { Android?: object };

const mockedSetPageSettings = jest.fn();

const mockedAndroidMediator = new Mediator(
    { setPageSettings: mockedSetPageSettings },
    'alfabank',
    undefined,
    jest.fn(),
    jest.fn(),
    'android',
    'title=superTitle',
    () => undefined,
);

const mockedIOSMediator = new Mediator(
    undefined,
    'assistmekz',
    undefined,
    jest.fn(),
    jest.fn(),
    'ios',
    'title=superTitle',
    () => undefined,
);

describe('AmNavigationAndTitle', () => {
    describe('constructor and methods', () => {
        let mockedAddEventListener: ReturnType<typeof jest.fn>;
        let mockedRemoveEventListener: ReturnType<typeof jest.fn>;

        const mockedHistoryGo = jest.fn();
        const mockedLocationAssign = jest.fn();
        const mockedLocationReplace = jest.fn();

        const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
        const historyGoSpy = jest.spyOn(window.history, 'go');
        const locationAssignSpy = jest.spyOn(window.location, 'assign');
        const locationReplaceSpy = jest.spyOn(window.location, 'replace');
        const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

        beforeEach(() => {
            mockedAddEventListener = jest.fn(() => performance.now());
            mockedRemoveEventListener = jest.fn(() => performance.now());

            addEventListenerSpy.mockImplementation(mockedAddEventListener);
            historyGoSpy.mockImplementation(mockedHistoryGo);
            locationAssignSpy.mockImplementation(mockedLocationAssign);
            locationReplaceSpy.mockImplementation(mockedLocationReplace);
            removeEventListenerSpy.mockImplementation(mockedRemoveEventListener);
        });

        afterEach(() => {
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
                const inst = new NativeNavigationAndTitle(mockedIOSMediator, 2, 'example');

                expect(inst['supportSharedSession']).toBeCalledWith(2, 'example');

                NativeNavigationAndTitle.prototype['supportSharedSession'] =
                    originalSupportSharedSessionMethod;
            });

            it('should call `setInitialView` method', () => {
                const inst = new NativeNavigationAndTitle(mockedIOSMediator, null, '');

                expect(inst.setInitialView).toBeCalledWith('');
            });

            it('should set initial AM title', () => {
                const inst = new NativeNavigationAndTitle(mockedIOSMediator, null, 'My Title');

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
                const inst = new NativeNavigationAndTitle(mockedIOSMediator, null, '');

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
                const inst = new NativeNavigationAndTitle(mockedIOSMediator, null, '');

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

        // TODO: Написать тесты к методу `navigate`, который заменил `handleRedirect` и сильно изменился.

        describe('method `setInitialView`', () => {
            it('should reset inner history stack', () => {
                const inst = new NativeNavigationAndTitle(mockedIOSMediator, null, '');

                inst['nativeHistoryStack'] = ['Title', 'Title', 'Title'];
                inst.setInitialView('New Title');
                expect(inst['nativeHistoryStack']).toEqual(['New Title']);

                inst['nativeHistoryStack'] = ['Title', 'Title'];
                inst.setInitialView('New Title');
                expect(inst['nativeHistoryStack']).toEqual(['New Title']);
            });

            it('should call `syncHistoryWithNative` method correctly', () => {
                const inst = new NativeNavigationAndTitle(mockedIOSMediator, null, '');
                const mockedSyncHistoryWithAm = jest.fn();

                inst['syncHistoryWithNative'] = mockedSyncHistoryWithAm;
                inst.setInitialView('New Title');

                expect(mockedSyncHistoryWithAm).toBeCalledTimes(1);
                expect(mockedSyncHistoryWithAm).toBeCalledWith('New Title', 'initialization');
            });

            it('should refresh popstate event listener when method is called', () => {
                const inst = new NativeNavigationAndTitle(mockedIOSMediator, null, '');

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
                const inst = new NativeNavigationAndTitle(mockedIOSMediator, null, '');

                inst.setTitle('New Title');
                expect(inst['nativeHistoryStack']).toEqual(['New Title']);

                inst['nativeHistoryStack'] = ['Title', 'Title'];
                inst.setTitle('New Title');
                expect(inst['nativeHistoryStack']).toEqual(['Title', 'New Title']);
            });

            it('should call `syncHistoryWithNative` method correctly', () => {
                const inst = new NativeNavigationAndTitle(mockedIOSMediator, null, '');
                const mockedSyncHistoryWithAm = jest.fn();

                inst['syncHistoryWithNative'] = mockedSyncHistoryWithAm;

                inst.setTitle('New Title');
                expect(mockedSyncHistoryWithAm).toBeCalledWith('New Title', 'title-replacing');
            });
        });

        describe('methods `getNativePageId`, а также `getAmPageIdForInitialization`, `getAmPageIdForNavigation`, `getAmPageIdForTitleReplacing`', () => {
            describe('Android environment', () => {
                it('should calculate pageId for `initialization` purpose correctly', () => {
                    const inst = new NativeNavigationAndTitle(mockedAndroidMediator, null, '');
                    const pageId = inst['getNativePageId']('initialization');

                    expect(pageId).toBe(1);
                });

                it('should calculate pageId for `navigation` purpose correctly', () => {
                    const inst = new NativeNavigationAndTitle(mockedAndroidMediator, null, '');
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
                    const inst = new NativeNavigationAndTitle(mockedAndroidMediator, null, '');
                    let pageId = inst['getNativePageId']('title-replacing');

                    expect(pageId).toBe(1);

                    inst['nativeHistoryStack'] = ['Title', 'Title'];
                    pageId = inst['getNativePageId']('title-replacing');
                    expect(pageId).toBe(2);
                });
            });

            describe('iOS environment', () => {
                it('should calculate pageId for `initialization` purpose correctly', () => {
                    const inst = new NativeNavigationAndTitle(mockedIOSMediator, null, '');
                    const pageId = inst['getNativePageId']('initialization');

                    expect(pageId).toBeNull();
                });

                it('should calculate pageId for `navigation` purpose correctly', () => {
                    const inst = new NativeNavigationAndTitle(mockedIOSMediator, null, '');
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
                    const inst = new NativeNavigationAndTitle(mockedIOSMediator, null, '');
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
                const inst = new NativeNavigationAndTitle(mockedIOSMediator, null, '');

                inst['handleBack']();
                expect(mockedIOSMediator.closeWebview).toBeCalledTimes(1);

                inst['nativeHistoryStack'] = ['Title 1', 'Title 2'];
                inst['handleBack']();
                expect(mockedIOSMediator.closeWebview).toBeCalledTimes(1);
            });

            it('should modify inner history stack correctly', () => {
                const inst = new NativeNavigationAndTitle(mockedIOSMediator, null, '');

                inst['nativeHistoryStack'] = ['Title 1', 'Title 2', 'Title 3'];

                inst['handleBack']();
                expect(inst['nativeHistoryStack']).toEqual(['Title 1', 'Title 2']);
                expect(mockedIOSMediator.closeWebview).not.toBeCalled();

                inst['handleBack']();
                expect(inst['nativeHistoryStack']).toEqual(['Title 1']);
                expect(mockedIOSMediator.closeWebview).not.toBeCalled();
            });

            it('should modify inner history stack after multiple steps back', () => {
                const inst = new NativeNavigationAndTitle(mockedIOSMediator, null, '');

                inst['nativeHistoryStack'] = ['Title 1', 'Title 2', 'Title 3', 'Title 4'];
                inst['numOfBackSteps'] = 3;
                inst['handleBack']();
                expect(inst['nativeHistoryStack']).toEqual(['Title 1']);
            });

            it('should call `syncHistoryWithNative` method correctly', () => {
                const inst = new NativeNavigationAndTitle(mockedIOSMediator, null, '');
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
                const inst = new NativeNavigationAndTitle(mockedIOSMediator, null, '');

                inst['nativeHistoryStack'] = ['Title 1', 'Title 2', 'Title 3', 'Title 4'];
                inst['numOfBackSteps'] = 3;
                inst['handleBack']();
                expect(inst['numOfBackSteps']).toBe(1);
            });
        });

        describe('method `syncHistoryWithNative`', () => {
            it('should pass `purpose` argument to `getNativePageId` method', () => {
                const inst = new NativeNavigationAndTitle(mockedIOSMediator, null, '');
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
                it('should use AM interface with `pageId` correctly', () => {
                    const inst = new NativeNavigationAndTitle(mockedAndroidMediator, null, '');

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
                    const inst = new NativeNavigationAndTitle(mockedAndroidMediator, null, '');

                    inst['getNativePageId'] = jest.fn(() => null);
                    inst['syncHistoryWithNative']('New Title', 'initialization');
                    expect(mockedSetPageSettings).toBeCalledWith('{"pageTitle":"New Title"}');
                });

                it('should not send two identical signals in a row to AM', () => {
                    const inst = new NativeNavigationAndTitle(mockedAndroidMediator, null, '');

                    inst['setTitle']('New Title');
                    expect(mockedSetPageSettings).toBeCalledTimes(2);
                    inst['setTitle']('New Title');
                    expect(mockedSetPageSettings).toBeCalledTimes(2);
                });
            });

            describe('iOS environment', () => {
                it('should use correctly AM interface with `pageId`', () => {
                    const inst = new NativeNavigationAndTitle(mockedIOSMediator, null, '');

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
                    const inst = new NativeNavigationAndTitle(mockedIOSMediator, null, '');

                    inst['getNativePageId'] = jest.fn(() => null);
                    inst['syncHistoryWithNative']('New Title', 'initialization');
                    expect(mockedLocationReplace).toBeCalledWith(
                        'ios:setPageSettings/?pageTitle=New%20Title',
                    );
                });

                it('should not send two identical signals in a row to AM', () => {
                    const inst = new NativeNavigationAndTitle(mockedIOSMediator, null, '');

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

                const inst = new NativeNavigationAndTitle(mockedIOSMediator, null, '');

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
                const inst = new NativeNavigationAndTitle(mockedIOSMediator, null, '');

                inst['reassignPopstateListener']();

                expect(mockedRemoveEventListener.mock.results[0].value).toBeLessThan(
                    mockedAddEventListener.mock.results[0].value,
                );

                expect(mockedRemoveEventListener).toBeCalledWith('popstate', inst['handleBack']);
                expect(mockedAddEventListener).toBeCalledWith('popstate', inst['handleBack']);
            });
        });

        describe('method `prepareExternalLinkBeforeOpen`', () => {
            const inst = new NativeNavigationAndTitle(mockedIOSMediator, 44, '');
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
                // TODO: Какие-то жесткие круговые вызовы — Отрефакторить и покрыть тестами!
                it.skip('should call b2n.saveCurrentState and visit url', () => {
                    const externalUrlExample = 'https://ya.ru/';
                    const externalPreparedUrlExample =
                        'https://ya.ru/?title=superTitle&nextPageId=33';
                    const mockedPrepareExternalLinkBeforeOpen = jest.fn(
                        () => externalPreparedUrlExample,
                    );

                    const inst = new NativeNavigationAndTitle(mockedAndroidMediator, 1, '');

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

                    const mockedHandleNativeDeeplink = jest.fn();

                    const inst = new NativeNavigationAndTitle(mockedIOSMediator, 1, '');

                    inst['handleNativeDeeplink'] = mockedHandleNativeDeeplink;

                    inst.navigateInsideASharedSession(externalUrlExample);

                    expect(mockedHandleNativeDeeplink).toBeCalledWith(
                        `/webFeature?type=recommendation&url=${encodeURIComponent(
                            externalUrlExample,
                        )}`,
                    );
                });
            });
        });

        describe('method `handleNativeDeeplink`', () => {
            const root = 'alfabank:';

            describe('Android environment', () => {
                it.each([
                    [
                        'webFeature?type=recommendation&url=https%3A%2F%2Ftemplate.app',
                        'alfabank://webFeature?type=recommendation&url=https%3A%2F%2Ftemplate.app',
                    ],
                    [`${root}///dashboard/deeplink_template`, 'alfabank://deeplink_template'],
                    [`${root}///deeplink_template`, 'alfabank://deeplink_template'],
                    [`${root}//deeplink_template`, 'alfabank://deeplink_template'],
                    ['/deeplink_template', 'alfabank://deeplink_template'],
                ])(
                    'should modify input deeplink `%s` and call locationReplace with `%s`',
                    (deeplink, expectedValue) => {
                        const inst = new NativeNavigationAndTitle(mockedAndroidMediator, null, '');

                        inst['handleNativeDeeplink'](deeplink);

                        expect(mockedLocationReplace).toBeCalledWith(expectedValue);
                    },
                );
            });

            describe('IOS environment', () => {
                beforeEach(() => {
                    mockedIOSMediator.AndroidBridge = {};
                    jest.useFakeTimers();
                });

                it.each([
                    [
                        'webFeature?type=recommendation&url=https%3A%2F%2Ftemplate.app',
                        'assistmekz://webFeature?type=recommendation&url=https%3A%2F%2Ftemplate.app',
                    ],
                    [`${root}///dashboard/deeplink_template`, 'assistmekz://deeplink_template'],
                    [`${root}///deeplink_template`, 'assistmekz://deeplink_template'],
                    [`${root}//deeplink_template`, 'assistmekz://deeplink_template'],
                    ['/deeplink_template', 'assistmekz://deeplink_template'],
                ])(
                    'should modify input deeplink `%s` and call locationReplace with `%s`',
                    (deeplink, expectedValue) => {
                        const inst = new NativeNavigationAndTitle(mockedIOSMediator, null, '');

                        inst['handleNativeDeeplink'](deeplink);

                        expect(mockedLocationReplace).toBeCalledWith(expectedValue);
                    },
                );
            });

            it('should use closeWebviewBeforeCallNativeDeeplinkHandler argument', () => {
                (
                    mockedIOSMediator.canUseNativeFeature as ReturnType<typeof jest.fn>
                ).mockImplementation(() => true);

                const inst = new NativeNavigationAndTitle(mockedIOSMediator, null, '');

                const deeplink = 'webFeature?type=recommendation&url=https%3A%2F%2Ftemplate.app';

                inst['handleNativeDeeplink'](deeplink, true);

                expect(inst['mediator']['closeWebview']).toBeCalled();
            });
        });
    });
});
