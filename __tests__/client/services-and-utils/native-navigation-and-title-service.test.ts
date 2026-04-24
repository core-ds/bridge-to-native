import { NativeNavigationAndTitleService } from '../../../src/client/services-and-utils/native-navigation-and-title-service';
import { type NativeParamsService } from '../../../src/client/services-and-utils/native-params-service';
import {
    HISTORY_STATE_KEY_B2N_PAGE_ID,
    QUERY_B2N_NEXT_PAGEID,
    SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK,
} from '../../../src/query-and-headers-keys';

const mockedCloseWebviewUtil = jest.fn();

jest.mock('../../../src/client/services-and-utils/close-webview-util', () => ({
    __esModule: true,
    get closeWebviewUtil() {
        return mockedCloseWebviewUtil;
    },
}));

const mockedNativeParamsServiceInstance = {
    appId: 'alfabank',
    appVersion: '1.0.0',
    environment: 'android',
    nativeParamsReadErrorFlag: false,
    originalWebviewParams: 'theme=light',
    theme: 'light',
    title: 'Title 1',
    canUseNativeFeature: jest.fn(),
    isCurrentVersionHigherOrEqual: jest.fn(),
} as unknown as NativeParamsService;

describe('NativeNavigationAndTitleService', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    const historyGoSpy = jest.spyOn(window.history, 'go');
    const historyPushStateSpy = jest.spyOn(window.history, 'pushState');
    const historyReplaceStateSpy = jest.spyOn(window.history, 'replaceState');
    const locationAssignSpy = jest.spyOn(window.location, 'assign');
    const locationReplaceSpy = jest.spyOn(window.location, 'replace');

    let initializeNativeHistoryStackSpy: jest.SpyInstance;
    let syncHistoryWithNativeSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();

        initializeNativeHistoryStackSpy = (
            jest.spyOn(
                NativeNavigationAndTitleService.prototype,
                // @ts-expect-error –– Мокаем приватный метод
                'initializeNativeHistoryStack',
            ) as jest.SpyInstance
        ).mockImplementation(function initializeNativeHistoryStack(
            this: NativeNavigationAndTitleService,
        ) {
            // @ts-expect-error –– Мокаем приватное свойство
            this.nativeHistoryStack = ['Title 1'];
        });

        syncHistoryWithNativeSpy = jest.spyOn(
            NativeNavigationAndTitleService.prototype,
            // @ts-expect-error –– Мокаем приватное свойство
            'syncHistoryWithNative',
        ) as jest.SpyInstance;
    });

    afterEach(() => {
        initializeNativeHistoryStackSpy.mockRestore();
        syncHistoryWithNativeSpy.mockRestore();
        window.history.replaceState(null, '');
    });

    describe('constructor', () => {
        it('should bind `handleClientSideNavigationBack` to instance and use it as handler for `popstate` event', () => {
            (
                jest.spyOn(
                    NativeNavigationAndTitleService.prototype,
                    // @ts-expect-error –– Мокаем приватный метод
                    'handleClientSideNavigationBack',
                ) as jest.SpyInstance
            ).mockImplementationOnce(function handleClientSideNavigationBack(
                this: NativeNavigationAndTitleService,
            ) {
                return this;
            });

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);
            // @ts-expect-error –– Проверяем приватный метод
            const link = inst.handleClientSideNavigationBack;

            expect(link()).toBe(inst);
            expect(addEventListenerSpy).toHaveBeenCalledWith('popstate', link);
        });

        it('should call `initializeNativeHistoryStack`', () => {
            // eslint-disable-next-line no-new
            new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            expect(initializeNativeHistoryStackSpy).toHaveBeenCalled();
        });
    });

    describe('method `closeWebview`', () => {
        it('should call `closeWebviewUtil`', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            inst.closeWebview();
            expect(mockedCloseWebviewUtil).toHaveBeenCalled();
        });
    });

    describe('method `goBack`', () => {
        it('should call `goBackAFewSteps` with correct parameters', () => {
            const spy = jest.spyOn(NativeNavigationAndTitleService.prototype, 'goBackAFewSteps');

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            inst.goBack();
            expect(spy).toHaveBeenCalledWith(-1, true);

            spy.mockRestore();
        });

        it('should block repeated calls', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', 'Title 2'];

            inst.goBack();
            expect(historyGoSpy).toHaveBeenCalledTimes(1);

            inst.goBack();
            expect(historyGoSpy).toHaveBeenCalledTimes(1);
        });

        it('should unlock after `handleClientSideNavigationBack` (popstate)', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', 'Title 2', 'Title 3'];

            inst.goBack();
            expect(historyGoSpy).toHaveBeenCalledTimes(1);

            // @ts-expect-error –– Вызываем приватный метод (popstate)
            inst.handleClientSideNavigationBack();

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', 'Title 2'];

            inst.goBack();
            expect(historyGoSpy).toHaveBeenCalledTimes(2);
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
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', 'Title 2', 'Title 3', 'Title 4', 'Title 5'];

            inst.goBackAFewSteps(stepsNumber);
            expect(historyGoSpy).toHaveBeenCalledWith(expected);
        });

        it('should work correctly with `0` as argument', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', 'Title 2', 'Title 3', 'Title 4', 'Title 5'];

            inst.goBackAFewSteps(0);
            expect(historyGoSpy).not.toHaveBeenCalled();
        });

        it('should use `browserHistoryApiWrappers` if it is setted', () => {
            const stepsNumber = -3;
            const wrappers = { go: jest.fn() };

            const inst = new NativeNavigationAndTitleService(
                mockedNativeParamsServiceInstance,
                wrappers,
            );

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', 'Title 2', 'Title 3', 'Title 4', 'Title 5'];

            inst.goBackAFewSteps(stepsNumber);
            expect(historyGoSpy).not.toHaveBeenCalled();
            expect(wrappers.go).toHaveBeenCalledWith(stepsNumber);
        });

        it('should handle `autoCloseWebview` flag correctly', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', 'Title 2', 'Title 3', 'Title 4', 'Title 5'];

            inst.goBackAFewSteps(2);
            expect(historyGoSpy).toHaveBeenCalled();
            historyGoSpy.mockClear();

            inst.goBackAFewSteps(10, true);
            expect(historyGoSpy).not.toHaveBeenCalled();
            expect(mockedCloseWebviewUtil).toHaveBeenCalled();
        });

        it.each([
            [1, 1],
            [-1, 1],
            [3, 3],
            [-3, 3],
            [5, 4],
            [-5, 4],
        ])(
            'should set numOfBackSteps to %p when stepsNumber is %p',
            (stepsNumber, expectedNumOfBackSteps) => {
                const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

                // @ts-expect-error –– Мокаем приватное свойство
                inst.nativeHistoryStack = ['Title 1', 'Title 2', 'Title 3', 'Title 4', 'Title 5'];

                inst.goBackAFewSteps(stepsNumber);
                // @ts-expect-error –– Проверяем приватное свойство
                expect(inst.numOfBackSteps).toBe(expectedNumOfBackSteps);
            },
        );

        it('should go back across server-side created entries', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', '', '', 'Title 4'];

            inst.goBackAFewSteps(3);
            expect(historyGoSpy).toHaveBeenCalledWith(-3);
        });
    });

    describe('method `navigateClientSide`', () => {
        it('should call `history.pushState` with user state then native `replaceState` with b2n-pageId', () => {
            const url1 = '/another-page';
            const url2 = '/another-page2';
            const state = { foo: 'bar' };

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1'];

            inst.navigateClientSide(url1);
            expect(historyPushStateSpy).toHaveBeenCalledWith(null, '', url1);
            expect(historyReplaceStateSpy).toHaveBeenCalledWith(
                { [HISTORY_STATE_KEY_B2N_PAGE_ID]: 2 },
                '',
            );

            inst.navigateClientSide(url2, state, 'New Title');
            expect(historyPushStateSpy).toHaveBeenCalledWith(state, '', url2);
            expect(historyReplaceStateSpy).toHaveBeenCalledWith(
                { foo: 'bar', [HISTORY_STATE_KEY_B2N_PAGE_ID]: 3 },
                '',
            );
        });

        it('should use `browserHistoryApiWrappers` with user state, then native replaceState with b2n-pageId', () => {
            const wrappers = { push: jest.fn() };

            const url1 = '/another-page';
            const url2 = '/another-page2';
            const state = { foo: 'bar' };

            const inst = new NativeNavigationAndTitleService(
                mockedNativeParamsServiceInstance,
                wrappers,
            );

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1'];

            inst.navigateClientSide(url1);
            expect(wrappers.push).toHaveBeenCalledWith(url1, null);
            expect(historyReplaceStateSpy).toHaveBeenCalledWith(
                { [HISTORY_STATE_KEY_B2N_PAGE_ID]: 2 },
                '',
            );

            historyReplaceStateSpy.mockClear();

            inst.navigateClientSide(url2, state);
            expect(wrappers.push).toHaveBeenCalledWith(url2, { foo: 'bar' });

            expect(historyReplaceStateSpy).toHaveBeenCalledWith(
                expect.objectContaining({ [HISTORY_STATE_KEY_B2N_PAGE_ID]: 3 }),
                '',
            );

            expect(historyPushStateSpy).not.toHaveBeenCalled();
        });

        it('should modify `nativeHistoryStack` correctly', () => {
            const url1 = '/another-page';
            const url2 = '/another-page2';

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', 'Title 2', 'Title 3'];

            inst.navigateClientSide(url1);
            // @ts-expect-error –– Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual(
                expect.arrayContaining(['Title 1', 'Title 2', 'Title 3', '']),
            );

            inst.navigateClientSide(url2, undefined, 'New Title');
            // @ts-expect-error –– Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual(
                expect.arrayContaining(['Title 1', 'Title 2', 'Title 3', '', 'New Title']),
            );
        });

        it('should call `syncHistoryWithNative`', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            inst.navigateClientSide('/another-page');
            expect(syncHistoryWithNativeSpy).toHaveBeenCalled();

            syncHistoryWithNativeSpy.mockRestore();
        });

        it('should call `saveNativeHistoryStack`', () => {
            const saveSpy = jest.spyOn(
                NativeNavigationAndTitleService.prototype,
                // @ts-expect-error -- Мокаем приватный метод
                'saveNativeHistoryStack',
            ) as jest.SpyInstance;

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            inst.navigateClientSide('/another-page', undefined, 'Title');
            expect(saveSpy).toHaveBeenCalled();

            saveSpy.mockRestore();
        });
    });

    describe('method `navigateServerSide`', () => {
        let saveNativeHistoryStackSpy: jest.SpyInstance;

        beforeAll(() => {
            saveNativeHistoryStackSpy = jest.spyOn(
                NativeNavigationAndTitleService.prototype,
                // @ts-expect-error -- Мокаем приватный метод
                'saveNativeHistoryStack',
            );
        });

        beforeEach(() => {
            locationAssignSpy.mockImplementation(() => {});
        });

        afterAll(() => {
            saveNativeHistoryStackSpy.mockRestore();
        });

        const crossOriginLink = 'https://example.com';
        const defaultPostFix = 'theme=light&device_app_version=1.0.0&b2n-next-page-id=2';

        it('should call `location.assign` with correct URL', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            inst.navigateServerSide(crossOriginLink);
            expect(locationAssignSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    href: `${crossOriginLink}/?${defaultPostFix}`,
                }),
            );
        });

        it('should include `nativeTitle` in URL query', () => {
            const testTitle = 'Test Title';
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            inst.navigateServerSide(crossOriginLink, testTitle);
            expect(locationAssignSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    href: `${crossOriginLink}/?b2n-title=Test+Title&${defaultPostFix}`,
                }),
            );
        });

        it('should call `saveNativeHistoryStack` before triggering navigation', () => {
            let syncHistoryWithNativeCallTime = 0;
            let locationAssignCallTime = 0;

            saveNativeHistoryStackSpy.mockImplementationOnce(() => {
                syncHistoryWithNativeCallTime = performance.now();
            });

            locationAssignSpy.mockImplementationOnce(() => {
                locationAssignCallTime = performance.now();
            });

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            inst.navigateServerSide(crossOriginLink);
            expect(syncHistoryWithNativeCallTime).toBeLessThan(locationAssignCallTime);
        });

        it('should push empty string to stack when nativeTitle is not provided', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            inst.navigateServerSide(crossOriginLink);
            // @ts-expect-error –– Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual(['Title 1', '']);
        });

        it('should push nativeTitle when provided', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);
            const sameOriginUrl = `${window.location.origin}/some-path`;

            inst.navigateServerSide(sameOriginUrl, 'Same Origin Title');
            // @ts-expect-error –– Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual(['Title 1', 'Same Origin Title']);
        });

        it('should save updated stack to sessionStorage before navigation', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            inst.navigateServerSide(crossOriginLink, 'Cross Title');

            expect(saveNativeHistoryStackSpy).toHaveBeenCalled();

            const saved = JSON.parse(
                sessionStorage.getItem(SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK) ?? '',
            );

            expect(saved).toEqual(['Title 1', 'Cross Title']);
        });

        it('should block repeated calls', () => {
            locationAssignSpy.mockImplementation(() => {});

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            inst.navigateServerSide(crossOriginLink);
            expect(locationAssignSpy).toHaveBeenCalledTimes(1);

            inst.navigateServerSide(crossOriginLink);
            expect(locationAssignSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('method `replaceHistoryState`', () => {
        it('should call native replaceState with user state then replaceState with b2n-pageId', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            inst.replaceHistoryState('/new-url', { foo: 'bar' });
            // First call: native replaceState with user state
            expect(historyReplaceStateSpy).toHaveBeenCalledWith({ foo: 'bar' }, '', '/new-url');
            // Second call: native replaceState with b2n-pageId merged into current state
            expect(historyReplaceStateSpy).toHaveBeenCalledWith(
                { foo: 'bar', [HISTORY_STATE_KEY_B2N_PAGE_ID]: 1 },
                '',
            );
        });

        it('should use `browserHistoryApiWrappers.replace` with user state, then native replaceState with b2n-pageId', () => {
            const wrappers = { replace: jest.fn() };

            const inst = new NativeNavigationAndTitleService(
                mockedNativeParamsServiceInstance,
                wrappers,
            );

            inst.replaceHistoryState('/new-url', { foo: 'bar' });
            expect(wrappers.replace).toHaveBeenCalledWith('/new-url', { foo: 'bar' });
            expect(historyReplaceStateSpy).toHaveBeenCalledWith(
                expect.objectContaining({ [HISTORY_STATE_KEY_B2N_PAGE_ID]: 1 }),
                '',
            );
        });

        it('should work with null state', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            inst.replaceHistoryState('/new-url', null);
            expect(historyReplaceStateSpy).toHaveBeenCalledWith(null, '', '/new-url');
            expect(historyReplaceStateSpy).toHaveBeenCalledWith(
                { [HISTORY_STATE_KEY_B2N_PAGE_ID]: 1 },
                '',
            );
        });

        it('should work with no arguments', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            inst.replaceHistoryState();
            expect(historyReplaceStateSpy).toHaveBeenCalledWith(null, '', undefined);
            expect(historyReplaceStateSpy).toHaveBeenCalledWith(
                { [HISTORY_STATE_KEY_B2N_PAGE_ID]: 1 },
                '',
            );
        });
    });

    describe('method `setInitialView`', () => {
        it('should reset `nativeHistoryStack`', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', 'Title 2', 'Title 3'];

            inst.setInitialView('');
            // @ts-expect-error –– Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual(['']);
        });

        it('should take into account `nativeTitle` parameter', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title1 ', 'Title 2', 'Title 3'];

            inst.setInitialView('New Title');
            // @ts-expect-error –– Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual(['New Title']);
        });

        it('should call `syncHistoryWithNative`', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            inst.setInitialView();
            expect(syncHistoryWithNativeSpy).toHaveBeenCalled();

            syncHistoryWithNativeSpy.mockRestore();
        });

        it('should call `saveNativeHistoryStack`', () => {
            const saveSpy = jest.spyOn(
                NativeNavigationAndTitleService.prototype,
                // @ts-expect-error -- Мокаем приватный метод
                'saveNativeHistoryStack',
            ) as jest.SpyInstance;

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            inst.setInitialView('New Title');
            expect(saveSpy).toHaveBeenCalled();

            saveSpy.mockRestore();
        });
    });

    describe('method `setTitle`', () => {
        it('should modify `nativeHistoryStack` correctly', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual(['Title 1']);
            inst.setTitle('New Title');
            // @ts-expect-error –– Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual(['New Title']);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', 'Title 2'];
            inst.setTitle('New Title');
            // @ts-expect-error –– Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual(['Title 1', 'New Title']);
        });

        it('should call `syncHistoryWithNative`', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            inst.setTitle('Title');
            expect(syncHistoryWithNativeSpy).toHaveBeenCalled();

            syncHistoryWithNativeSpy.mockRestore();
        });

        it('should call `saveNativeHistoryStack`', () => {
            const saveSpy = jest.spyOn(
                NativeNavigationAndTitleService.prototype,
                // @ts-expect-error -- Мокаем приватный метод
                'saveNativeHistoryStack',
            ) as jest.SpyInstance;

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            inst.setTitle('Title');
            expect(saveSpy).toHaveBeenCalled();

            saveSpy.mockRestore();
        });
    });

    describe('method `getNativePageIdAndTitle`', () => {
        it('should return correct `pageId` and `PageTitle` for Android', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', 'Title 2', 'Title 3'];

            // @ts-expect-error –– Тестируем приватное свойство
            const { pageId, pageTitle } = inst.getNativePageIdAndTitle();

            expect(pageId).toBe(3);
            expect(pageTitle).toBe('Title 3');
        });

        it('should return `pageId=1` for Android when stack size is <=1', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Тестируем приватное свойство
            const { pageId, pageTitle } = inst.getNativePageIdAndTitle();

            expect(pageId).toBe(1);
            expect(pageTitle).toBe('Title 1');
        });

        it('should return `pageId=null` for iOS when stack size is <=1', () => {
            const mockedParamsService = {
                ...mockedNativeParamsServiceInstance,
                environment: 'ios',
            } as NativeParamsService;
            const inst = new NativeNavigationAndTitleService(mockedParamsService);

            // @ts-expect-error –– Тестируем приватное свойство
            const { pageId, pageTitle } = inst.getNativePageIdAndTitle();

            expect(pageId).toBeNull();
            expect(pageTitle).toBe('Title 1');
        });
    });

    describe('method `handleClientSideNavigationBack`', () => {
        it('should truncate `nativeHistoryStack` using b2n-pageId from event.state', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', 'Title 2', 'Title 3'];

            const event = {
                state: { [HISTORY_STATE_KEY_B2N_PAGE_ID]: 1 },
            } as PopStateEvent;

            // @ts-expect-error –– Тестируем приватное свойство
            inst.handleClientSideNavigationBack(event);
            // @ts-expect-error –– Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual(['Title 1']);
        });

        it('should truncate `nativeHistoryStack` using b2n-pageId = 1 (first page)', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', 'Title 2'];

            const event = {
                state: { [HISTORY_STATE_KEY_B2N_PAGE_ID]: 1 },
            } as PopStateEvent;

            // @ts-expect-error –– Тестируем приватное свойство
            inst.handleClientSideNavigationBack(event);
            // @ts-expect-error –– Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual(['Title 1']);
        });

        it('should fallback to numOfBackSteps when event has no b2n-pageId', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', 'Title 2', 'Title 3'];

            // @ts-expect-error –– Тестируем приватный метод
            inst.handleClientSideNavigationBack();
            // @ts-expect-error –– Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual(['Title 1', 'Title 2']);
        });

        it('should fallback to numOfBackSteps when event.state is null', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', 'Title 2', 'Title 3'];

            const event = { state: null } as PopStateEvent;

            // @ts-expect-error –– Тестируем приватный метод
            inst.handleClientSideNavigationBack(event);
            // @ts-expect-error –– Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual(['Title 1', 'Title 2']);
        });

        it('should fallback to numOfBackSteps (set by goBackAFewSteps) when event has no b2n-pageId', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', 'Title 2', 'Title 3', 'Title 4', 'Title 5'];
            // @ts-expect-error –– Мокаем приватное свойство
            inst.numOfBackSteps = 3;

            const event = { state: null } as PopStateEvent;

            // @ts-expect-error –– Тестируем приватный метод
            inst.handleClientSideNavigationBack(event);
            // @ts-expect-error –– Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual(['Title 1', 'Title 2']);
            // @ts-expect-error –– Проверяем приватное свойство
            expect(inst.numOfBackSteps).toBe(1);
        });

        it('should call `syncHistoryWithNative` after truncating stack', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', 'Title 2', 'Title 3'];

            const event = {
                state: { [HISTORY_STATE_KEY_B2N_PAGE_ID]: 2 },
            } as PopStateEvent;

            // @ts-expect-error –– Тестируем приватное свойство
            inst.handleClientSideNavigationBack(event);

            expect(mockedCloseWebviewUtil).not.toHaveBeenCalled();
            // @ts-expect-error –– Тестируем приватное свойство
            expect(inst.syncHistoryWithNative).toHaveBeenCalled();
        });

        it('should close webview if `nativeHistoryStack` becomes empty', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1'];

            // @ts-expect-error –– Тестируем приватное свойство
            inst.handleClientSideNavigationBack();
            expect(mockedCloseWebviewUtil).toHaveBeenCalled();
            // @ts-expect-error –– Тестируем приватное свойство
            expect(inst.syncHistoryWithNative).not.toHaveBeenCalled();
        });

        it('should call `saveNativeHistoryStack` when stack is not empty', () => {
            const saveSpy = jest.spyOn(
                NativeNavigationAndTitleService.prototype,
                // @ts-expect-error -- Мокаем приватный метод
                'saveNativeHistoryStack',
            ) as jest.SpyInstance;

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', 'Title 2', 'Title 3'];

            const event = {
                state: { [HISTORY_STATE_KEY_B2N_PAGE_ID]: 2 },
            } as PopStateEvent;

            // @ts-expect-error –– Тестируем приватное свойство
            inst.handleClientSideNavigationBack(event);
            expect(saveSpy).toHaveBeenCalled();

            saveSpy.mockRestore();
        });

        it('should not call `saveNativeHistoryStack` when stack becomes empty', () => {
            const saveSpy = jest.spyOn(
                NativeNavigationAndTitleService.prototype,
                // @ts-expect-error -- Мокаем приватный метод
                'saveNativeHistoryStack',
            ) as jest.SpyInstance;

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1'];

            // @ts-expect-error –– Тестируем приватное свойство
            inst.handleClientSideNavigationBack();
            expect(saveSpy).not.toHaveBeenCalled();

            saveSpy.mockRestore();
        });
    });

    describe('method `hasSavedHistoryStack`', () => {
        afterEach(() => {
            sessionStorage.clear();
        });

        it('should return true if `bridgeToNativeHistoryStack` is detected', () => {
            const bridgeToNativeHistoryStack = ['Title 1', 'Title 2', 'Title 3'];
            const serializedBridgeToNativeHistoryStack = JSON.stringify(bridgeToNativeHistoryStack);

            sessionStorage.setItem(
                SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK,
                serializedBridgeToNativeHistoryStack,
            );

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error -- Проверяем приватный метод
            expect(inst.hasSavedHistoryStack()).toBeTruthy();
        });

        it('should return false if `bridgeToNativeHistoryStack` is not detected', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error -- Проверяем приватный метод
            expect(inst.hasSavedHistoryStack()).toBeFalsy();
        });
    });

    describe('method `initializeNativeHistoryStack`', () => {
        let saveNativeHistoryStackSpy: jest.SpyInstance;
        let setHistoryStatePageIdSpy: jest.SpyInstance;

        beforeAll(() => {
            saveNativeHistoryStackSpy = jest.spyOn(
                NativeNavigationAndTitleService.prototype,
                // @ts-expect-error -- Мокаем приватный метод
                'saveNativeHistoryStack',
            );
            setHistoryStatePageIdSpy = jest.spyOn(
                NativeNavigationAndTitleService.prototype,
                // @ts-expect-error -- Мокаем приватный метод
                'setHistoryStatePageId',
            );
        });

        beforeEach(() => {
            initializeNativeHistoryStackSpy.mockRestore();
        });

        afterEach(() => {
            sessionStorage.clear();
            window.history.replaceState(null, '');
        });

        afterAll(() => {
            saveNativeHistoryStackSpy.mockRestore();
            setHistoryStatePageIdSpy.mockRestore();
        });

        it('should initialize stack for fresh WV start (no pageId, no nextPageId, no SS)', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error – Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual(['Title 1']);
            expect(syncHistoryWithNativeSpy).toHaveBeenCalled();
        });

        it('should initialize stack for new origin (nextPageId, no SS)', () => {
            const mockedParamsService = {
                ...mockedNativeParamsServiceInstance,
                nextPageId: 3,
                title: 'Title 3',
            } as NativeParamsService;

            const inst = new NativeNavigationAndTitleService(mockedParamsService);

            // @ts-expect-error – Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual([0, 0, 'Title 3']);
        });

        it('should initialize stack for same-origin forward (nextPageId, SS length matches)', () => {
            sessionStorage.setItem(
                SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK,
                JSON.stringify(['Title 1', 'Title 2', 'New Title 3']),
            );

            const mockedParamsService = {
                ...mockedNativeParamsServiceInstance,
                nextPageId: 3,
                title: 'New Title 3',
            } as NativeParamsService;

            const inst = new NativeNavigationAndTitleService(mockedParamsService);

            // @ts-expect-error – Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual(['Title 1', 'Title 2', 'New Title 3']);
        });

        it('should initialize stack for forward with larger nextPageId than SS', () => {
            sessionStorage.setItem(
                SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK,
                JSON.stringify(['Title 1', 'Title 2', 'Title 3']),
            );

            const mockedParamsService = {
                ...mockedNativeParamsServiceInstance,
                nextPageId: 5,
                title: 'Title 5',
            } as NativeParamsService;

            const inst = new NativeNavigationAndTitleService(mockedParamsService);

            // @ts-expect-error – Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual([
                'Title 1',
                'Title 2',
                'Title 3',
                0,
                'Title 5',
            ]);
        });

        it('should initialize stack using b2n-pageId from history.state (back hard)', () => {
            window.history.replaceState({ [HISTORY_STATE_KEY_B2N_PAGE_ID]: 2 }, '');

            sessionStorage.setItem(
                SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK,
                JSON.stringify(['Title 1', 'Title 2', 'Title 3', 'Title 4']),
            );

            const mockedParamsService = {
                ...mockedNativeParamsServiceInstance,
                nextPageId: 2,
                title: 'Restored Title',
            } as NativeParamsService;

            const inst = new NativeNavigationAndTitleService(mockedParamsService);

            // @ts-expect-error – Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual(['Title 1', 'Restored Title']);
        });

        it('should initialize stack using b2n-pageId from history.state (back to first page)', () => {
            window.history.replaceState({ [HISTORY_STATE_KEY_B2N_PAGE_ID]: 1 }, '');

            sessionStorage.setItem(
                SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK,
                JSON.stringify(['Title 1', 'Title 2', 'Title 3']),
            );

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error – Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual(['Title 1']);
        });

        it('should initialize stack using b2n-pageId from history.state (reload, same pageId)', () => {
            window.history.replaceState({ [HISTORY_STATE_KEY_B2N_PAGE_ID]: 3 }, '');

            sessionStorage.setItem(
                SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK,
                JSON.stringify(['Title 1', 'Title 2', 'Title 3']),
            );

            const inst = new NativeNavigationAndTitleService({
                ...mockedNativeParamsServiceInstance,
                title: 'Title 3',
            } as NativeParamsService);

            // @ts-expect-error – Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual(['Title 1', 'Title 2', 'Title 3']);
        });

        it('should fallback to [title] when b2n-pageId present but no SS', () => {
            window.history.replaceState({ [HISTORY_STATE_KEY_B2N_PAGE_ID]: 2 }, '');

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error – Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual(['Title 1']);
        });

        it('should call saveNativeHistoryStack after initialization', () => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            expect(saveNativeHistoryStackSpy).toHaveBeenCalled();
        });

        it('should call setHistoryStatePageId after initialization', () => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            expect(setHistoryStatePageIdSpy).toHaveBeenCalled();
        });

        it('should handle invalid sessionStorage value gracefully', () => {
            sessionStorage.setItem(SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK, 'broken-json');

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error – Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual(['Title 1']);
        });

        it('should handle mismatched nextPageId and SS by falling back to nextPageId', () => {
            sessionStorage.setItem(
                SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK,
                JSON.stringify(['Title 1', 'Title 2']),
            );

            const mockedParamsService = {
                ...mockedNativeParamsServiceInstance,
                nextPageId: 5,
                title: 'Title 5',
            } as NativeParamsService;

            const inst = new NativeNavigationAndTitleService(mockedParamsService);

            // @ts-expect-error – Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual(['Title 1', 'Title 2', 0, 0, 'Title 5']);
        });
    });

    describe('method `prepareExternalLinkBeforeOpen`', () => {
        it('should append `originalWebviewParams` and `nextPageId`', () => {
            const url = 'https://example.com';
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['', ''];

            // @ts-expect-error -- Проверям приватный метод
            const result = inst.prepareExternalLinkBeforeOpen(url);

            expect(result.href).toBe(
                'https://example.com/?theme=light&device_app_version=1.0.0&b2n-next-page-id=2',
            );
        });

        it('should handle existing query parameters', () => {
            const url = 'https://example.com/?existing=param';
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['', ''];

            // @ts-expect-error -- Проверям приватный метод
            const result = inst.prepareExternalLinkBeforeOpen(url);

            expect(result.href).toBe(
                'https://example.com/?existing=param&theme=light&device_app_version=1.0.0&b2n-next-page-id=2',
            );
        });

        it('should use current stack length as nextPageId', () => {
            const url = 'https://example.com';
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error – Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', 'Title 2'];

            // @ts-expect-error – Проверяем приватный метод
            const result = inst.prepareExternalLinkBeforeOpen(url);

            expect(result.searchParams.get(QUERY_B2N_NEXT_PAGEID)).toBe('2');
        });
    });

    describe('method `readSavedHistoryStack`', () => {
        afterEach(() => {
            sessionStorage.clear();
        });

        it('should throw when there is no data in sessionStorage', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            try {
                // @ts-expect-error -- Проверяем приватный метод
                inst.readSavedHistoryStack();
                expect(false).toBeTruthy();
            } catch {
                expect(true).toBeTruthy();
            }
        });

        it('should successfully parse data in sessionStorage', () => {
            sessionStorage.setItem(
                SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK,
                JSON.stringify(['Title 1', 'Title 2']),
            );

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error -- Проверяем приватный метод
            expect(inst.readSavedHistoryStack()).toEqual(['Title 1', 'Title 2']);
        });

        it('should throw when there is invalid data in sessionStorage', () => {
            sessionStorage.setItem(SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK, 'invalid-json');

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            try {
                // @ts-expect-error -- Проверяем приватный метод
                inst.readSavedHistoryStack();
                expect(false).toBeTruthy();
            } catch {
                expect(true).toBeTruthy();
            }
        });

        it('should log error when sessionStorage is empty', () => {
            const logError = jest.fn();

            const inst = new NativeNavigationAndTitleService(
                mockedNativeParamsServiceInstance,
                undefined,
                logError,
            );

            try {
                // @ts-expect-error -- Проверяем приватный метод
                inst.readSavedHistoryStack();
            } catch {
                expect(logError).toHaveBeenCalledWith(expect.any(String), expect.any(Error));
            }
        });

        it('should log error when sessionStorage has invalid JSON', () => {
            const logError = jest.fn();

            sessionStorage.setItem(SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK, 'invalid-json');

            const inst = new NativeNavigationAndTitleService(
                mockedNativeParamsServiceInstance,
                undefined,
                logError,
            );

            try {
                // @ts-expect-error -- Проверяем приватный метод
                inst.readSavedHistoryStack();
            } catch {
                expect(logError).toHaveBeenCalledWith(expect.any(String), expect.any(Error));
            }
        });
    });

    describe('method `saveNativeHistoryStack`', () => {
        afterEach(() => {
            sessionStorage.clear();
        });

        it('should save full stack', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);
            const stack = ['Page1', 'Page2', 'Page3'];

            // @ts-expect-error – Мокаем приватное свойство
            inst.nativeHistoryStack = stack;

            // @ts-expect-error – Проверяем приватный метод
            inst.saveNativeHistoryStack();
            expect(sessionStorage.getItem(SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK)).toBe(
                JSON.stringify(stack),
            );
        });

        it('should overwrite existing sessionStorage with new value', () => {
            sessionStorage.setItem(SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK, 'old_value');

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error – Проверяем приватный метод
            inst.saveNativeHistoryStack();
            expect(sessionStorage.getItem(SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK)).toBe(
                JSON.stringify(['Title 1']),
            );
        });
    });

    describe('method `syncHistoryWithNative`', () => {
        describe('Android environment', () => {
            const mockedSetPageSettings = jest.fn();

            const mockedNativeParamsServiceAndroidInstance = {
                ...mockedNativeParamsServiceInstance,
                AndroidBridge: {
                    setPageSettings: mockedSetPageSettings,
                },
            } as NativeParamsService;

            it('should send correct parameters to NA for the first page', () => {
                const inst = new NativeNavigationAndTitleService(
                    mockedNativeParamsServiceAndroidInstance,
                );

                // @ts-expect-error – Проверяем приватный метод
                inst.syncHistoryWithNative();
                expect(mockedSetPageSettings).toHaveBeenCalledWith(
                    JSON.stringify({ pageId: 1, pageTitle: 'Title 1' }),
                );
            });

            it('should send correct parameters to NA for the third page', () => {
                const inst = new NativeNavigationAndTitleService(
                    mockedNativeParamsServiceAndroidInstance,
                );

                // @ts-expect-error – Мокаем приватное свойство
                inst.nativeHistoryStack = ['Title 1', 'Title 2', 'Title 3'];

                // @ts-expect-error – Проверяем приватный метод
                inst.syncHistoryWithNative();
                expect(mockedSetPageSettings).toHaveBeenCalledWith(
                    JSON.stringify({ pageId: 3, pageTitle: 'Title 3' }),
                );
            });

            it('should not send duplicate parameters to NA', () => {
                const inst = new NativeNavigationAndTitleService(
                    mockedNativeParamsServiceAndroidInstance,
                );

                // @ts-expect-error – Вызываем приватный метод
                inst.syncHistoryWithNative();
                expect(mockedSetPageSettings).toHaveBeenCalledTimes(1);

                // @ts-expect-error – Вызываем приватный метод
                inst.syncHistoryWithNative();
                expect(mockedSetPageSettings).toHaveBeenCalledTimes(1);

                // @ts-expect-error – Мокаем приватное свойство
                inst.nativeHistoryStack = ['Title 1', 'Title 2'];

                // @ts-expect-error – Вызываем приватный метод
                inst.syncHistoryWithNative();
                expect(mockedSetPageSettings).toHaveBeenCalledTimes(2);
            });

            it('should update `lastSetPageSettingsParams` after successful sync', () => {
                const inst = new NativeNavigationAndTitleService(
                    mockedNativeParamsServiceAndroidInstance,
                );

                // @ts-expect-error – Вызываем приватный метод
                inst.syncHistoryWithNative();
                // @ts-expect-error – Проверяем приватное свойство
                expect(inst.lastSetPageSettingsParams).toBe(
                    JSON.stringify({ pageId: 1, pageTitle: 'Title 1' }),
                );
            });
        });

        describe('iOS environment', () => {
            const mockedNativeParamsServiceiOSInstance = {
                ...mockedNativeParamsServiceInstance,
                environment: 'ios',
            } as NativeParamsService;

            it('should send correct parameters to NA for the first page', () => {
                const inst = new NativeNavigationAndTitleService(
                    mockedNativeParamsServiceiOSInstance,
                );

                // @ts-expect-error – Проверяем приватный метод
                inst.syncHistoryWithNative();
                expect(locationReplaceSpy).toHaveBeenCalledWith(
                    'ios:setPageSettings/?pageTitle=Title%201',
                );
            });

            it('should send correct parameters to NA for the third page', () => {
                const inst = new NativeNavigationAndTitleService(
                    mockedNativeParamsServiceiOSInstance,
                );

                // @ts-expect-error – Мокаем приватное свойство
                inst.nativeHistoryStack = ['Title 1', 'Title 2', 'Title 3'];

                // @ts-expect-error – Проверяем приватный метод
                inst.syncHistoryWithNative();
                expect(locationReplaceSpy).toHaveBeenCalledWith(
                    'ios:setPageSettings/?pageTitle=Title%203&pageId=3',
                );
            });

            it('should not send duplicate parameters to NA', () => {
                const inst = new NativeNavigationAndTitleService(
                    mockedNativeParamsServiceiOSInstance,
                );

                // @ts-expect-error – Вызываем приватный метод
                inst.syncHistoryWithNative();
                expect(locationReplaceSpy).toHaveBeenCalledTimes(1);

                // @ts-expect-error – Вызываем приватный метод
                inst.syncHistoryWithNative();
                expect(locationReplaceSpy).toHaveBeenCalledTimes(1);

                // @ts-expect-error – Мокаем приватное свойство
                inst.nativeHistoryStack = ['Title 1', 'Title 2'];

                // @ts-expect-error – Вызываем приватный метод
                inst.syncHistoryWithNative();
                expect(locationReplaceSpy).toHaveBeenCalledTimes(2);
            });

            it('should update `lastSetPageSettingsParams` after successful sync', () => {
                const inst = new NativeNavigationAndTitleService(
                    mockedNativeParamsServiceiOSInstance,
                );

                // @ts-expect-error – Вызываем приватный метод
                inst.syncHistoryWithNative();
                // @ts-expect-error – Проверяем приватное свойство
                expect(inst.lastSetPageSettingsParams).toBe(
                    'ios:setPageSettings/?pageTitle=Title%201',
                );
            });

            it('should handle empty title correctly', () => {
                const inst = new NativeNavigationAndTitleService(
                    mockedNativeParamsServiceiOSInstance,
                );

                // @ts-expect-error – Мокаем приватное свойство
                inst.nativeHistoryStack = ['', ''];

                // @ts-expect-error – Вызываем приватный метод
                inst.syncHistoryWithNative();
                expect(locationReplaceSpy).toHaveBeenCalledWith(
                    'ios:setPageSettings/?pageTitle=&pageId=2',
                );
            });
        });
    });

    describe('method `setHistoryStatePageId`', () => {
        it('should call native replaceState with pageId merged into current history.state', () => {
            window.history.replaceState({ existing: 'value' }, '');

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', 'Title 2', 'Title 3'];

            // @ts-expect-error –– Вызываем приватный метод
            inst.setHistoryStatePageId();

            expect(historyReplaceStateSpy).toHaveBeenCalledWith(
                { existing: 'value', [HISTORY_STATE_KEY_B2N_PAGE_ID]: 3 },
                '',
            );
        });

        it('should always use native replaceState even when browserHistoryApiWrappers is set', () => {
            const wrappers = { replace: jest.fn() };

            const inst = new NativeNavigationAndTitleService(
                mockedNativeParamsServiceInstance,
                wrappers,
            );

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', 'Title 2'];

            // @ts-expect-error –– Вызываем приватный метод
            inst.setHistoryStatePageId();

            expect(wrappers.replace).not.toHaveBeenCalled();
            expect(historyReplaceStateSpy).toHaveBeenCalledWith(
                expect.objectContaining({ [HISTORY_STATE_KEY_B2N_PAGE_ID]: 2 }),
                '',
            );
        });
    });

    describe('method `createStateWithPageId`', () => {
        it('should merge pageId into object state', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error -- Проверяем приватный метод
            const result = inst.createStateWithPageId({ foo: 'bar' }, 3);

            expect(result).toEqual({ foo: 'bar', [HISTORY_STATE_KEY_B2N_PAGE_ID]: 3 });
        });

        it('should replace existing pageId', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error -- Проверяем приватный метод
            const result = inst.createStateWithPageId(
                { [HISTORY_STATE_KEY_B2N_PAGE_ID]: 1, foo: 'bar' },
                5,
            );

            expect(result).toEqual({ foo: 'bar', [HISTORY_STATE_KEY_B2N_PAGE_ID]: 5 });
        });

        it('should handle null state', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error -- Проверяем приватный метод
            const result = inst.createStateWithPageId(null, 2);

            expect(result).toEqual({ [HISTORY_STATE_KEY_B2N_PAGE_ID]: 2 });
        });

        it('should handle undefined state', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error -- Проверяем приватный метод
            const result = inst.createStateWithPageId(undefined, 2);

            expect(result).toEqual({ [HISTORY_STATE_KEY_B2N_PAGE_ID]: 2 });
        });

        it('should lose primitive state (string)', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error -- Проверяем приватный метод
            const result = inst.createStateWithPageId('primitive', 2);

            expect(result).toEqual({ [HISTORY_STATE_KEY_B2N_PAGE_ID]: 2 });
        });

        it('should lose array state', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error -- Проверяем приватный метод
            const result = inst.createStateWithPageId([1, 2, 3], 2);

            expect(result).toEqual({ [HISTORY_STATE_KEY_B2N_PAGE_ID]: 2 });
        });
    });
});
