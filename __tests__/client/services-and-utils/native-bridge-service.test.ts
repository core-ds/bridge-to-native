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
        it('should send via webkit through the iOS bridge', () => {
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

        it('should send via Android when webkit is absent', () => {
            const androidSend = jest.fn();

            const androidCall = jest.fn();

            setWindow({ Android: { send: androidSend, call: androidCall } });

            const inst = new NativeBridgeService();

            inst.send('tabbar.hide', {});

            expect(androidSend).toHaveBeenCalledTimes(1);
            expect(androidCall).not.toHaveBeenCalled();

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

        it('should reject when Android.call is absent even if send exists', async () => {
            const send = jest.fn();

            setWindow({ Android: { send } });

            const inst = new NativeBridgeService();

            await expect(inst.call('geo.configuration', {})).rejects.toThrow();
            expect(send).not.toHaveBeenCalled();
        });

        it('should call Android.call with JSON including kind and resolve the response', async () => {
            const call = jest.fn();
            const send = jest.fn();

            setWindow({ Android: { call, send } });

            const inst = new NativeBridgeService();
            const promise = inst.call('geo.configuration', {});
            const body = JSON.parse(call.mock.calls[0][0]);

            expect(body).toEqual({
                kind: 'call',
                action: 'geo.configuration',
                requestId: expect.any(String),
                data: {},
            });
            expect(send).not.toHaveBeenCalled();
            window.webBridge?.callback?.(body.requestId, {
                data: { permission: 'denied', userCoordinate: null },
                error: null,
            });
            await expect(promise).resolves.toEqual({ permission: 'denied', userCoordinate: null });
        });

        it('should resolve on webBridge.callback success', async () => {
            const nativeSend = jest.fn();

            setWindow({ webkit: { messageHandlers: { bridge: { postMessage: nativeSend } } } });

            const inst = new NativeBridgeService();
            const promise = inst.call('geo.configuration', {});
            const requestId = nativeSend.mock.calls[0][0].requestId as string;

            expect(nativeSend).toHaveBeenCalledWith({
                action: 'geo.configuration',
                requestId,
                data: {},
                kind: 'call',
            });

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

            setWindow({ webkit: { messageHandlers: { bridge: { postMessage: nativeSend } } } });

            const inst = new NativeBridgeService();
            const promise = inst.call('geo.configuration', {});
            const requestId = nativeSend.mock.calls[0][0].requestId as string;

            window.webBridge?.callback?.(requestId, {
                data: null,
                error: { code: 1, message: 'geo unavailable' },
            });

            await expect(promise).rejects.toThrow('geo unavailable');
        });

        it('should reject on timeout', async () => {
            jest.useFakeTimers();

            const nativeSend = jest.fn();

            setWindow({ webkit: { messageHandlers: { bridge: { postMessage: nativeSend } } } });

            const inst = new NativeBridgeService();
            const promise = inst.call('geo.configuration', {});

            jest.advanceTimersByTime(CALL_TIMEOUT_MS);

            await expect(promise).rejects.toThrow();
        });

        it('should route independent responses for concurrent calls', async () => {
            const nativeSend = jest.fn();

            setWindow({ webkit: { messageHandlers: { bridge: { postMessage: nativeSend } } } });

            const inst = new NativeBridgeService();
            const first = inst.call('geo.configuration', {});
            const second = inst.call('geo.configuration', {});

            const firstId = nativeSend.mock.calls[0][0].requestId as string;
            const secondId = nativeSend.mock.calls[1][0].requestId as string;

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
