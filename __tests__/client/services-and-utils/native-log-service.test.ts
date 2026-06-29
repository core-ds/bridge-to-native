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
});
