import { nativeFeaturesFromVersion, versionToIosAppId } from '../src/constants';

const versionPattern = /^\d+.\d+.\d+$/;

describe('BridgeToAm constants', () => {
    describe('versionToIosAppId', () => {
        it('should have keys as valid versions', () => {
            Object.keys(versionToIosAppId).forEach((version) => {
                expect(version).toMatch(versionPattern);
            });
        });

        it('should have `"0.0.0": "YWxmYWJhbms="` as the first entry', () => {
            const [firstVersion, firstAppId] = Object.entries(versionToIosAppId)[0];

            expect(firstVersion).toBe('0.0.0');
            expect(firstAppId).toBe('YWxmYWJhbms=');
        });

        it('should have entries in ASC order by keys', () => {
            // Кейс содержит логику, что вроде бы плохо. Но он важен именно
            // в таком виде, т.к. содержит проверку, что в будущем константу
            // будут заполнять правильно.
            const originalKeys = Object.keys(versionToIosAppId);

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
            const { android, ios } = nativeFeaturesFromVersion;

            Object.values(android).forEach(({ fromVersion }) => {
                expect(fromVersion).toMatch(versionPattern);
            });

            Object.values(ios).forEach(({ fromVersion }) => {
                expect(fromVersion).toMatch(versionPattern);
            });
        });
    });
});
