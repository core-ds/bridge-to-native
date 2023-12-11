/* eslint-disable @typescript-eslint/dot-notation -- отключено, чтобы можно было обращаться к приватным полям для их тестирования */

import { BridgeToNative } from '../src';
import { PREVIOUS_B2N_STATE_STORAGE_KEY } from '../src/constants';
import { mockSessionStorage } from '../src/mock/mock-session-storage';
import { WebViewWindow } from '../src/types';

const mockedNativeFallbacksInstance = {};
const mockedNativeNavigationAndTitleInstance = {
    saveCurrentState: jest.fn(),
};
const MockedNativeNavigationAndTitleConstructor = jest.fn(
    () => mockedNativeNavigationAndTitleInstance,
);

jest.mock('../src/native-fallbacks', () => ({
    __esModule: true,
    NativeFallbacks: function MockedNativeFallbacksConstructor() {
        return mockedNativeFallbacksInstance;
    },
}));

jest.mock('../src/native-navigation-and-title', () => ({
    __esModule: true,
    get NativeNavigationAndTitle() {
        return MockedNativeNavigationAndTitleConstructor;
    },
}));

describe('BridgeToNative', () => {
    const defaultAmFeaturesFts = {
        linksInBrowserAndroid: true,
        linksInBrowserIos: true,
    };

    const defaultAmParams = {
        appVersion: '12.0.0',
        theme: 'light',
        nextPageId: null,
        originalWebviewParams: '',
    };
    const mockedHandleRedirect = jest.fn();

    describe('sessionStorage interaction', () => {
        const savedBridgeToAmState = {
            appVersion: '12.25.83',
            iosAppId: 'aconcierge',
            theme: 'dark',
            originalWebviewParams: 'title=Title',
            nextPageId: null,
        };

        // const { getItem, setItem, removeItem } = mockSessionStorage({
        //     [PREVIOUS_B2N_STATE_STORAGE_KEY]: savedBridgeToAmState,
        // });
        const { getItem, setItem } = mockSessionStorage(
            PREVIOUS_B2N_STATE_STORAGE_KEY,
            savedBridgeToAmState,
        );

        afterAll(() => {
            getItem.mockReset();
        });

        describe('constructor', () => {
            it('should call `restorePreviousState` method if it has previous state into sessionStorage', () => {
                const originalRestorePreviousStateMethod =
                    BridgeToNative.prototype['restorePreviousState'];

                BridgeToNative.prototype['restorePreviousState'] = jest.fn();

                const inst = new BridgeToNative(defaultAmFeaturesFts, mockedHandleRedirect, {
                    ...defaultAmParams,
                    title: 'Initial Title',
                });

                expect(getItem).toBeCalledWith(PREVIOUS_B2N_STATE_STORAGE_KEY);
                expect(inst['restorePreviousState']).toBeCalled();

                BridgeToNative.prototype['restorePreviousState'] =
                    originalRestorePreviousStateMethod;
            });
        });

        describe('method `saveCurrentState`', () => {
            it('should save current state into sessionStorage and call `AmNavigationAndTitle.saveCurrentState`', () => {
                const inst = new BridgeToNative(
                    defaultAmFeaturesFts,
                    mockedHandleRedirect,
                    defaultAmParams,
                );

                const currentB2amState = {
                    appVersion: inst['appVersion'],
                    theme: inst['theme'],
                    nextPageId: inst['nextPageId'],
                    originalWebviewParams: inst['originalWebviewParams'],
                    iosAppId: inst['iosAppId'],
                };

                inst['saveCurrentState']();
                expect(inst.nativeNavigationAndTitle['saveCurrentState']).toBeCalled();
                expect(setItem).toBeCalledWith(
                    PREVIOUS_B2N_STATE_STORAGE_KEY,
                    JSON.stringify(currentB2amState),
                );
            });
        });

        describe('method `restorePreviousState`', () => {
            it('should get previous state from sessionStorage and restore it and cleared storage', () => {
                // JSON.parse = jest.fn().mockImplementationOnce(() => savedBridgeToAmState);

                const inst = new BridgeToNative(
                    defaultAmFeaturesFts,
                    mockedHandleRedirect,
                    defaultAmParams,
                );

                inst['restorePreviousState']();

                expect(getItem).toBeCalledWith(PREVIOUS_B2N_STATE_STORAGE_KEY);

                // expect(inst['appVersion']).toBe(savedBridgeToAmState.appVersion);
                // expect(inst['iosAppId']).toBe(savedBridgeToAmState.iosAppId);
                // expect(inst['theme']).toBe(savedBridgeToAmState.theme);
                // expect(inst['originalWebviewParams']).toBe(
                //     savedBridgeToAmState.originalWebviewParams,
                // );
                // expect(inst['nextPageId']).toBe(savedBridgeToAmState.nextPageId);
                //
                // expect(removeItem).toBeCalledWith(PREVIOUS_B2N_STATE_STORAGE_KEY);
            });
        });
    });

    describe('constructor and methods', () => {
        let androidEnvFlag = false;
        let windowSpy: any;

        beforeEach(() => {
            windowSpy = jest.spyOn(window, 'window', 'get');

            windowSpy.mockImplementation(() => ({
                ...(androidEnvFlag ? { Android: {} } : undefined),
            }));
        });

        afterEach(() => {
            androidEnvFlag = false;
            windowSpy.mockRestore();
        });

        describe('constructor', () => {
            it('should pass `initialAmTitle` to `AmNavigationAndTitle` constructor', () => {
                const inst = new BridgeToNative(defaultAmFeaturesFts, mockedHandleRedirect, {
                    ...defaultAmParams,
                    title: 'Initial Title',
                });

                expect(MockedNativeNavigationAndTitleConstructor).toBeCalledWith(
                    inst,
                    null,
                    'Initial Title',
                    mockedHandleRedirect,
                );
            });
        });

        describe('public props', () => {
            it('should save theme used by AM in `theme` property', () => {
                const inst1 = new BridgeToNative(
                    defaultAmFeaturesFts,
                    mockedHandleRedirect,
                    defaultAmParams,
                );
                const inst2 = new BridgeToNative(defaultAmFeaturesFts, mockedHandleRedirect, {
                    ...defaultAmParams,
                    theme: 'dark',
                });

                expect(inst1.theme).toBe('light');
                expect(inst2.theme).toBe('dark');
            });

            it('should save original AM query params in `originalWebviewParams` property', () => {
                const originalWebviewParamsExample =
                    'device_uuid=8441576F-A09F-41E9-89A7-EE1FA486C20A&device_id=2E32AFD5-F50B-4B2F-B758-CAE59DF2BF6C&applicationId=1842D0AA-0008-4941-93E0-4FD80E087841&device_os_version=com.aconcierge.app&device_app_version=iOS 16.1&scope=12.26.0&device_boot_time=openid mobile-bank';
                const inst = new BridgeToNative(defaultAmFeaturesFts, mockedHandleRedirect, {
                    ...defaultAmParams,
                    originalWebviewParams: originalWebviewParamsExample,
                });

                expect(inst.originalWebviewParams).toBe(originalWebviewParamsExample);
            });

            it('should save nextPageId in `nextPageId` property and send it into `AmNavigationAndTitle` constructor', () => {
                const inst = new BridgeToNative(defaultAmFeaturesFts, mockedHandleRedirect, {
                    ...defaultAmParams,
                    title: 'Test',
                    nextPageId: 7,
                });

                // removeItem
                expect(inst['nextPageId']).toBe(7);
                expect(MockedNativeNavigationAndTitleConstructor).toBeCalledWith(
                    inst,
                    7,
                    'Test',
                    mockedHandleRedirect,
                );
            });

            it('should provide `NativeFallbacks` instance', () => {
                const inst = new BridgeToNative(
                    defaultAmFeaturesFts,
                    mockedHandleRedirect,
                    defaultAmParams,
                );

                expect(inst.nativeFallbacks).toEqual(mockedNativeFallbacksInstance);
            });

            it('should provide `AmNavigationAndTitle` instance', () => {
                const inst = new BridgeToNative(
                    defaultAmFeaturesFts,
                    mockedHandleRedirect,
                    defaultAmParams,
                );

                expect(inst.nativeNavigationAndTitle).toEqual(
                    mockedNativeNavigationAndTitleInstance,
                );
            });

            describe('Android environment', () => {
                beforeEach(() => {
                    androidEnvFlag = true;
                });

                it('should provide `AndroidBridge` property', () => {
                    const inst = new BridgeToNative(
                        defaultAmFeaturesFts,
                        mockedHandleRedirect,
                        defaultAmParams,
                    );

                    expect(inst.AndroidBridge).toEqual((window as WebViewWindow).Android);
                });

                it('should set `environment` property correctly', () => {
                    const inst = new BridgeToNative(
                        defaultAmFeaturesFts,
                        mockedHandleRedirect,
                        defaultAmParams,
                    );

                    expect(inst.environment).toBe('android');
                });

                it('should not provide application type using `iosAppId` property', () => {
                    const ins = new BridgeToNative(
                        defaultAmFeaturesFts,
                        mockedHandleRedirect,
                        defaultAmParams,
                    );

                    expect(ins.iosAppId).not.toBeDefined();
                });
            });

            describe('iOS environment', () => {
                it('should not provide `AndroidBridge` property', () => {
                    const ins = new BridgeToNative(
                        defaultAmFeaturesFts,
                        mockedHandleRedirect,
                        defaultAmParams,
                    );

                    expect(ins.AndroidBridge).not.toBeDefined();
                });

                it('should set `environment` property correctly', () => {
                    const ins = new BridgeToNative(
                        defaultAmFeaturesFts,
                        mockedHandleRedirect,
                        defaultAmParams,
                    );

                    expect(ins.environment).toBe('ios');
                });

                it.each([
                    ['11.1.1', 'alfabank'],
                    ['12.21.99', 'alfabank'],
                    ['12.22.0', 'aconcierge'],
                    ['12.22.1', 'aconcierge'],
                    ['12.25.83', 'aconcierge'],
                    ['12.26.0', 'kittycash'],
                    ['12.30.99', 'kittycash'],
                    ['12.31.0', 'aweassist'],
                    ['13.0.0', 'aweassist'],
                ])(
                    'should detect app scheme for version %s correctly and save it in `iosAppId` property',
                    (appVersion, expected) => {
                        const ins = new BridgeToNative(defaultAmFeaturesFts, mockedHandleRedirect, {
                            ...defaultAmParams,
                            appVersion,
                        });

                        expect(ins.iosAppId).toBe(expected);
                    },
                );

                it('should use `iosAppId` parameter as value for `iosApplicationId` while parameter exists', () => {
                    const inst1 = new BridgeToNative(defaultAmFeaturesFts, mockedHandleRedirect, {
                        ...defaultAmParams,
                        appVersion: '0.0.0',
                        iosAppId: 'kittycash',
                    });
                    const inst2 = new BridgeToNative(defaultAmFeaturesFts, mockedHandleRedirect, {
                        ...defaultAmParams,
                        appVersion: '12.22.0',
                        iosAppId: 'kittycash',
                    });

                    expect(inst1.iosAppId).toBe('kittycash');
                    expect(inst2.iosAppId).toBe('kittycash');
                });
            });
        });

        describe('method `canUseNativeFeature`', () => {
            it.each([
                [false, 'is too low', 'iOS', '13.2.99'],
                [true, 'is minimum required', 'iOS', '13.3.0'],
                [true, 'is higher than minimum required', 'iOS', '14.0.0'],
                [false, 'is too low', 'Android', '11.70.99'],
                [true, 'is minimum required', 'Android', '11.71.0'],
                [true, 'is higher than minimum required', 'Android', '12.0.0'],
            ])(
                'should return `%s` for feature while AM version %s in %s environment',
                (expected, _, env, appVersion) => {
                    if (env === 'Android') {
                        androidEnvFlag = true;
                    }

                    const inst = new BridgeToNative(defaultAmFeaturesFts, mockedHandleRedirect, {
                        ...defaultAmParams,
                        appVersion,
                    });

                    expect(inst.canUseNativeFeature('linksInBrowser')).toBe(expected);
                },
            );

            it('should return `false` for feature while FT is off', () => {
                const inst = new BridgeToNative(
                    { ...defaultAmFeaturesFts, linksInBrowserIos: false },
                    mockedHandleRedirect,
                    { ...defaultAmParams, appVersion: '14.0.0' },
                );

                expect(inst.canUseNativeFeature('linksInBrowser')).toBeFalsy();
            });
        });

        describe('method `closeWebview`', () => {
            // В тестовом окружении дескриптор свойства `window.localtion.href` не configurable,
            // поэтоу не проверить его изменение (метод просто присваивает новое значение этому свойству).
        });

        describe('method `isCurrentVersionHigherOrEqual`', () => {
            it.each([
                ['5.0.0', '0.0.0', true],
                ['0.0.0', '5.0.0', false],
                ['5.0.0', '5.0.0', true],
                ['1.3.4', '1.2.4', true],
                ['1.3.4', '1.4.4', false],
                ['1.2.3', '1.2.2', true],
                ['1.2.3', '1.2.3', true],
                ['1.2.3', '1.2.4', false],
                ['2.3.4', '1.2.3', true],
                ['2.3.4', '3.4.5', false],
                ['1.99.0', '2.0.0', false],
                ['2.0.0', '1.99.0', true],
                ['1.1.1', '1.1.0', true],
                ['1.1.0', '1.1.1', false],
            ])(
                'should compare current version `%s` with `%s` and return `%s`',
                (currentVersion, versionToCompare, result) => {
                    const inst = new BridgeToNative(defaultAmFeaturesFts, mockedHandleRedirect, {
                        ...defaultAmParams,

                        appVersion: currentVersion,
                    });

                    expect(inst.isCurrentVersionHigherOrEqual(versionToCompare)).toBe(result);
                },
            );
        });

        describe('method `getIosAppId`', () => {
            it('should return `undefined` in Android environment', () => {
                androidEnvFlag = true;

                const inst = new BridgeToNative(
                    defaultAmFeaturesFts,
                    mockedHandleRedirect,
                    defaultAmParams,
                );

                expect(inst['getIosAppId']()).toBeUndefined();
                expect(inst['getIosAppId']('aconcierge')).toBeUndefined();
            });

            it.each([
                ['1.0.0', 'alfabank'],
                ['12.0.0', 'alfabank'],
                ['12.21.0', 'alfabank'],
                ['12.21.99', 'alfabank'],
                ['12.22.0', 'aconcierge'],
                ['12.22.1', 'aconcierge'],
                ['12.25.0', 'aconcierge'],
                ['12.25.99', 'aconcierge'],
                ['12.26.0', 'kittycash'],
                ['12.30.99', 'kittycash'],
                ['12.31.0', 'aweassist'],
                ['13.0.0', 'aweassist'],
            ])(
                'should detect app scheme for version `%s` as `%s` while parameter is not passed',
                (version, appId) => {
                    const inst = new BridgeToNative(defaultAmFeaturesFts, mockedHandleRedirect, {
                        ...defaultAmParams,
                        appVersion: version,
                    });

                    expect(inst['getIosAppId']()).toBe(appId);
                },
            );

            it('should use app scheme from parameter', () => {
                const inst = new BridgeToNative(defaultAmFeaturesFts, mockedHandleRedirect, {
                    ...defaultAmParams,
                    appVersion: '1.0.0',
                });

                expect(inst['getIosAppId']('aconcierge')).toBe('aconcierge');
            });
        });
    });
});
