import { type Environment, type NoopOptions } from '../../types';
import { NATIVE_FEATURES_FROM_VERSION } from '../constants';
import { type NativeFeatureContext, type NativeFeatureKey } from '../types';

/**
 * Обёртка для выполнения нативных вызовов с noop-режимом и логированием версионных фич
 */
export class NativeLogService {
    constructor(
        private environment: Environment,
        private appVersion: string,
        private isNoop?: NoopOptions['enabled'],
    ) {}

    /**
     * Метод для вывода в консоль информации о недоступности фич,
     * перечисленных в `NATIVE_FEATURES_FROM_VERSION` src/client/constants.ts
     */
    logFeatureFallback(params: {
        feature: NativeFeatureKey;
        fallbackReason: string;
        payload?: unknown;
    }) {
        if (!this.isNoop) return;

        const { fromVersion } = NATIVE_FEATURES_FROM_VERSION[this.environment][params.feature];

        console.info(
            [
                `[B2N noop][${this.environment}][v${this.appVersion}]`,
                `Feature: ${params.feature}`,
                `${params.fallbackReason}`,
                `Будет исправлено в версии: ${fromVersion}`,
            ].join('\n'),
            params.payload,
        );
    }

    /**
     * Метод подменяющий нативный вызов и логирующий его, для работы в noop режиме
     */
    execute(
        action: string,
        fn: () => void,
        meta?: {
            featureContext?: NativeFeatureContext | null;
            payload?: unknown;
        },
    ) {
        if (this.isNoop) {
            if (meta?.featureContext) {
                this.logFeatureFallback({
                    feature: meta.featureContext.feature,
                    fallbackReason: meta.featureContext.fallbackReason ?? '',
                    payload: meta.payload,
                });
            } else {
                console.info(
                    `[B2N noop][${this.environment}][v${this.appVersion}] ${action}`,
                    ...(meta?.payload !== undefined ? [meta.payload] : []),
                );
            }

            return;
        }

        fn();
    }
}
