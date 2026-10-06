import { type GeoConfiguration, type HapticsOptions, type SheetDragArea } from '../types';

import { installCallback, pendingRequests, sendMessage } from './utils';

export class NativeMessagesService {
    // eslint-disable-next-line class-methods-use-this
    getGeoConfiguration(data: Record<string, never> | null = {}): Promise<GeoConfiguration> {
        return new Promise((resolve, reject) => {
            const requestId = crypto.randomUUID();

            const timeout = setTimeout(() => {
                pendingRequests.delete(requestId);
                reject(new Error('Native bridge geolocation request timed out'));
            }, 10000);

            const cleanup = () => {
                clearTimeout(timeout);
                pendingRequests.delete(requestId);
            };

            pendingRequests.set(requestId, {
                resolve: (result) => {
                    cleanup();
                    resolve(result);
                },
                reject: (error) => {
                    cleanup();
                    reject(error);
                },
            });

            try {
                installCallback();
                sendMessage({
                    kind: 'call',
                    action: 'geo.configuration',
                    requestId,
                    data,
                });
            } catch (error) {
                cleanup();
                reject(error);
            }
        });
    }

    vibrate(options: HapticsOptions) {
        if (options.intensity !== undefined && (options.intensity < 0 || options.intensity > 1)) {
            throw new RangeError('Haptic intensity must be between 0 and 1');
        }
        this.send('haptics.vibrate', options);
    }

    setSheetDragArea(area: SheetDragArea) {
        this.send('sheet.setDragArea', { area });
    }

    hideTabbar() {
        this.send('tabbar.hide', {});
    }

    showTabbar() {
        this.send('tabbar.show', {});
    }

    // eslint-disable-next-line class-methods-use-this
    private send(action: string, data: object) {
        sendMessage({ kind: 'send', action, requestId: crypto.randomUUID(), data });
    }
}
