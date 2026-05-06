/* eslint max-lines: ["error", {"max": 350, "skipComments": true}] */

import {
    HISTORY_STATE_KEY_B2N_PAGE_ID,
    QUERY_B2N_NEXT_PAGEID,
    QUERY_B2N_TITLE,
    QUERY_NATIVE_IOS_APPVERSION,
    SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK,
} from '../../query-and-headers-keys';
import {
    type BrowserHistoryApiWrappers,
    type HistoryPushStateParams,
    type LocationAssignParam,
    type LogError,
} from '../types';

import { closeWebviewUtil } from './close-webview-util';
import { type NativeParamsService } from './native-params-service';

type NativeHistoryStack = Array<string | typeof NativeHistoryStackStub>;

const NativeHistoryStackStub = 0;

/**
 * Сервис, отвечающий за взаимодействие WA с WV компонентами NA —
 * «заголовком» и кнопкой «назад».
 *
 * Подробное описание сценариев навигации и логики восстановления состояния при hard навигации
 * см. в документе {@link ./NAVIGATION_SCENARIOS.md}.
 */
export class NativeNavigationAndTitleService {
    // Здесь сохраняются параметры, которые в последний раз были отправлены
    // в NA. Помогает предотвратить повторную отправку одинаковых параметров.
    private lastSetPageSettingsParams = '';

    // Здесь храниться состояние связи WA с NA. Сервис всегда ориентируется на этот стек,
    // чтобы вычислить, какие `pageId` и `pageTitle` отправить в NA.
    // Все изменения в стек должно отражаться в SessionStorage (метод `saveNativeHistoryStack`).
    private nativeHistoryStack: NativeHistoryStack;

    // Поле для фолбэк сценария, чтобы не ломать обратную совместимость в версии `1.4.0`.
    // Фолбэк сцерий используется для потребителей B2N, которые используют
    // прямые вызовы `history.replaceState` (или обертки над ним, типа `history.replace` из ReactRouter)
    // вместо нового метода B2N `replaceHistoryState`
    private numOfBackSteps = 1;

    // Предотвращают повторный вызов навигации, пока текущая не завершена.
    // Без блокировки WV-браузер продолжит показывать исходную страницу,
    // и повторный вызов может инициировать нежелательную навигацию.
    // `isGoBackLocked` снимается в `handleClientSideNavigationBack` (popstate) для soft-навигации;
    // при hard-навигации блокировка снимется автоматически при новой инициализации.
    private isGoBackLocked = false;

    // `isNavigateServerSideLocked` не снимается — после server-side навигации всегда новая инициализация.
    private isNavigateServerSideLocked = false;

    constructor(
        private nativeParamsService: NativeParamsService,
        private browserHistoryApiWrappers?: BrowserHistoryApiWrappers,
        private logError?: LogError,
    ) {
        this.handleClientSideNavigationBack = this.handleClientSideNavigationBack.bind(this);
        window.addEventListener('popstate', this.handleClientSideNavigationBack); // без отписки т.к. Сервис используется в течение всей жизни WA

        this.initializeNativeHistoryStack();
    }

    // eslint-disable-next-line class-methods-use-this -- удобней использовать метод в контексте экземпляра.
    closeWebview() {
        closeWebviewUtil();
    }

    goBack() {
        if (this.isGoBackLocked) {
            return;
        }

        this.isGoBackLocked = true;
        this.goBackAFewSteps(-1, true);
    }

    goBackAFewSteps(stepsNumber: number, autoCloseWebview = false) {
        if (!stepsNumber) {
            return;
        }

        const stepsToBack = Math.abs(stepsNumber);
        const maxStepsToBack = this.nativeHistoryStack.length - 1;

        if (stepsToBack > maxStepsToBack) {
            if (autoCloseWebview) {
                closeWebviewUtil();

                return;
            }

            this.numOfBackSteps = maxStepsToBack;
        } else {
            this.numOfBackSteps = stepsToBack;
        }

        const steps = -this.numOfBackSteps;

        if (this.browserHistoryApiWrappers?.go) {
            this.browserHistoryApiWrappers.go(steps);
        } else {
            window.history.go(steps);
        }

        // Далее сработает подписка на `popstate`, см. метод `handleClientSideNavigationBack`.
    }

    navigateClientSide(
        url: HistoryPushStateParams[2],
        state: HistoryPushStateParams[0] = null,
        nativeTitle = '',
    ) {
        if (this.browserHistoryApiWrappers?.push) {
            this.browserHistoryApiWrappers.push(url, state);
        } else {
            window.history.pushState(state, '', url);
        }

        this.setHistoryStatePageId(true);

        this.nativeHistoryStack.push(nativeTitle);
        this.saveNativeHistoryStack();
        this.syncHistoryWithNative();
    }

    navigateServerSide(link: LocationAssignParam, nativeTitle = '') {
        if (this.isNavigateServerSideLocked) {
            return;
        }

        this.isNavigateServerSideLocked = true;

        const url = link instanceof URL ? link : new URL(link);

        this.nativeHistoryStack.push(nativeTitle || '');

        if (nativeTitle) {
            url.searchParams.set(QUERY_B2N_TITLE, nativeTitle);
        }

        this.saveNativeHistoryStack();
        window.location.assign(this.prepareExternalLinkBeforeOpen(url));
    }

    replaceHistoryState(url?: HistoryPushStateParams[2], state: HistoryPushStateParams[0] = null) {
        if (this.browserHistoryApiWrappers?.replace) {
            this.browserHistoryApiWrappers.replace(url, state);
        } else {
            window.history.replaceState(state, '', url);
        }

        this.setHistoryStatePageId();
    }

    setInitialView(nativeTitle = '') {
        this.nativeHistoryStack = [nativeTitle];
        this.saveNativeHistoryStack();
        this.syncHistoryWithNative();
    }

    setTitle(nativeTitle: string) {
        this.nativeHistoryStack[this.nativeHistoryStack.length - 1] = nativeTitle;
        this.saveNativeHistoryStack();
        this.syncHistoryWithNative();
    }

    /**
     * Метод, вычисляющий `pageId`, который нужно послать в NA
     * для правильной синхронизации с кнопкой "Назад". Также вычисляет `pageTitle`
     * для отправки в NA.
     *
     * @returns Правильный pageId и pageTitle.
     */
    private getNativePageIdAndTitle() {
        // * В iOS для "первой" страницы не нужно слать `pageId`.
        // * В Android важно, чтобы `pageId` «первой» страницы
        //  всегда был одинаковый.

        const stackSize = this.nativeHistoryStack.length;
        const pageTitle = this.nativeHistoryStack[this.nativeHistoryStack.length - 1];

        if (this.nativeParamsService.environment === 'android') {
            return { pageId: stackSize <= 1 ? 1 : stackSize, pageTitle };
        }

        return { pageId: stackSize <= 1 ? null : stackSize, pageTitle };
    }

    /**
     * Обработчик для `window.onpopstate` события. Который сработает
     * после нажатия на кнопку «Назад» в NA, вызова `history.back()` и `history.go(-x)`.
     */
    private handleClientSideNavigationBack(event?: PopStateEvent) {
        this.isGoBackLocked = false;

        const statePageId = (event?.state as Record<string, unknown> | null)?.[
            HISTORY_STATE_KEY_B2N_PAGE_ID
        ];

        if (typeof statePageId === 'number') {
            this.nativeHistoryStack = this.nativeHistoryStack.slice(0, statePageId);
        } else {
            this.nativeHistoryStack = this.nativeHistoryStack.slice(0, -this.numOfBackSteps);
        }

        this.numOfBackSteps = 1;

        if (this.nativeHistoryStack.length < 1) {
            closeWebviewUtil();

            return;
        }

        this.saveNativeHistoryStack();
        this.syncHistoryWithNative();
    }

    // eslint-disable-next-line class-methods-use-this -- удобней использовать метод в контексте экземпляра.
    private hasSavedHistoryStack() {
        return sessionStorage.getItem(SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK) !== null;
    }

    private initializeNativeHistoryStack() {
        const { nextPageId, title } = this.nativeParamsService;
        const hasSS = this.hasSavedHistoryStack();
        const statePageId = (window.history.state as Record<string, unknown> | null)?.[
            HISTORY_STATE_KEY_B2N_PAGE_ID
        ];

        try {
            if (typeof statePageId === 'number') {
                this.nativeHistoryStack = this.initializeForBackward(statePageId, title);
            } else if (nextPageId && !hasSS) {
                this.nativeHistoryStack = this.initializeForNewOrigin(nextPageId, title);
            } else if (nextPageId && hasSS) {
                this.nativeHistoryStack = this.initializeForForward(nextPageId, title);
            } else {
                this.nativeHistoryStack = [title];
            }
        } catch {
            this.nativeHistoryStack = [title];
        }

        this.saveNativeHistoryStack();
        this.syncHistoryWithNative();
        this.setHistoryStatePageId();
    }

    private initializeForBackward(pageId: number, title: string) {
        if (!this.hasSavedHistoryStack()) {
            return [title];
        }

        const savedStack = this.readSavedHistoryStack();
        const stack = savedStack.slice(0, pageId);

        stack[stack.length - 1] = title;

        return stack;
    }

    // eslint-disable-next-line class-methods-use-this -- удобней использовать метод в контексте экземпляра.
    private initializeForNewOrigin(nextPageId: number, title: string) {
        const stack: NativeHistoryStack = new Array(nextPageId).fill(NativeHistoryStackStub);

        stack[stack.length - 1] = title;

        return stack;
    }

    private initializeForForward(nextPageId: number, title: string) {
        const savedStack = this.readSavedHistoryStack();

        if (savedStack.length === nextPageId) {
            savedStack[savedStack.length - 1] = title;

            return savedStack;
        }

        const stack: NativeHistoryStack = new Array(nextPageId).fill(NativeHistoryStackStub);

        for (let i = 0; i < savedStack.length && i < nextPageId; i++) {
            stack[i] = savedStack[i];
        }
        stack[stack.length - 1] = title;

        return stack;
    }

    /**
     * Подготавливает ссылку для корректного перехода server-side навигацией.
     *
     * @param url URL для перехода внутри WA server-side навигацией.
     * @return Подготовленная ссылка для экземпляра B2N следующего WA или
     * экзепляра B2N следующей страницы текущего WA
     */
    private prepareExternalLinkBeforeOpen(url: URL) {
        const currentPageId = this.nativeHistoryStack.length;
        const modifiedUrl = new URL(url);
        const { originalWebviewParams, appVersion } = this.nativeParamsService;

        if (originalWebviewParams) {
            const originalWebviewSearchParams = new URLSearchParams(originalWebviewParams);

            originalWebviewSearchParams.forEach((value, key) => {
                modifiedUrl.searchParams.set(key, value);
            });
        }

        // Явно добавляем query-параметр `device_app_version` используемый NA на iOS, чтобы он был и в Android окружении.
        // Таким образом гарантируется, что версию приложения будет видеть следующее WA
        // (заголовок `app-version` может отсутствовать при server-side переходах).
        modifiedUrl.searchParams.set(QUERY_NATIVE_IOS_APPVERSION, appVersion);

        modifiedUrl.searchParams.set(QUERY_B2N_NEXT_PAGEID, currentPageId.toString());

        return modifiedUrl;
    }

    /**
     * Читает и парсит `nativeHistoryStack` из SessionStorage.
     * При ошибке чтения или парсинга логирует через `logError` и пробрасывает исключение.
     */
    private readSavedHistoryStack() {
        const serialized = sessionStorage.getItem(SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK);

        try {
            if (!serialized) {
                throw new Error(
                    `${SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK} sessionStorage expected not to be null`,
                );
            }

            return JSON.parse(serialized) as NativeHistoryStack;
        } catch (e) {
            if (this.logError) {
                this.logError(
                    `Клиентский код B2N не смог получить ${SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK} из sessionStorage
                    Могут возникнуть проблемы с кнопкой «Назад» в NA.`,
                    e,
                );
            }

            throw e;
        }
    }

    private saveNativeHistoryStack() {
        const serializedNativeHistoryStack = JSON.stringify(this.nativeHistoryStack);

        sessionStorage.setItem(SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK, serializedNativeHistoryStack);
    }

    /**
     * Синхронизирует состояние истории переходов и заголовок с NA в соответствии
     * с `nativeHistoryStack`.
     */
    private syncHistoryWithNative() {
        const { pageId, pageTitle } = this.getNativePageIdAndTitle();

        if (this.nativeParamsService.environment === 'android') {
            const narrowedPageId = pageId ?? 1;
            const paramsToSend = JSON.stringify({ pageId: narrowedPageId, pageTitle });

            if (this.lastSetPageSettingsParams !== paramsToSend) {
                this.nativeParamsService.AndroidBridge?.setPageSettings(paramsToSend);
                this.lastSetPageSettingsParams = paramsToSend;
            }
        } else {
            const pageTitleStr = `?pageTitle=${encodeURIComponent(pageTitle)}`;
            const pageIdStr = pageId ? `&pageId=${pageId}` : '';

            const paramsToSend = `ios:setPageSettings/${pageTitleStr + pageIdStr}`;

            if (this.lastSetPageSettingsParams !== paramsToSend) {
                window.location.replace(paramsToSend);
                this.lastSetPageSettingsParams = paramsToSend;
            }
        }
    }

    private setHistoryStatePageId(useNextPageId = false) {
        const pageId = useNextPageId
            ? this.nativeHistoryStack.length + 1
            : this.nativeHistoryStack.length;
        const newState = this.createStateWithPageId(window.history.state, pageId);

        // `b2n-pageId` всегда записывается на верхний уровень через нативный `replaceState`,
        // а не через wrapper, чтобы wrapper (например, React Router / history) не мог обернуть
        // его внутрь своего формата и скрыть от B2N при чтении `history.state`.
        window.history.replaceState(newState, '');
    }

    // eslint-disable-next-line class-methods-use-this -- удобней использовать метод в контексте экземпляра.
    private createStateWithPageId(
        state: HistoryPushStateParams[0],
        pageId: number,
    ): Record<string, unknown> {
        const isPlainObject = (v: unknown): v is Record<string, unknown> =>
            v !== null && v !== undefined && typeof v === 'object' && !Array.isArray(v);

        return {
            ...(isPlainObject(state) ? state : {}),
            [HISTORY_STATE_KEY_B2N_PAGE_ID]: pageId,
        };
    }
}
