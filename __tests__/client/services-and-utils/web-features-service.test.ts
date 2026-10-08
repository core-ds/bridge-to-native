import { type NativeBridgeService } from '../../../src/client/services-and-utils/native-bridge-service';
import { type NativeParamsService } from '../../../src/client/services-and-utils/native-params-service';
import { WebFeaturesService } from '../../../src/client/services-and-utils/web-features-service';

const createService = (environment: 'android' | 'ios', appVersion: string) => {
    const nativeBridgeService = {
        send: jest.fn(),
        call: jest.fn(),
    } as unknown as NativeBridgeService;

    const nativeParamsService = {
        environment,
        appVersion,
    } as NativeParamsService;

    return {
        service: new WebFeaturesService(nativeParamsService, nativeBridgeService),
        bridge: nativeBridgeService,
    };
};

describe('WebFeaturesService', () => {
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

            (bridge.call as jest.Mock).mockResolvedValueOnce(nativeData);

            await expect(service.getGeoConfiguration()).resolves.toEqual(nativeData);
            expect(bridge.call).toHaveBeenCalledWith('geo.configuration', {});
        });

        it('should resolve with userCoordinate null when permission is denied', async () => {
            const { service, bridge } = createService('ios', '17.0.0');
            const nativeData = { permission: 'denied' as const, userCoordinate: null };

            (bridge.call as jest.Mock).mockResolvedValueOnce(nativeData);

            await expect(service.getGeoConfiguration()).resolves.toEqual(nativeData);
        });
    });
});
