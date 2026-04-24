import { type Environment, type NoopOptions } from '../types';

export class NativeExecuteService {
    constructor(
        private noop?: NoopOptions,
        private environment?: Environment,
    ) {}

    execute(action: string, fn: () => void, payload?: unknown) {
        if (this.noop?.enabled) {
            console.info(`[B2N noop][${this.environment}] ${action}`, payload);

            return;
        }

        fn();
    }
}
