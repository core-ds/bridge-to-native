import {
    type GeoConfiguration,
    type HapticsOptions,
    type LogError,
    type ModernAction,
    type SheetDragArea,
} from '../types';

import { ModernBridgeService } from './modern-bridge-service';
import { canUseNativeCommand } from './native-features';
import { type NativeParamsService } from './native-params-service';

/**
 * Сервис команд для взаимодействия WA с NA (iOS, NA ≥ 17.0.0):
 * геолокация, тактильный отклик, нативная штора и таббар.
 *
 * Инкапсулирует гейт доступности по платформе и версии NA и формирует
 * данные для вызовов через {@link ModernBridgeService}.
 */
export class NativeCommandsService {
    constructor(
        private nativeParamsService: NativeParamsService,
        logError?: LogError,
        private isSheetWebview = true,
    ) {
        this.modernBridgeService = new ModernBridgeService(logError);
    }

    private modernBridgeService: ModernBridgeService;

    getGeoConfiguration(): Promise<GeoConfiguration> {
        if (!this.isAvailable('geo.configuration')) {
            return Promise.reject(
                new Error(
                    'NativeCommandsService: geo.configuration is unavailable in this environment',
                ),
            );
        }

        return this.modernBridgeService.call<GeoConfiguration>('geo.configuration', {});
    }

    vibrate({ type, intensity }: HapticsOptions, isFTEnabled: boolean) {
        if (!isFTEnabled || !this.isAvailable('haptics.vibrate')) {
            return;
        }

        this.modernBridgeService.send('haptics.vibrate', {
            type,
            ...(intensity === undefined ? {} : { intensity }),
        });
    }

    setSheetDragArea(area: SheetDragArea) {
        if (!this.isAvailable('sheet.setDragArea')) {
            return;
        }

        this.modernBridgeService.send('sheet.setDragArea', { area });
    }

    hideTabbar() {
        if (!this.isAvailable('tabbar.hide')) {
            return;
        }

        this.modernBridgeService.send('tabbar.hide', {});
    }

    showTabbar() {
        if (!this.isAvailable('tabbar.show')) {
            return;
        }

        this.modernBridgeService.send('tabbar.show', {});
    }

    private isAvailable(action: ModernAction) {
        return (
            this.isSheetWebview &&
            canUseNativeCommand(
                this.nativeParamsService.environment,
                this.nativeParamsService.appVersion,
                action,
            )
        );
    }
}
