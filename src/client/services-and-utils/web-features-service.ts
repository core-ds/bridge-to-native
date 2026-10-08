import {
    type ModernAction,
    type WebFeaturesGeoConfiguration,
    type WebFeaturesHapticsOptions,
    type WebFeaturesSheetDragArea,
} from '../types';

import { type NativeBridgeService } from './native-bridge-service';
import { canUseWebFeature } from './native-features';
import { type NativeParamsService } from './native-params-service';

/**
 * Доменный сервис фич WebFeatures (iOS, АМ ≥ 17.0.0).
 *
 * Инкапсулирует гейт доступности по платформе и версии NA и формирует
 * данные для вызовов через {@link NativeBridgeService}.
 */
export class WebFeaturesService {
    constructor(
        private nativeParamsService: NativeParamsService,
        private nativeBridgeService: NativeBridgeService,
    ) {}

    getGeoConfiguration(): Promise<WebFeaturesGeoConfiguration> {
        if (!this.isAvailable('geo.configuration')) {
            return Promise.reject(
                new Error('WebFeatures: geo.configuration is unavailable in this environment'),
            );
        }

        return this.nativeBridgeService.call<WebFeaturesGeoConfiguration>('geo.configuration', {});
    }

    vibrate({ type, intensity }: WebFeaturesHapticsOptions) {
        if (!this.isAvailable('haptics.vibrate')) {
            return;
        }

        this.nativeBridgeService.send('haptics.vibrate', {
            type,
            ...(intensity === undefined ? {} : { intensity }),
        });
    }

    setSheetDragArea(area: WebFeaturesSheetDragArea) {
        if (!this.isAvailable('sheet.setDragArea')) {
            return;
        }

        this.nativeBridgeService.send('sheet.setDragArea', { area });
    }

    hideTabbar() {
        if (!this.isAvailable('tabbar.hide')) {
            return;
        }

        this.nativeBridgeService.send('tabbar.hide', {});
    }

    showTabbar() {
        if (!this.isAvailable('tabbar.show')) {
            return;
        }

        this.nativeBridgeService.send('tabbar.show', {});
    }

    private isAvailable(action: ModernAction) {
        return canUseWebFeature(
            this.nativeParamsService.environment,
            this.nativeParamsService.appVersion,
            action,
        );
    }
}
