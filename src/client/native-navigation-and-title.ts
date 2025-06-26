/* eslint-disable max-lines -- TODO следующим этапом, подумать, как устранить */

import {
    DEEP_LINK_PATTERN,
    PREVIOUS_NATIVE_NAVIGATION_AND_TITLE_STATE_STORAGE_KEY,
} from './constants';
import { type Mediator } from './mediator';
import {
    type HistoryPushStateParams,
    type PreviousNativeNavigationAndTitleState,
    type SyncPurpose,
} from './types';

/**
 * Класс, отвечающий за взаимодействие WA с компонентами NA —
 * заголовком, кнопкой «назад» и т.п.
 */
export class NativeNavigationAndTitle {
    private nativeHistoryStack: string[] = [''];

    private numOfBackSteps = 1;

    // Здесь сохраняются параметры, которые в последний раз были отправлены
    // в NA. Помогает предотвратить повторную отправку одинаковых параметров.
    private lastSetPageSettingsParams = '';

    constructor(
        private mediator: Mediator,
        pageId: number | null,
        initialNativeTitle = '',
    ) {
        this.handleBack = this.handleBack.bind(this);
        const previousState = !!sessionStorage.getItem(
            PREVIOUS_NATIVE_NAVIGATION_AND_TITLE_STATE_STORAGE_KEY,
        );

        if (pageId) {
            this.supportSharedSession(pageId, initialNativeTitle);
        } else if (previousState) {
            this.restorePreviousState();
        } else {
            this.setInitialView(initialNativeTitle);
        }
    }

    /**
     * Делает один шаг назад по браузерной истории и модифицирует внутреннее состояние,
     * чтобы в дальнейшем зарегистрировать этот переход в NA.
     *
     * Метод автоматически закрывает WV, если отсутствуют записи в браузерной истории.
     */
    goBack() {
        this.goBackAFewSteps(-1, true);
    }

    /**
     * Делает несколько шагов назад по браузерной истории и модифицирует внутреннее состояние,
     * чтобы в дальнейшем зарегистрировать этот переход в NA.
     *
     * @param stepsNumber Количество шагов назад.
     *  Возможно передача как положительного, так и отрицательного числа. `0` будет проигнорирован.
     * @param autoCloseWebview Флаг — закрывать ли WV автоматически,
     * если переданное кол-во шагов будет больше, чем записей в истории.
     */
    goBackAFewSteps(stepsNumber: number, autoCloseWebview = false) {
        if (!stepsNumber) {
            return;
        }

        const stepsToBack = Math.abs(stepsNumber);
        const maxStepsToBack = this.nativeHistoryStack.length - 1;

        if (stepsToBack > maxStepsToBack) {
            if (autoCloseWebview) {
                this.mediator.closeWebview();

                return;
            }

            this.numOfBackSteps = maxStepsToBack;
        } else {
            this.numOfBackSteps = stepsToBack;
        }

        const steps = -this.numOfBackSteps;

        if (this.mediator.browserHistoryAbstractions) {
            this.mediator.browserHistoryAbstractions?.go(steps);
        } else {
            window.history.go(steps);
        }
    }

    /**
     * Вызывает метод `push` параметра `browserHistoryAbstractions`, если такой был передан в конструктор или
     * вызывает `History: pushState()` <https://developer.mozilla.org/en-US/docs/Web/API/History/pushState>.
     * И регистрирует этот переход в NA.
     *
     * @param url URL для перехода внутри WA.
     * @param historyState <https://developer.mozilla.org/en-US/docs/Web/API/History/state> для новой записи в истории.
     * @param nativeTitle Заголовок, который нужно отрисовать в NA.
     */
    navigate(url?: HistoryPushStateParams[2], state?: HistoryPushStateParams[0], nativeTitle = '') {
        if (this.mediator.browserHistoryAbstractions) {
            this.mediator.browserHistoryAbstractions?.push(url, state);
        } else {
            window.history.pushState(state, '', url);
        }

        this.nativeHistoryStack.push(nativeTitle);
        this.syncHistoryWithNative(nativeTitle, 'navigation');
    }

    /**
     * Информирует NA, что веб находится на первом экране
     * (сбрасывает историю переходов там, не влияя на браузерную историю),
     * а значит следующее нажатие на кнопку "Назад" в NA закроет WV.
     *
     * @param nativeTitle Заголовок, который нужно отрисовать в NA.
     */
    setInitialView(nativeTitle = '') {
        this.nativeHistoryStack = [nativeTitle];
        this.syncHistoryWithNative(nativeTitle, 'initialization');

        this.reassignPopstateListener();
    }

    /**
     * Метод для смены заголовка в NA без влияния на историю переходов.
     *
     * @param nativeTitle Заголовок, который нужно отрисовать в NA.
     */
    setTitle(nativeTitle: string) {
        this.nativeHistoryStack[this.nativeHistoryStack.length - 1] = nativeTitle;
        this.syncHistoryWithNative(nativeTitle, 'title-replacing');
    }

    /**
     * Метод для открытия второго web приложения в рамках одной вебвью сессии.
     * Сохраняет все текущее состояние текущего экземпляра bridgeToAm и AmNavigationAndTitle в sessionStorage, а
     * так же наполняет url необходимыми query параметрами. Работает только в Android окружении.
     * В IOS окружении будет открыто новое webview поверх текущего.
     *
     * @param url адрес второго web приложения, к которому перед переходом на него будут добавлены
     * все initial query параметры от натива и параметр nextPageId (Android)
     */
    navigateInsideASharedSession(url: string) {
        if (this.mediator.environment === 'ios') {
            const nativeDeeplink = `/webFeature?type=recommendation&url=${encodeURIComponent(url)}`;

            this.handleNativeDeeplink(nativeDeeplink);

            return;
        }

        // В b2n этот метод отмечен модификатором доступа private, но тут его нужно вызвать
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.b2n.saveCurrentState();

        window.location.assign(this.prepareExternalLinkBeforeOpen(url));
    }

    /**
     * Вызывает обработчик диплинков NA для обработки переданного диплинка.
     *
     * Если диплинк приводит к открытию нового экрана, он открывается «поверх» текущего WV.
     * При выходе из нового экрана, пользователь возвращается обратно в WV.
     * ВАЖНО!
     * В NA на Android до версии `12.30.0` текущее WV закрывается при открытии новго экрана,
     * поэтому в закрытое WV невозможно вернуться back-навигацией.
     *
     * @param deeplink Диплинк для передачи на обработку нативному приложению.
     * @param closeWebviewBeforeCallNativeDeeplinkHandler Флаг принудительного закрытия текущего WV перед открытием нового экрана.
     *  Применимо для всех версий на iOS и в новых версиях на Android (>=12.30.0), в более старых WV закрывается всегда автоматически.
     */
    handleNativeDeeplink(deeplink: string, closeWebviewBeforeCallNativeDeeplinkHandler = false) {
        const clearedDeeplinkPath = deeplink.replace(DEEP_LINK_PATTERN, '');

        if (
            closeWebviewBeforeCallNativeDeeplinkHandler &&
            this.mediator.canUseNativeFeature('savedBackStack')
        ) {
            this.mediator.closeWebview();

            setTimeout(
                () => window.location.replace(`${this.mediator.appId}://${clearedDeeplinkPath}`),
                0,
            );

            return;
        }

        window.location.replace(`${this.mediator.appId}://${clearedDeeplinkPath}`);
    }

    /**
     * Метод для сохранения текущего состояния NativeNavigationAndTitle в sessionStorage.
     */
    private saveCurrentState() {
        const currentState: PreviousNativeNavigationAndTitleState = {
            title: this.nativeHistoryStack[this.nativeHistoryStack.length - 1],
            nativeHistoryStack: this.nativeHistoryStack,
        };

        sessionStorage.setItem(
            PREVIOUS_NATIVE_NAVIGATION_AND_TITLE_STATE_STORAGE_KEY,
            JSON.stringify(currentState),
        );
    }

    /**
     * Метод, вычисляющий `pageId`, который нужно послать в приложение
     * для правильной синхронизации с нативной-кнопкой "Назад".
     *
     * @param purpose Цель взаимодействия с приложением.
     * @returns Правильный pageId.
     */
    private getNativePageId(purpose: SyncPurpose) {
        function assertUnreachable(val: never): never {
            throw new Error(`Unexpected value "${val}"`);
        }

        let pageId: number | null;

        switch (purpose) {
            case 'initialization':
                pageId = this.getNativePageIdForInitialization();
                break;

            case 'navigation':
                pageId = this.getNativePageIdForNavigation();
                break;

            case 'title-replacing':
                pageId = this.getNativePageIdForTitleReplacing();
                break;

            default:
                assertUnreachable(purpose);
        }

        return pageId;
    }

    /**
     * Вспомогательный метод для `getNativePageId` initialization кейса.
     *
     * @returns Правильный pageId.
     */
    private getNativePageIdForInitialization() {
        // * В iOS для "первой" страницы не нужно слать `pageId`.
        // * В Android важно, чтобы `pageId` "первой" страницы
        //  всегда был одинаковый.
        return this.mediator.environment === 'ios' ? null : 1;
    }

    /**
     * Вспомогательный метод для `getNativePageId` navigation кейса.
     *
     * @returns Правильный pageId.
     */
    private getNativePageIdForNavigation() {
        const stackSize = this.nativeHistoryStack.length;

        // Нажимая на кнопку назад, можно дойти до "первой" страницы,
        // в iOS для "первой" страницы не нужно слать `pageId`.
        return this.mediator.environment === 'ios' && stackSize <= 1 ? null : stackSize;
    }

    /**
     * Вспомогательный метод для `getNativePageId` only-title кейса.
     *
     * @returns Правильный pageId.
     */
    private getNativePageIdForTitleReplacing() {
        const stackSize = this.nativeHistoryStack.length;

        if (this.mediator.environment === 'android') {
            // Для смены заголовка в Андроид просто повторяем текущий `pageId`.
            // В отличии от iOS, если не послать `pageId` первой страницы,
            // Вебвью не будет закрываться по клику на нативный «Назад».
            return stackSize <= 1 ? 1 : stackSize;
        }

        // Если в iOS не послать `pageId`, следующее нажатие на
        // нативную кнопку назад закроет webview.
        return stackSize <= 1 ? null : stackSize;
    }

    /**
     * Обработчик для `window.onpopstate` события. Который сработает
     * после нажатия на кнопку "Назад" в нативе, вызова `history.back()` и `history.go(-x)`.
     */
    private handleBack() {
        const previousState = !!sessionStorage.getItem(
            PREVIOUS_NATIVE_NAVIGATION_AND_TITLE_STATE_STORAGE_KEY,
        );

        if (previousState) {
            this.mediator.restorePreviousState();
        }

        this.nativeHistoryStack = this.nativeHistoryStack.slice(0, -this.numOfBackSteps);
        this.numOfBackSteps = 1;

        if (this.nativeHistoryStack.length < 1) {
            this.mediator.closeWebview();

            return;
        }

        const pageTitle = this.nativeHistoryStack[this.nativeHistoryStack.length - 1];

        this.syncHistoryWithNative(pageTitle, 'navigation');
    }

    /**
     * Синхронизирует состояние истории переходов и заголовок с приложением.
     *
     * @param pageTitle Заголовок, который нужно отрисовать в приложении.
     * @param purpose Цель взаимодействия с приложением.
     */
    private syncHistoryWithNative(pageTitle: string, purpose: SyncPurpose) {
        const pageId = this.getNativePageId(purpose);

        if (this.mediator.environment === 'android') {
            const pageSettingsObj: { pageTitle: string; pageId?: number } = { pageTitle };

            if (pageId) {
                pageSettingsObj.pageId = pageId;
            }

            const paramsToSend = JSON.stringify(pageSettingsObj);

            if (this.lastSetPageSettingsParams !== paramsToSend) {
                this.mediator.AndroidBridge?.setPageSettings(paramsToSend);
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

    /**
     * Метод для перехода в веб из другого веб приложения в рамках
     * одной вебвью сессии
     * @param pageId - Номер текущего page который нужно отправить в приложение
     * @param title - Title текущего page который нужно отправить в приложение
     */
    private supportSharedSession(pageId: number, title: string) {
        this.nativeHistoryStack = new Array(pageId).fill('');

        this.syncHistoryWithNative(title, 'title-replacing');
        this.reassignPopstateListener();
    }

    /**
     * Восстанавливает свое предыдущее состояние nativeHistoryStack и title из sessionStorage
     */
    private restorePreviousState() {
        const previousState: PreviousNativeNavigationAndTitleState = JSON.parse(
            sessionStorage.getItem(PREVIOUS_NATIVE_NAVIGATION_AND_TITLE_STATE_STORAGE_KEY) || '',
        );

        this.nativeHistoryStack = previousState.nativeHistoryStack;
        this.syncHistoryWithNative(previousState.title, 'title-replacing');
        this.reassignPopstateListener();

        sessionStorage.removeItem(PREVIOUS_NATIVE_NAVIGATION_AND_TITLE_STATE_STORAGE_KEY);
    }

    /**
     *  Вспомогательный метод для setInitialView, supportSharedSession
     *  переназначает обработчик @handleBack для `window.onpopstate` события
     */
    private reassignPopstateListener() {
        window.removeEventListener('popstate', this.handleBack);
        window.addEventListener('popstate', this.handleBack);
    }

    /**
     * Вспомогательный метод для navigateInsideASharedSession.
     * Подготавливает внешнюю ссылку в рамках контракта для совместной работы веб-приложений в
     * рамках одной вебвью сессии
     * @param url - url иного веб приложения
     * @return подготовленная согласно контракту ссылка на иное веб приложение с initial query
     * параметрами от натива, а так же nextPageId.
     */
    private prepareExternalLinkBeforeOpen(url: string) {
        const currentPageId = this.nativeHistoryStack.length;

        const divider = new URL(url).searchParams.toString() ? '&' : '?';

        const link = new URL(`${url}${divider}${this.mediator.originalWebviewParams}`);

        link.searchParams.set('nextPageId', (currentPageId + 1).toString());

        return link.toString();
    }
}
