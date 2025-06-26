import { type BrowserHistoryAbstractions, type Environment, type NativeFeatureKey } from './types';

/**
 * Временный!!! посредник (пока «божественный»), введённый, чтобы избавиться от круговых зависимостей
 * и не глушить TS по поводу использования приватных методов.
 */
export class Mediator {
    constructor(
        public AndroidBridge: typeof window.Android,
        public appId: string,
        public browserHistoryAbstractions: BrowserHistoryAbstractions | undefined,
        public canUseNativeFeature: (feature: NativeFeatureKey) => boolean,
        public closeWebview: () => void,
        public environment: Environment,
        public originalWebviewParams: string,
        public restorePreviousState: () => void,
    ) {}
}
