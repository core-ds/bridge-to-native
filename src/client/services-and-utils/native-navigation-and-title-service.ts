import {
    QUERY_B2N_NEXT_PAGEID,
    QUERY_B2N_TITLE,
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

/**
 * Сервис, отвечающий за взаимодействие WA с WV компонентами NA —
 * «заголовком» и кнопкой «назад».
 */
export class NativeNavigationAndTitleService {
    // Здесь храниться состояние связи WA с NA. Сервис всегда ориентируется на этот стек,
    // чтобы вычислить, какие `pageId` и `pageTitle` отправить в NA.
    private nativeHistoryStack: string[];

    // Поле, помогающее правильно обработать переход «назад» на несколько шагов.
    private numOfBackSteps = 1;

    // Здесь сохраняются параметры, которые в последний раз были отправлены
    // в NA. Помогает предотвратить повторную отправку одинаковых параметров.
    private lastSetPageSettingsParams = '';

    constructor(
        private nativeParamsService: NativeParamsService,
        private browserHistoryApiWrappers?: BrowserHistoryApiWrappers,
        private logError?: LogError,
    ) {
        this.handleClientSideNavigationBack = this.handleClientSideNavigationBack.bind(this);
        window.addEventListener('popstate', this.handleClientSideNavigationBack); // Без отписки т.к. Сервис используется в течение всей жизни WA

        this.initializeNativeHistoryStack();
    }

    // eslint-disable-next-line class-methods-use-this -- удобней использовать метод в контексте экземпляра.
    closeWebview() {
        closeWebviewUtil();
    }

    goBack() {
        this.goBackAFewStepsClientSide(-1, true);
    }

    goBackAFewStepsClientSide(stepsNumber: number, autoCloseWebview = false) {
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
            this.browserHistoryApiWrappers?.push(url, state);
        } else {
            window.history.pushState(state, '', url);
        }

        this.nativeHistoryStack.push(nativeTitle);
        this.syncHistoryWithNative();
    }

    navigateServerSide(link: LocationAssignParam, nativeTitle = '') {
        const url = link instanceof URL ? link : new URL(link);

        if (nativeTitle) {
            url.searchParams.set(QUERY_B2N_TITLE, nativeTitle);
        }

        // TODO: Предыдущая реализация на iOS открывала новое WV. Возможно, что-то плохо работало,
        // обязательно протестировать.
        this.saveNativeHistoryStack();

        window.location.assign(this.prepareExternalLinkBeforeOpen(url));
    }

    setInitialView(nativeTitle = '') {
        this.nativeHistoryStack = [nativeTitle];
        this.syncHistoryWithNative();
    }

    setTitle(nativeTitle: string) {
        this.nativeHistoryStack[this.nativeHistoryStack.length - 1] = nativeTitle;
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
    private handleClientSideNavigationBack() {
        this.nativeHistoryStack = this.nativeHistoryStack.slice(0, -this.numOfBackSteps);
        this.numOfBackSteps = 1;

        if (this.nativeHistoryStack.length < 1) {
            closeWebviewUtil();

            return;
        }

        this.syncHistoryWithNative();
    }

    private static hasSavedHistoryStack() {
        return sessionStorage.getItem(SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK) !== null;
    }

    /**
     * Инициализирует `nativeHistoryStack`, учитывая варианты:
     * - Инициализация при открытии WV (Сценарий 1);
     * - Инициализация при server-side навигации в рамках одной WV-сессии (Сценарий 2);
     * - Инициализация при server-side переходе «назад» по истории (Сценарий 3).
     */
    private initializeNativeHistoryStack() {
        const { nextPageId, title } = this.nativeParamsService;

        if (nextPageId) {
            // Сценарий 2 – `nextPageId` ставит метод `this.navigateServerSide`,
            // т.е. это инициализация сразу после перехода server-side навигацией.
            this.nativeHistoryStack = new Array(nextPageId).fill(''); // Заголовки другого WA здесь не интересны.
            this.nativeHistoryStack[this.nativeHistoryStack.length - 1] = title;
        } else if (NativeNavigationAndTitleService.hasSavedHistoryStack()) {
            // Сценарий 3 - в sessionStorage есть сохранённый nativeHistoryStack,
            // значит это инициализация сразу после перехода назад server-side навигацией.
            try {
                this.nativeHistoryStack = this.readNativeHistoryStackSessionStorage();
                this.saveNativeHistoryStack(true);
            } catch {
                this.nativeHistoryStack = [''];
            }
        } else {
            // Сценарий 1 - запись в sessionStorage ставит метод `this.navigateServerSide`,
            // её нет, значит это инициализация сразу после открытия WV.
            this.nativeHistoryStack = [title];
        }

        this.syncHistoryWithNative();
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
        const divider = new URL(url).searchParams.toString() ? '&' : '?';

        const modifiedUrl = new URL(
            `${url}${divider}${this.nativeParamsService.originalWebviewParams}`,
        );

        modifiedUrl.searchParams.set(QUERY_B2N_NEXT_PAGEID, (currentPageId + 1).toString());

        return modifiedUrl;
    }

    private readNativeHistoryStackSessionStorage() {
        try {
            const nativeHistoryStack = sessionStorage.getItem(
                SS_KEY_BRIDGE_TO_NATIVE_HISTORY_STACK,
            );

            if (!nativeHistoryStack) {
                throw new Error();
            }

            return JSON.parse(nativeHistoryStack);
        } catch (e) {
            if (this.logError) {
                this.logError(
                    'Клиентский код B2N не смог восстановить `nativeHistoryStack` из sessionStorage. ' +
                        'Могут возникнуть проблемы с кнопкой «Назад» в NA.',
                    e,
                );
            }

            throw new Error();
        }
    }

    /**
     * Метод для сохранения состояния связи текущего WA с NA при server-side навигации.
     *
     * Метод используется в двух случаях:
     * 1. Перед уходом server-side навигацией на другое WA или страницу текущего WA.
     * 2. Сразу после перехода назад server-side навигацией — в этом случае требуется
     *  сериализованный массив в sessionStorage уменьшить на одну запись, для возможного последующего
     *  перехода назад server-side навигацией в рамках одного домена (т.к. sessionStorage общий).
     *
     * @param hasJustGoneBackward Флаг, для случая №2 (см. описание).
     */
    private saveNativeHistoryStack(hasJustGoneBackward = false) {
        const stackToSave = hasJustGoneBackward
            ? this.nativeHistoryStack.slice(0, -1)
            : this.nativeHistoryStack;

        const serializedNativeHistoryStack = JSON.stringify(stackToSave);

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
}
