import { NativeNavigationAndTitleService } from '../../../src/client/services-and-utils/native-navigation-and-title-service';
import { type NativeParamsService } from '../../../src/client/services-and-utils/native-params-service';
import {
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
    const locationAssignSpy = jest.spyOn(window.location, 'assign');
    const locationReplaceSpy = jest.spyOn(window.location, 'replace');

    // Мок метода, вызываемого в конструкторе, который будет тестироваться отдельно.
    let initializeNativeHistoryStackSpy: jest.SpyInstance;
    // Мок метода, вызываемого в разных методах, который будет тестироваться отдельно.
    let syncHistoryWithNativeSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();

        initializeNativeHistoryStackSpy = (
            jest.spyOn(
                NativeNavigationAndTitleService.prototype,
                // @ts-expect-error –– Мокаем приватный метод
                'initializeNativeHistoryStack',
            ) as jest.SpyInstance
        ).mockImplementation(function initializeNativeHistoryStack() {
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
    });

    describe('constructor', () => {
        it('should bind `handleClientSideNavigationBack` to instance and use it as handler for `popstate` event', () => {
            (
                jest.spyOn(
                    NativeNavigationAndTitleService.prototype,
                    // @ts-expect-error –– Мокаем приватный метод
                    'handleClientSideNavigationBack',
                ) as jest.SpyInstance
            ).mockImplementationOnce(function handleClientSideNavigationBack() {
                return this; // чтобы можно было прореверить, не будет ли утерян контекст.
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
        it('should call `goBackAFewStepsClientSide` with correct parameters', () => {
            const spy = jest.spyOn(
                NativeNavigationAndTitleService.prototype,
                'goBackAFewStepsClientSide',
            );

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            inst.goBack();
            expect(spy).toHaveBeenCalledWith(-1, true);

            spy.mockRestore();
        });
    });

    describe('method `goBackAFewStepsClientSide`', () => {
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

            inst.goBackAFewStepsClientSide(stepsNumber);
            expect(historyGoSpy).toHaveBeenCalledWith(expected);
        });

        it('should work correctly with `0` as argument', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', 'Title 2', 'Title 3', 'Title 4', 'Title 5'];

            inst.goBackAFewStepsClientSide(0);
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

            inst.goBackAFewStepsClientSide(stepsNumber);
            expect(historyGoSpy).not.toHaveBeenCalled();
            expect(wrappers.go).toHaveBeenCalledWith(stepsNumber);
        });

        it('should handle `autoCloseWebview` flag correctly', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', 'Title 2', 'Title 3', 'Title 4', 'Title 5'];

            inst.goBackAFewStepsClientSide(2);
            expect(historyGoSpy).toHaveBeenCalled();
            historyGoSpy.mockClear();

            inst.goBackAFewStepsClientSide(10, true);
            expect(historyGoSpy).not.toHaveBeenCalled();
            expect(mockedCloseWebviewUtil).toHaveBeenCalled();
        });

        it('should modify `numOfBackSteps` correctly', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', 'Title 2', 'Title 3', 'Title 4', 'Title 5'];

            inst.goBackAFewStepsClientSide(2);
            // @ts-expect-error –– Проверяем приватное свойство
            expect(inst.numOfBackSteps).toBe(2);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', 'Title 2', 'Title 3', 'Title 4', 'Title 5'];

            inst.goBackAFewStepsClientSide(10);
            // @ts-expect-error –– Проверяем приватное свойство
            expect(inst.numOfBackSteps).toBe(4);
        });
    });

    describe('method `navigateClientSide`', () => {
        it('should call `history.pushState` with correct parameters', () => {
            const url1 = '/another-page';
            const url2 = '/another-page2';
            const state = {};

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            inst.navigateClientSide(url1);
            expect(historyPushStateSpy).toHaveBeenCalledWith(null, '', url1);

            inst.navigateClientSide(url2, state);
            expect(historyPushStateSpy).toHaveBeenCalledWith(state, '', url2);
        });

        it('should use `browserHistoryApiWrappers` if it is setted', () => {
            const wrappers = { push: jest.fn() };

            const url1 = '/another-page';
            const url2 = '/another-page2';
            const state = {};

            const inst = new NativeNavigationAndTitleService(
                mockedNativeParamsServiceInstance,
                wrappers,
            );

            inst.navigateClientSide(url1);
            expect(wrappers.push).toHaveBeenCalledWith(url1, null);

            inst.navigateClientSide(url2, state);
            expect(wrappers.push).toHaveBeenCalledWith(url2, state);

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

        afterAll(() => {
            saveNativeHistoryStackSpy.mockRestore();
        });

        const link = 'https://example.com';
        const defaultPostFix = 'theme=light&b2n-next-page-id=2'; // добавляет `prepareExternalLinkBeforeOpen` на основе мока `mockedNativeParamsServiceInstance`

        it('should call `location.assign` with correct URL', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            inst.navigateServerSide(link);
            expect(locationAssignSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    href: `${link}/?${defaultPostFix}`,
                }),
            );
        });

        it('should include `nativeTitle` in URL query', () => {
            const testTitle = 'Test Title';
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            inst.navigateServerSide(link, testTitle);
            expect(locationAssignSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    href: `${link}/?b2n-title=Test+Title&${defaultPostFix}`,
                }),
            );
        });

        it('should call `saveNativeHistoryStack` before triggering navigation', () => {
            let syncHistoryWithNativeCallTime: number;
            let locationAssignCallTime: number;

            saveNativeHistoryStackSpy.mockImplementationOnce(() => {
                syncHistoryWithNativeCallTime = performance.now();
            });

            locationAssignSpy.mockImplementationOnce(() => {
                locationAssignCallTime = performance.now();
            });

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            inst.navigateServerSide(link);
            expect(syncHistoryWithNativeCallTime).toBeLessThan(locationAssignCallTime);
        });
    });

    describe('method `reload`', () => {
        it('should push `TemporaryReloadStub` to nativeHistoryStack', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);
            // @ts-expect-error –– Используем приватное свойство
            const initialLength = inst.nativeHistoryStack.length;

            inst.reload();

            // @ts-expect-error –– Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toHaveLength(initialLength + 1);
            // @ts-expect-error –– Проверяем приватное свойство
            expect(inst.nativeHistoryStack[inst.nativeHistoryStack.length - 1]).toBe(1); // 1 — значение `TemporaryReloadStub` из enum
        });

        it('should call `saveNativeHistoryStack` without parameters', () => {
            const saveNativeHistoryStackSpy = jest.spyOn(
                NativeNavigationAndTitleService.prototype,
                // @ts-expect-error -- Мокаем приватный метод
                'saveNativeHistoryStack',
            ) as jest.SpyInstance;

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            inst.reload();

            expect(saveNativeHistoryStackSpy).toHaveBeenCalledWith();

            saveNativeHistoryStackSpy.mockRestore();
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

            inst.setInitialView();
            expect(syncHistoryWithNativeSpy).toHaveBeenCalled();

            syncHistoryWithNativeSpy.mockRestore();
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
        it('should truncate `nativeHistoryStack` and reset `numOfBackSteps`', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', 'Title 2', 'Title 3'];
            // @ts-expect-error –– Мокаем приватное свойство
            inst.numOfBackSteps = 2;

            // @ts-expect-error –– Тестируем приватное свойство
            inst.handleClientSideNavigationBack();
            // @ts-expect-error –– Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual(['Title 1']);
            // @ts-expect-error –– Проверяем приватное свойство
            expect(inst.numOfBackSteps).toBe(1);
        });

        it('should call `syncHistoryWithNative` after truncating stack', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', 'Title 2', 'Title 3'];

            // @ts-expect-error –– Тестируем приватное свойство
            inst.handleClientSideNavigationBack();

            expect(mockedCloseWebviewUtil).not.toHaveBeenCalled();
            // @ts-expect-error –– Тестируем приватное свойство
            expect(inst.syncHistoryWithNative).toHaveBeenCalled();
        });

        it('should close webview if `nativeHistoryStack` becomes empty', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error –– Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1'];
            // @ts-expect-error –– Мокаем приватное свойство
            inst.numOfBackSteps = 1;

            // @ts-expect-error –– Тестируем приватное свойство
            inst.handleClientSideNavigationBack();
            expect(mockedCloseWebviewUtil).toHaveBeenCalled();
            // @ts-expect-error –– Тестируем приватное свойство
            expect(inst.syncHistoryWithNative).not.toHaveBeenCalled();
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

            // @ts-expect-error -- Проверям приватный метод
            expect(NativeNavigationAndTitleService.hasSavedHistoryStack()).toBeTruthy();
        });

        it('should return false if `bridgeToNativeHistoryStack` is not detected', () => {
            // @ts-expect-error -- Проверям приватный метод
            expect(NativeNavigationAndTitleService.hasSavedHistoryStack()).toBeFalsy();
        });
    });

    describe('method `initializeNativeHistoryStack`', () => {
        let saveNativeHistoryStackSpy: jest.SpyInstance;

        beforeAll(() => {
            saveNativeHistoryStackSpy = jest.spyOn(
                NativeNavigationAndTitleService.prototype,
                // @ts-expect-error -- Мокаем приватный метод
                'saveNativeHistoryStack',
            );
        });

        beforeEach(() => {
            initializeNativeHistoryStackSpy.mockRestore();
        });

        afterEach(() => {
            sessionStorage.clear();
        });

        afterAll(() => {
            saveNativeHistoryStackSpy.mockRestore();
        });

        it('should initialize stack with nextPageId scenario', () => {
            const mockedParamsService = {
                ...mockedNativeParamsServiceInstance,
                nextPageId: 3,
                title: 'Title 3',
            } as NativeParamsService;

            const inst = new NativeNavigationAndTitleService(mockedParamsService);

            // @ts-expect-error – Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual([0, 0, 'Title 3']); // 0 — значение `TemporaryReloadStub` из enum
            expect(syncHistoryWithNativeSpy).toHaveBeenCalled();
        });

        it('should restore stack with sessionStorage scenario', () => {
            const readAndUpdateNativeHistoryStackSessionStorageSpy = jest.spyOn(
                NativeNavigationAndTitleService.prototype,
                // @ts-expect-error –– Мокаем приватный метод
                'readAndUpdateNativeHistoryStackSessionStorage',
            ) as jest.SpyInstance;

            const sessionStorageValue = JSON.stringify(['Title']);

            sessionStorage.setItem(SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK, sessionStorageValue);

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error – Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual(['Title']);
            expect(readAndUpdateNativeHistoryStackSessionStorageSpy).toHaveBeenCalled();
            expect(syncHistoryWithNativeSpy).toHaveBeenCalled();

            readAndUpdateNativeHistoryStackSessionStorageSpy.mockRestore();
        });

        it('should handle invalid sessionStorage value gracefully', () => {
            sessionStorage.setItem(SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK, 'broken-json');

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error – Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual(['']);
        });

        it('should initialize stack with default scenario', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error – Проверяем приватное свойство
            expect(inst.nativeHistoryStack).toEqual(['Title 1']);
            expect(syncHistoryWithNativeSpy).toHaveBeenCalled();
        });
    });

    describe('method `prepareExternalLinkBeforeOpen`', () => {
        it('should append `originalWebviewParams` and `nextPageId`', () => {
            const url = 'https://example.com';
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error -- Проверям приватный метод
            const result = inst.prepareExternalLinkBeforeOpen(url);

            expect(result.href).toBe('https://example.com/?theme=light&b2n-next-page-id=2');
        });

        it('should handle existing query parameters', () => {
            const url = 'https://example.com/?existing=param';
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error -- Проверям приватный метод
            const result = inst.prepareExternalLinkBeforeOpen(url);

            expect(result.href).toBe(
                'https://example.com/?existing=param&theme=light&b2n-next-page-id=2',
            );
        });

        it('should increment nextPageId correctly', () => {
            const url = 'https://example.com';
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error – Мокаем приватное свойство
            inst.nativeHistoryStack = ['Title 1', 'Title 2'];

            // @ts-expect-error – Проверяем приватный метод
            const result = inst.prepareExternalLinkBeforeOpen(url);

            expect(result.searchParams.get(QUERY_B2N_NEXT_PAGEID)).toBe('3');
        });
    });

    describe('method `readAndUpdateNativeHistoryStackSessionStorage`', () => {
        afterEach(() => {
            sessionStorage.clear();
        });

        it('should throw while there is no data in sessionStorage', () => {
            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            try {
                // @ts-expect-error -- Проверяем приватный метод
                inst.readAndUpdateNativeHistoryStackSessionStorage();
                expect(false).toBeTruthy();
            } catch {
                expect(true).toBeTruthy();
            }
        });

        it('should successfully parse data in sessionStorage', () => {
            const serializedValue = JSON.stringify(['Title 1', 'Title 2']);

            sessionStorage.setItem(SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK, serializedValue);

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error -- Проверяем приватный метод
            expect(inst.readAndUpdateNativeHistoryStackSessionStorage()).toEqual([
                'Title 1',
                'Title 2',
            ]);
        });

        it('should handle reload scenario', () => {
            const serializedValue = JSON.stringify(['Title 1', 'Title 2', 1]); // 1 — значение `TemporaryReloadStub` из enum

            sessionStorage.setItem(SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK, serializedValue);

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error -- Проверяем приватный метод
            expect(inst.readAndUpdateNativeHistoryStackSessionStorage()).toEqual([
                'Title 1',
                'Title 2',
            ]);
        });

        it('should throw while there is invalid data is sessionStorage', () => {
            sessionStorage.setItem(SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK, 'invalid-json');

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            try {
                // @ts-expect-error -- Проверяем приватный метод
                inst.readAndUpdateNativeHistoryStackSessionStorage();
                expect(false).toBeTruthy();
            } catch {
                expect(true).toBeTruthy();
            }
        });

        it('should log error on throw', () => {
            const logError = jest.fn();

            const inst = new NativeNavigationAndTitleService(
                mockedNativeParamsServiceInstance,
                undefined,
                logError,
            );

            try {
                // @ts-expect-error -- Проверяем приватный метод
                inst.readAndUpdateNativeHistoryStackSessionStorage();
            } catch {
                expect(logError).toHaveBeenCalledWith(expect.any(String), expect.any(Error));
            }
        });

        it('should update sessionStorage correctly', () => {
            sessionStorage.setItem(
                SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK,
                JSON.stringify(['Title 1', 'Title 2']),
            );

            const inst = new NativeNavigationAndTitleService(mockedNativeParamsServiceInstance);

            // @ts-expect-error -- Проверяем приватный метод
            inst.readAndUpdateNativeHistoryStackSessionStorage();

            const newSessionStorageValue = sessionStorage.getItem(
                SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK,
            );

            expect(newSessionStorageValue).toEqual(JSON.stringify(['Title 1']));
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
});
