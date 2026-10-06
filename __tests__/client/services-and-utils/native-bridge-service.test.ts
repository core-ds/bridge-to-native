import {
    CALL_TIMEOUT_MS,
    NativeBridgeService,
} from '../../../src/client/services-and-utils/native-bridge-service';

describe('NativeBridgeService', () => {
    const originalWindow = window;

    const setWindow = (props: Record<string, unknown>) => {
        // eslint-disable-next-line no-global-assign
        window = Object.create(originalWindow);

        Object.entries(props).forEach(([key, value]) => {
            Object.defineProperty(window, key, {
                value,
                writable: true,
                configurable: true,
            });
        });
    };

    afterEach(() => {
        jest.restoreAllMocks();
        jest.useRealTimers();
        // eslint-disable-next-line no-global-assign
        window = originalWindow;
    });

    describe('send', () => {
        it('should send via webkit when window.nativeBridge is absent', () => {
            const postMessage = jest.fn();

            setWindow({ webkit: { messageHandlers: { bridge: { postMessage } } } });

            const inst = new NativeBridgeService();

            inst.send('haptics.vibrate', { type: 'medium' });

            expect(postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    kind: 'send',
                    action: 'haptics.vibrate',
                    data: { type: 'medium' },
                }),
            );
        });

        it('should prefer window.nativeBridge.send when defined', () => {
            const nativeSend = jest.fn();
            const postMessage = jest.fn();

            setWindow({
                nativeBridge: { send: nativeSend },
                webkit: { messageHandlers: { bridge: { postMessage } } },
            });

            const inst = new NativeBridgeService();

            inst.send('haptics.vibrate', { type: 'medium' });

            expect(nativeSend).toHaveBeenCalledWith(
                'haptics.vibrate',
                expect.any(String),
                { type: 'medium' },
                'send',
            );
            expect(postMessage).not.toHaveBeenCalled();
        });

        it('should send via Android when nativeBridge and webkit are absent', () => {
            const androidSend = jest.fn();

            setWindow({ Android: { send: androidSend } });

            const inst = new NativeBridgeService();

            inst.send('tabbar.hide', {});

            expect(androidSend).toHaveBeenCalledTimes(1);

            const [rawBody] = androidSend.mock.calls[0];
            const body = JSON.parse(rawBody as string);

            expect(body).toEqual(
                expect.objectContaining({
                    kind: 'send',
                    action: 'tabbar.hide',
                    data: {},
                }),
            );
        });

        it('should not throw when window.Android exists without send', () => {
            setWindow({ Android: {} });

            const inst = new NativeBridgeService();

            expect(() => inst.send('haptics.vibrate', { type: 'medium' })).not.toThrow();
        });

        it('should not throw when no transport is available', () => {
            setWindow({});

            const inst = new NativeBridgeService();

            expect(() => inst.send('haptics.vibrate', { type: 'medium' })).not.toThrow();
        });
    });

    describe('call', () => {
        it('should reject when no transport is available', async () => {
            setWindow({});

            const inst = new NativeBridgeService();

            await expect(inst.call('geo.configuration', {})).rejects.toThrow();
        });

        it('should reject when window.Android exists without send', async () => {
            setWindow({ Android: {} });

            const inst = new NativeBridgeService();

            await expect(inst.call('geo.configuration', {})).rejects.toThrow();
        });

        it('should resolve on webBridge.callback success', async () => {
            const nativeSend = jest.fn();

            setWindow({ nativeBridge: { send: nativeSend } });

            const inst = new NativeBridgeService();
            const promise = inst.call('geo.configuration', {});
            const requestId = nativeSend.mock.calls[0][1] as string;

            expect(nativeSend).toHaveBeenCalledWith('geo.configuration', requestId, {}, 'call');

            window.webBridge?.callback?.(requestId, {
                data: { permission: 'allowed', userCoordinate: null },
                error: null,
            });

            await expect(promise).resolves.toEqual({
                permission: 'allowed',
                userCoordinate: null,
            });
        });

        it('should reject on webBridge.callback error', async () => {
            const nativeSend = jest.fn();

            setWindow({ nativeBridge: { send: nativeSend } });

            const inst = new NativeBridgeService();
            const promise = inst.call('geo.configuration', {});
            const requestId = nativeSend.mock.calls[0][1] as string;

            window.webBridge?.callback?.(requestId, {
                data: null,
                error: { code: 1, message: 'geo unavailable' },
            });

            await expect(promise).rejects.toThrow('geo unavailable');
        });

        it('should reject on timeout', async () => {
            jest.useFakeTimers();

            const nativeSend = jest.fn();

            setWindow({ nativeBridge: { send: nativeSend } });

            const inst = new NativeBridgeService();
            const promise = inst.call('geo.configuration', {});

            jest.advanceTimersByTime(CALL_TIMEOUT_MS);

            await expect(promise).rejects.toThrow();
        });

        it('should route independent responses for concurrent calls', async () => {
            const nativeSend = jest.fn();

            setWindow({ nativeBridge: { send: nativeSend } });

            const inst = new NativeBridgeService();
            const first = inst.call('geo.configuration', {});
            const second = inst.call('geo.configuration', {});

            const firstId = nativeSend.mock.calls[0][1] as string;
            const secondId = nativeSend.mock.calls[1][1] as string;

            expect(firstId).not.toBe(secondId);

            window.webBridge?.callback?.(secondId, { data: { order: 'second' }, error: null });
            window.webBridge?.callback?.(firstId, { data: { order: 'first' }, error: null });

            await expect(first).resolves.toEqual({ order: 'first' });
            await expect(second).resolves.toEqual({ order: 'second' });
        });
    });

    describe('webBridge.callback', () => {
        it('should preserve a pre-existing callback for unknown requestId', () => {
            const existing = jest.fn();

            setWindow({ webBridge: { callback: existing } });

            // eslint-disable-next-line no-new
            new NativeBridgeService();

            window.webBridge?.callback?.('unknown-id', { data: null, error: null });

            expect(existing).toHaveBeenCalledWith('unknown-id', { data: null, error: null });
        });
    });
});
