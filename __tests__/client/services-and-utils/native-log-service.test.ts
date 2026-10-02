import { NativeLogService } from '../../../src/client/services-and-utils/native-log-service';

describe('NativeLogService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should not execute fn when noop is enabled', () => {
        const fn = jest.fn();

        const service = new NativeLogService('ios', '14.0.0', true);

        service.execute('test', fn);

        expect(fn).not.toHaveBeenCalled();
    });

    it('should execute fn when noop is disabled', () => {
        const fn = jest.fn();

        const service = new NativeLogService('ios', '14.0.0', false);

        service.execute('test', fn);

        expect(fn).toHaveBeenCalled();
    });

    it('should include environment and version in noop log', () => {
        console.info = jest.fn();

        const service = new NativeLogService('android', '12.30.0', true);

        service.execute('test action', jest.fn(), { payload: { foo: 'bar' } });

        expect(console.info).toHaveBeenCalledWith('[B2N noop][android][v12.30.0] test action', {
            foo: 'bar',
        });
    });

    it("should log feature fallback when feature isn't available", () => {
        console.info = jest.fn();

        const service = new NativeLogService('android', '12.20.0', true);

        service.execute('handleNativeDeeplink', jest.fn(), {
            featureContext: {
                feature: 'savedBackStack',
                fallbackReason: 'savedBackStack is available',
            },
            payload: { deeplink: '/deeplink' },
        });

        expect(console.info).toHaveBeenCalled();

        const [message, payload] = (console.info as jest.Mock).mock.calls[0];

        expect(message).toContain('[B2N noop][android][v12.20.0]');
        expect(message).toContain('Feature: savedBackStack');
        expect(message).toContain('savedBackStack is available');
        expect(message).toContain('Будет исправлено в версии: 12.30.0');

        expect(payload).toEqual({ deeplink: '/deeplink' });
    });

    it('should not log feature fallback when feature is available', () => {
        console.info = jest.fn();

        const service = new NativeLogService('android', '12.31.0', true);

        service.execute('handleNativeDeeplink', jest.fn(), {
            payload: { deeplink: '/deeplink' },
        });

        expect(console.info).toHaveBeenCalled();

        const [message, payload] = (console.info as jest.Mock).mock.calls[0];

        expect(message).toContain('[B2N noop][android][v12.31.0]');
        expect(payload).toEqual({ deeplink: '/deeplink' });
        expect(message).not.toContain('Feature:');
    });
});
