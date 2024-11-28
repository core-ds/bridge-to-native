import { extractAndJoinOriginalWebviewParams } from '../../src/server/extract-and-join-original-webview-params';

const fastifyRequestQueryExample = {
    first: 'asdasdsddsfdsfsdfdsas-8441576F-A09F-8441576F-A09F',
    device_app_id: '8441576F-A09F-41E9-89A7-EE1FA486C20A',
    device_uuid: '2E32AFD5-F50B-4B2F-B758-CAE59DF2BF6C',
    device_id: '1842D0AA-0008-4941-93E0-4FD80E087841',
    applicationId: 'com.aconcierge.app',
    device_os_version: 'iOS 16.1',
    device_app_version: '12.26.0',
    scope: 'openid mobile-bank',
    device_boot_time: '38933',
    device_name: 'iPhone 14',
    device_timezone: '+0300',
    test3: 'afsdsdfsdf,dsfd',
    client_id: 'mobile-app',
    device_locale: 'ru-US',
    device_model: 'x86_64',
    paySupported: 'true',
    test4: 'etrrtr',
    title: 'Title',
    theme: 'light',
    final: 'dddd',
};

describe('extractAndJoinOriginalWebviewParams', () => {
    it('should return empty string if no original webview query', () => {
        const otherParams = {
            first: 'sdas',
            test: 'qwe',
            test2: 'fggg',
            test3: 'afsd',
            test4: 'etrrtr',
            final: 'dddd',
        };

        expect(extractAndJoinOriginalWebviewParams(otherParams)).toBe('');
    });

    it('should return all original webview query', () => {
        expect(extractAndJoinOriginalWebviewParams(fastifyRequestQueryExample)).toBe(
            'device_app_version=12.26.0&device_os_version=iOS+16.1&device_boot_time=38933&device_timezone=%2B0300&applicationId=com.aconcierge.app&device_app_id=8441576F-A09F-41E9-89A7-EE1FA486C20A&device_locale=ru-US&paySupported=true&device_model=x86_64&device_uuid=2E32AFD5-F50B-4B2F-B758-CAE59DF2BF6C&device_name=iPhone+14&device_id=1842D0AA-0008-4941-93E0-4FD80E087841&client_id=mobile-app&theme=light&scope=openid+mobile-bank',
        );
    });
});
