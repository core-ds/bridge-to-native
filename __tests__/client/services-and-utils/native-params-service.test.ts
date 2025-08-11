import { NativeParamsService } from '../../../src/client/services-and-utils/native-params-service';
import { COOKIE_KEY_BRIDGE_TO_NATIVE_DATA } from '../../../src/query-and-headers-keys';

describe('NativeParamsService', () => {
    const AndroidBridge = {};
    const originalWindow = window;

    const emulateAndroidEnv = () => {
        // eslint-disable-next-line no-global-assign
        window = Object.create(window);
        Object.defineProperty(window, 'Android', {
            value: AndroidBridge,
            writable: true,
        });
    };

    const emulateClientCookieWithBridgeToNativeData = () => {
        const bridgeToNativeData = { appId: '1.2.3', appVersion: 'kittycash' };
        const encodedBridgeToNativeData = encodeURIComponent(JSON.stringify(bridgeToNativeData));

        document.cookie = 'foo=bar';
        document.cookie = `${COOKIE_KEY_BRIDGE_TO_NATIVE_DATA}=${encodedBridgeToNativeData}`;
        document.cookie = 'baz=foo';

        return bridgeToNativeData;
    };

    afterEach(() => {
        document.cookie = 'foo=; max-age=-1';
        document.cookie = `${COOKIE_KEY_BRIDGE_TO_NATIVE_DATA}=; max-age=-1`;
        document.cookie = 'baz=; max-age=-1';
        // eslint-disable-next-line no-global-assign
        window = originalWindow;
    });

    describe('Initialization', () => {
        it('should set AndroidBridge in android evironment', () => {
            emulateAndroidEnv();

            const inst = new NativeParamsService();

            expect(inst.AndroidBridge).toBe(AndroidBridge);
        });

        it('should not set AndroidBridge not in android environment', () => {
            const inst = new NativeParamsService();

            expect(inst.AndroidBridge).not.toBeDefined();
        });

        it('should set default appId', () => {
            const inst = new NativeParamsService();

            expect(inst.appId).toBe('alfabank');
        });

        it('should set appId', () => {
            // См. `VERSION_TO_IOS_APP_ID` в `src/client/constants.ts`.
            const kittyAppId = 'kittycash';
            const kittyVersion = '12.26.0';

            jest.spyOn(
                NativeParamsService.prototype,
                'readNativeParamsCookie',
            ).mockImplementationOnce(() => ({
                appVersion: kittyVersion,
            }));

            const inst = new NativeParamsService();

            expect(inst.appId).toBe(kittyAppId);
        });

        it('should set default appVersion', () => {
            const inst = new NativeParamsService();

            expect(inst.appVersion).toBe('0.0.0');
        });

        it('should set appVersion', () => {
            const testVersion = '1.2.3';

            jest.spyOn(
                NativeParamsService.prototype,
                'readNativeParamsCookie',
            ).mockImplementationOnce(() => ({
                appVersion: testVersion,
            }));

            const inst = new NativeParamsService();

            expect(inst.appVersion).toBe(testVersion);
        });

        it('should set ios environment', () => {
            const inst = new NativeParamsService();

            expect(inst.environment).toBe('ios');
        });

        it('should set android environment', () => {
            emulateAndroidEnv();

            const inst = new NativeParamsService();

            expect(inst.environment).toBe('android');
        });

        it('should set default nextPageId', () => {
            const inst = new NativeParamsService();

            expect(inst.nextPageId).toBeNull();
        });

        it('should set nextPageId', () => {
            const nextPageId = 10;

            jest.spyOn(
                NativeParamsService.prototype,
                'readNativeParamsCookie',
            ).mockImplementationOnce(() => ({
                nextPageId,
            }));

            const inst = new NativeParamsService();

            expect(inst.nextPageId).toBe(nextPageId);
        });

        it('should set default originalWebviewParams', () => {
            const inst = new NativeParamsService();

            expect(inst.originalWebviewParams).toBeNull();
        });

        it('should set originalWebviewParams', () => {
            const originalWebviewParams = 'theme=dark';

            jest.spyOn(
                NativeParamsService.prototype,
                'readNativeParamsCookie',
            ).mockImplementationOnce(() => ({
                originalWebviewParams,
            }));

            const inst = new NativeParamsService();

            expect(inst.originalWebviewParams).toBe(originalWebviewParams);
        });

        it('should set default theme', () => {
            const inst = new NativeParamsService();

            expect(inst.theme).toBe('light');
        });

        it('should set theme', () => {
            const theme = 'dark';

            jest.spyOn(
                NativeParamsService.prototype,
                'readNativeParamsCookie',
            ).mockImplementationOnce(() => ({
                theme,
            }));

            const inst = new NativeParamsService();

            expect(inst.theme).toBe(theme);
        });

        it('should set default title', () => {
            const inst = new NativeParamsService();

            expect(inst.title).toBe('');
        });

        it('should set title', () => {
            const title = 'Test Title';

            jest.spyOn(
                NativeParamsService.prototype,
                'readNativeParamsCookie',
            ).mockImplementationOnce(() => ({
                title,
            }));

            const inst = new NativeParamsService();

            expect(inst.title).toBe(title);
        });
    });

    describe('method canUseNativeFeature', () => {
        it.each([
            [false, 'is too low', 'iOS', '13.2.99'],
            [true, 'is minimum required', 'iOS', '13.3.0'],
            [true, 'is higher than minimum required', 'iOS', '14.0.0'],
            [false, 'is too low', 'Android', '11.70.99'],
            [true, 'is minimum required', 'Android', '11.71.0'],
            [true, 'is higher than minimum required', 'Android', '12.0.0'],
        ])(
            'should return %s for feature while AM version %s in %s environment',
            (expected, _, env, appVersion) => {
                if (env === 'Android') {
                    emulateAndroidEnv();
                }

                jest.spyOn(
                    NativeParamsService.prototype,
                    'readNativeParamsCookie',
                ).mockImplementationOnce(() => ({ appVersion }));

                const inst = new NativeParamsService();

                expect(inst.canUseNativeFeature('linksInBrowser')).toBe(expected);
            },
        );
    });

    describe('method isCurrentVersionHigherOrEqual', () => {
        it.each([
            ['5.0.0', '0.0.0', true],
            ['0.0.0', '5.0.0', false],
            ['0.0.1', 'unknown', false],
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
            'should compare current version %s with %s and return %s',
            (currentVersion, versionToCompare, result) => {
                jest.spyOn(
                    NativeParamsService.prototype,
                    'readNativeParamsCookie',
                ).mockImplementationOnce(() => ({ appVersion: currentVersion }));

                const inst = new NativeParamsService();

                expect(inst.isCurrentVersionHigherOrEqual(versionToCompare)).toBe(result);
            },
        );
    });

    describe('method isValidVersionFormat', () => {
        it.each([
            ['0.1.2', true],
            ['0.1.2.', false],
            ['0.1.2.3', false],
            ['0.1.', false],
            ['0.1', false],
            ['1.2.3', true],
            ['11.12.13', true],
            ['12.1.12', true],
            ['111.22.3', true],
            ['3.44.555', true],
            ['6666.7777.8888', true],
            ['hello', false],
            ['10.infinity.1', false],
        ])('should check version %s and return %s', (version, result) => {
            // @ts-expect-error -- Проверка private метода
            expect(NativeParamsService.isValidVersionFormat(version)).toBe(result);
        });
    });

    describe('method getAppId', () => {
        it('should always return alfabank in Android environment', () => {
            emulateAndroidEnv();

            const inst = new NativeParamsService();

            // @ts-expect-error -- Проверка private метода
            expect(inst.getAppId()).toBe('alfabank');
            // @ts-expect-error -- Проверка private метода
            expect(inst.getAppId('aconcierge')).toBe('alfabank');
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
            ['13.1.99', 'kittycash'],
            ['13.2.0', 'triptally'],
            ['13.3.99', 'triptally'],
            ['13.4.0', 'cashline'],
            ['13.4.99', 'cashline'],
            ['13.5.0', 'assistmekz'],
            ['14.4.99', 'assistmekz'],
            ['14.5.00', 'smartfinancementor'],
        ])(
            'should detect app scheme for version %s as %s while parameter is not passed',
            (appVersion, appId) => {
                jest.spyOn(
                    NativeParamsService.prototype,
                    'readNativeParamsCookie',
                ).mockImplementationOnce(() => ({ appVersion }));

                const inst = new NativeParamsService();

                // @ts-expect-error -- Проверка private метода
                expect(inst.getAppId()).toBe(appId);
            },
        );

        it('should use app scheme from parameter', () => {
            const inst = new NativeParamsService();

            // @ts-expect-error -- Проверка private метода
            expect(inst.getAppId('aconcierge')).toBe('aconcierge');
        });
    });

    describe('method readNativeParamsCookie', () => {
        it('should parse and return data from cookie', () => {
            const expectedCookieData = emulateClientCookieWithBridgeToNativeData();

            const inst = new NativeParamsService();

            // @ts-expect-error -- Проверка private метода
            expect(inst.readNativeParamsCookie()).toMatchObject(expectedCookieData);
        });

        it('should return null while there is no bridgeToNativeData cookie', () => {
            const inst = new NativeParamsService();

            // @ts-expect-error -- Проверка private метода
            expect(inst.readNativeParamsCookie()).toBeNull();
        });

        it('should set nativeParamsReadErrorFlag to true when there is no bridgeToNativeData cookie', () => {
            const inst = new NativeParamsService();

            // @ts-expect-error -- Проверка private метода
            inst.readNativeParamsCookie();
            expect(inst.nativeParamsReadErrorFlag).toBeTruthy();
        });

        it('should log error while there is no bridgeToNativeData cookie', () => {
            const logError = jest.fn();
            const inst = new NativeParamsService(logError);

            // @ts-expect-error -- Проверка private метода
            inst.readNativeParamsCookie();
            expect(logError).toHaveBeenCalledWith(expect.any(String), expect.any(Error));
        });
    });
});
