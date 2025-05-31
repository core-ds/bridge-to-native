import { extractNativeServiceQueries } from '../extract-native-service-queries';

describe('extractNativeServiceQueries', () => {
    it.each([
        {
            received:
                'foo=skip&applicationId=store&client_id=store&bar=skip&scope=store&baz=skip&theme=store',
            expected: 'applicationId=store&client_id=store&scope=store&theme=store',
        },
        {
            received: 'device_app_id=store&device_app_version=store&foo=skip',
            expected: 'device_app_id=store&device_app_version=store',
        },
        {
            received:
                'foo=skip&bar=skip&device_boot_time=store&device_id=store&device_locale=store&device_model=store&baz=skip',
            expected:
                'device_boot_time=store&device_id=store&device_locale=store&device_model=store',
        },
        {
            received: 'device_name=store&device_os_version=store',
            expected: 'device_name=store&device_os_version=store',
        },
        { received: 'foo=skip&bar=skip&baz=skip', expected: '' },
        {
            received:
                'device_timezone=store&foo=skip&device_uuid=store&bar=skip&paySupported=store&baz=skip',
            expected: 'device_timezone=store&device_uuid=store&paySupported=store',
        },
    ])('should return "$expected" when received "$received"', ({ expected, received }) => {
        const mockedRequest = {
            url: `http://example.com?${received}`,
        } as Request;

        expect(extractNativeServiceQueries(mockedRequest)).toBe(expected);
    });
});
