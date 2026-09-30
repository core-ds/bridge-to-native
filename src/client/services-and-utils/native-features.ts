import { NATIVE_FEATURES_FROM_VERSION } from '../constants';
import { type Environment, type NativeFeatureKey } from '../types';

const VERSION_FORMAT_PATTERN = /^\d+\.\d+\.\d+$/;

export const isValidVersionFormat = (version?: string): version is string =>
    Boolean(version) && VERSION_FORMAT_PATTERN.test(version as string);

/**
 * Сравнивает версии формата `x.y.z` покомпонентно, как числа.
 * Если хоть одна из версий в другом формате — возвращает `false`.
 */
export const isVersionHigherOrEqual = (version: string, versionToCompare: string) => {
    if (!isValidVersionFormat(version) || !isValidVersionFormat(versionToCompare)) {
        return false;
    }

    const versionComponents = version.split('.').map(Number);
    const versionToCompareComponents = versionToCompare.split('.').map(Number);

    for (let i = 0; i < versionComponents.length; i++) {
        if (versionComponents[i] !== versionToCompareComponents[i]) {
            return versionComponents[i] > versionToCompareComponents[i];
        }
    }

    return true;
};

/**
 * Проверяет, поддерживает ли NA указанной платформы и версии нативную фичу.
 * Версия в неизвестном формате считается `0.0.0`.
 */
export const canUseNativeFeature = (
    platform: Environment,
    appVersion: string,
    feature: NativeFeatureKey,
) => {
    const { fromVersion } = NATIVE_FEATURES_FROM_VERSION[platform][feature];

    return isVersionHigherOrEqual(
        isValidVersionFormat(appVersion) ? appVersion : '0.0.0',
        fromVersion,
    );
};
