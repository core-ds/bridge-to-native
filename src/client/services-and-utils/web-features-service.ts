import {
    type WebFeatureAction,
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

    /**
     * Запрашивает текущую конфигурацию геолокации.
     *
     * @throws Если фича недоступна в текущем окружении или NA вернул ошибку.
     */
    getGeoConfiguration(): Promise<WebFeaturesGeoConfiguration> {
        if (!this.isAvailable('geo.configuration')) {
            return Promise.reject(
                new Error('WebFeatures: geo.configuration is unavailable in this environment'),
            );
        }

        return this.nativeBridgeService.call<WebFeaturesGeoConfiguration>('geo.configuration', {});
    }

    /**
     * Воспроизводит тактильный отклик.
     */
    vibrate({ type, intensity }: WebFeaturesHapticsOptions) {
        if (!this.isAvailable('haptics.vibrate')) {
            return;
        }

        this.nativeBridgeService.send('haptics.vibrate', {
            type,
            ...(intensity === undefined ? {} : { intensity }),
        });
    }

    /**
     * Задаёт область шторы, за которую можно её перетаскивать.
     */
    setSheetDragArea(area: WebFeaturesSheetDragArea) {
        if (!this.isAvailable('sheet.setDragArea')) {
            return;
        }

        this.nativeBridgeService.send('sheet.setDragArea', { area });
    }

    /**
     * Скрывает нативный таббар.
     */
    hideTabbar() {
        if (!this.isAvailable('tabbar.hide')) {
            return;
        }

        this.nativeBridgeService.send('tabbar.hide', {});
    }

    /**
     * Показывает нативный таббар и, при переданном `selectedId`, выбирает вкладку.
     */
    showTabbar(selectedId?: string) {
        if (!this.isAvailable('tabbar.show')) {
            return;
        }

        this.nativeBridgeService.send(
            'tabbar.show',
            selectedId === undefined ? {} : { selectedId },
        );
    }

    private isAvailable(action: WebFeatureAction) {
        return canUseWebFeature(
            this.nativeParamsService.environment,
            this.nativeParamsService.appVersion,
            action,
        );
    }
}
