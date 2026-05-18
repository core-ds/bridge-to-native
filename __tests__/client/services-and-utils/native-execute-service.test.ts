import { NativeExecuteService } from '../../../src/client/services-and-utils/native-execute-service';

describe('ExternalLinksService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('method `handleNativeDeeplink`', () => {
        it('should not execute fn when noop is enabled', () => {
            const fn = jest.fn();

            const service = new NativeExecuteService(true, 'ios');

            service.execute('test', fn);

            expect(fn).not.toHaveBeenCalled();
        });

        it('should execute fn when noop is disabled', () => {
            const fn = jest.fn();

            const service = new NativeExecuteService(false, 'ios');

            service.execute('test', fn);

            expect(fn).toHaveBeenCalled();
        });

        it('should include environment in noop log', () => {
            console.info = jest.fn();

            const service = new NativeExecuteService(true, 'android');

            service.execute('test action', jest.fn(), { foo: 'bar' });

            expect(console.info).toHaveBeenCalledWith('[B2N noop][android] test action', {
                foo: 'bar',
            });
        });
    });
});
