import { type Environment, type NoopOptions } from '../types';

export class NativeExecuteService {
    constructor(
        private isNoop?: NoopOptions['enabled'],
        private environment?: Environment,
    ) {}

    execute(action: string, fn: () => void, payload?: unknown) {
        if (this.isNoop) {
            console.info(`[B2N noop][${this.environment}] ${action}`, payload);

            return;
        }

        fn();
    }
}
