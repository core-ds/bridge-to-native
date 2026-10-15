import { NativeCommandsService } from '../../../src/client/services-and-utils/native-commands-service';
import { type NativeParamsService } from '../../../src/client/services-and-utils/native-params-service';

const mockedModernBridgeService = { send: jest.fn(), call: jest.fn() };
const MockedModernBridgeServiceConstructor = jest.fn(() => mockedModernBridgeService);

jest.mock('../../../src/client/services-and-utils/modern-bridge-service', () => ({
    get ModernBridgeService() {
        return MockedModernBridgeServiceConstructor;
    },
}));

const createService = (environment: 'android' | 'ios', appVersion: string) => {
    jest.clearAllMocks();

    const nativeParamsService = {
        environment,
        appVersion,
    } as NativeParamsService;

    return {
        service: new NativeCommandsService(nativeParamsService),
        bridge: mockedModernBridgeService,
    };
};

describe('NativeCommandsService', () => {
    describe('send methods gating', () => {
        it.each(['vibrate', 'setSheetDragArea', 'hideTabbar', 'showTabbar'] as const)(
            'should no-op `%s` on android',
            (method) => {
                const { service, bridge } = createService('android', '17.0.0');

                if (method === 'vibrate') {
                    service.vibrate({ type: 'medium' });
                } else if (method === 'setSheetDragArea') {
                    service.setSheetDragArea('navigationBar');
                } else if (method === 'hideTabbar') {
                    service.hideTabbar();
                } else {
                    service.showTabbar();
                }

                expect(bridge.send).not.toHaveBeenCalled();
            },
        );

        it('should no-op send methods below iOS 17.0.0', () => {
            const { service, bridge } = createService('ios', '16.99.99');

            service.vibrate({ type: 'medium' });
            service.setSheetDragArea('navigationBar');
            service.hideTabbar();
            service.showTabbar();

            expect(bridge.send).not.toHaveBeenCalled();
        });
    });

    describe('send methods payload', () => {
        it('should call bridge.send with haptics.vibrate and options on iOS 17', () => {
            const { service, bridge } = createService('ios', '17.0.0');

            service.vibrate({ type: 'medium', intensity: 0.5 });

            expect(bridge.send).toHaveBeenCalledWith('haptics.vibrate', {
                type: 'medium',
                intensity: 0.5,
            });
        });

        it('should omit intensity when not provided', () => {
            const { service, bridge } = createService('ios', '17.0.0');

            service.vibrate({ type: 'light' });

            expect(bridge.send).toHaveBeenCalledWith('haptics.vibrate', { type: 'light' });
        });

        it('should pass intensity for notification type as-is', () => {
            const { service, bridge } = createService('ios', '17.0.0');

            service.vibrate({ type: 'success', intensity: 0.5 });

            expect(bridge.send).toHaveBeenCalledWith('haptics.vibrate', {
                type: 'success',
                intensity: 0.5,
            });
        });

        it('should call bridge.send with sheet.setDragArea', () => {
            const { service, bridge } = createService('ios', '17.0.0');

            service.setSheetDragArea('navigationBar');

            expect(bridge.send).toHaveBeenCalledWith('sheet.setDragArea', {
                area: 'navigationBar',
            });
        });

        it('should call bridge.send with tabbar.hide', () => {
            const { service, bridge } = createService('ios', '17.0.0');

            service.hideTabbar();

            expect(bridge.send).toHaveBeenCalledWith('tabbar.hide', {});
        });

        it('should call bridge.send with tabbar.show without selectedId', () => {
            const { service, bridge } = createService('ios', '17.0.0');

            service.showTabbar();

            expect(bridge.send).toHaveBeenCalledWith('tabbar.show', {});
        });
    });

    describe('getGeoConfiguration', () => {
        it('should reject on android', async () => {
            const { service, bridge } = createService('android', '17.0.0');

            await expect(service.getGeoConfiguration()).rejects.toThrow();
            expect(bridge.call).not.toHaveBeenCalled();
        });

        it('should reject below iOS 17.0.0', async () => {
            const { service, bridge } = createService('ios', '16.99.99');

            await expect(service.getGeoConfiguration()).rejects.toThrow();
            expect(bridge.call).not.toHaveBeenCalled();
        });

        it('should resolve with native data on iOS 17', async () => {
            const { service, bridge } = createService('ios', '17.0.0');
            const nativeData = {
                permission: 'allowed' as const,
                userCoordinate: { latitude: 55.7558, longitude: 37.6173 },
            };

            bridge.call.mockResolvedValueOnce(nativeData);

            await expect(service.getGeoConfiguration()).resolves.toEqual(nativeData);
            expect(bridge.call).toHaveBeenCalledWith('geo.configuration', {});
        });

        it('should resolve with userCoordinate null when permission is denied', async () => {
            const { service, bridge } = createService('ios', '17.0.0');
            const nativeData = { permission: 'denied' as const, userCoordinate: null };

            bridge.call.mockResolvedValueOnce(nativeData);

            await expect(service.getGeoConfiguration()).resolves.toEqual(nativeData);
        });
    });
});

describe('Native command availability warnings', () => {
    afterEach(() => jest.restoreAllMocks());

    it.each([
        ['android', '17.0.0'],
        ['ios', '16.0.0'],
        ['ios', 'invalid'],
    ] as const)('warns for every command on %s %s', async (platform, version) => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const { service, bridge } = createService(platform, version);

        service.vibrate({ type: 'light' });
        service.setSheetDragArea('navigationBar');
        service.hideTabbar();
        service.showTabbar();
        await expect(service.getGeoConfiguration()).rejects.toThrow('unavailable');
        expect(warn).toHaveBeenCalledTimes(5);
        for (const action of [
            'haptics.vibrate',
            'sheet.setDragArea',
            'tabbar.hide',
            'tabbar.show',
            'geo.configuration',
        ]) {
            expect(warn).toHaveBeenCalledWith(expect.stringContaining(action));
        }
        expect(bridge.send).not.toHaveBeenCalled();
        expect(bridge.call).not.toHaveBeenCalled();
    });

    it('does not warn or require feature toggles on supported iOS version', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const { service, bridge } = createService('ios', '17.0.0');

        bridge.call.mockResolvedValueOnce({ permission: 'denied', userCoordinate: null });
        service.vibrate({ type: 'light' });
        service.setSheetDragArea('navigationBar');
        service.hideTabbar();
        service.showTabbar();
        await expect(service.getGeoConfiguration()).resolves.toMatchObject({
            permission: 'denied',
        });
        expect(bridge.send).toHaveBeenCalledTimes(4);
        expect(warn).not.toHaveBeenCalled();
    });
});
