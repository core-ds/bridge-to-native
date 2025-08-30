import { NATIVE_FEATURES_FROM_VERSION, VERSION_TO_IOS_APP_ID } from '../../src/client/constants';

const versionPattern = /^\d+.\d+.\d+$/;

describe('BridgeToAm constants', () => {
    describe('versionToIosAppId', () => {
        it('should have keys as valid versions', () => {
            Object.keys(VERSION_TO_IOS_APP_ID).forEach((version) => {
                expect(version).toMatch(versionPattern);
            });
        });

        it('should have `"0.0.0": "alfabank"` as the first entry', () => {
            const [firstVersion, firstAppId] = Object.entries(VERSION_TO_IOS_APP_ID)[0];

            expect(firstVersion).toBe('0.0.0');
            expect(firstAppId).toBe('alfabank');
        });

        it('should have entries in ASC order by keys', () => {
            // Кейс содержит логику, что вроде бы плохо. Но он важен именно
            // в таком виде, т.к. содержит проверку, что в будущем константу
            // будут заполнять правильно.
            const originalKeys = Object.keys(VERSION_TO_IOS_APP_ID);

            const orderdKeys = originalKeys.slice().sort((a, b) => {
                const aComponents = a.split('.');
                const bComponents = b.split('.');

                for (let i = 0; i < aComponents.length; i++) {
                    if (aComponents[i] !== bComponents[i]) {
                        return Number(aComponents[i]) - Number(bComponents[i]);
                    }
                }

                return 0;
            });

            expect(originalKeys).toEqual(orderdKeys);
        });
    });

    describe('amFeaturesFromVersion', () => {
        it('should have valid versions as values', () => {
            const { android, ios } = NATIVE_FEATURES_FROM_VERSION;

            Object.values(android).forEach(({ fromVersion }) => {
                expect(fromVersion).toMatch(versionPattern);
            });

            Object.values(ios).forEach(({ fromVersion }) => {
                expect(fromVersion).toMatch(versionPattern);
            });
        });
    });
});
